import net from 'net';
import { exec } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

export interface WorkstationDiagnostics {
  pingSuccess: boolean;
  portOpen: boolean;
  latencyMs: number | null;
  lastCheck: string;
  message: string;
}

export class HeartbeatService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static diagnosticsMap: Map<number, WorkstationDiagnostics> = new Map();

  /**
   * Menguji apakah host merespons ICMP ping via sistem operasi
   */
  public static pingHost(ip: string, timeoutMs: number = 800): Promise<{ reachable: boolean; latencyMs: number | null }> {
    return new Promise((resolve) => {
      // Loopback / localhost selalu reachable
      if (ip === '127.0.0.1' || ip === 'localhost') {
        return resolve({ reachable: true, latencyMs: 1 });
      }

      const cmd = process.platform === 'win32'
        ? `ping -n 1 -w ${timeoutMs} ${ip}`
        : `ping -c 1 -W 1 ${ip}`;

      exec(cmd, { windowsHide: true }, (err, stdout) => {
        if (err || !stdout) {
          return resolve({ reachable: false, latencyMs: null });
        }

        const isOk = stdout.includes('TTL=') || stdout.includes('ttl=');
        if (isOk) {
          const match = stdout.match(/time[<=]([0-9]+)ms/i);
          const latency = match ? parseInt(match[1], 10) : 1;
          resolve({ reachable: true, latencyMs: latency });
        } else {
          resolve({ reachable: false, latencyMs: null });
        }
      });
    });
  }

  /**
   * Menguji apakah port target (RDP 3389 / VNC 5900 / custom) merespons koneksi TCP
   */
  public static probeHost(ip: string, port: number = 3389, timeout: number = 1000): Promise<{ open: boolean; latencyMs: number | null }> {
    const start = Date.now();
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ open: true, latencyMs: latency });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ open: false, latencyMs: null });
      });

      socket.on('error', () => {
        socket.destroy();
        resolve({ open: false, latencyMs: null });
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Melakukan diagnosis lengkap pada sebuah workstation secara real-time
   */
  public static async diagnoseWorkstation(workstationId: number): Promise<WorkstationDiagnostics> {
    const ws = await prisma.workstation.findUnique({ where: { id: workstationId } });
    if (!ws) {
      return {
        pingSuccess: false,
        portOpen: false,
        latencyMs: null,
        lastCheck: new Date().toISOString(),
        message: 'Workstation tidak ditemukan di basis data.',
      };
    }

    const port = ws.connectionMode === 'VNC' ? 5900 : 3389;

    // 1. Uji ping ICMP
    const pingRes = await this.pingHost(ws.ipAddress);

    // 2. Uji port TCP
    const portRes = await this.probeHost(ws.ipAddress, port);

    const isPingOk = pingRes.reachable;
    const isPortOk = portRes.open;
    const latency = portRes.latencyMs || pingRes.latencyMs;

    let message = '';
    let newStatus: 'ONLINE' | 'OFFLINE' | 'IN_SESSION' = 'OFFLINE';

    if (isPortOk) {
      newStatus = ws.powerStatus === 'IN_SESSION' ? 'IN_SESSION' : 'ONLINE';
      message = `Perangkat ONLINE. Port ${port} (${ws.connectionMode}) terbuka & siap dikendalikan (${latency} ms).`;
    } else if (isPingOk) {
      newStatus = 'ONLINE';
      message = `Komputer aktif (merespons Ping ${latency} ms), namun port ${port} tertutup atau diblokir Firewall. Aktifkan Remote Desktop di Windows.`;
    } else {
      newStatus = 'OFFLINE';
      message = `Host tidak terjangkau (Destination Unreachable). Komputer kemungkinan sedang mati, sleep, atau berada di luar jaringan.`;
    }

    const diag: WorkstationDiagnostics = {
      pingSuccess: isPingOk,
      portOpen: isPortOk,
      latencyMs: latency,
      lastCheck: new Date().toISOString(),
      message,
    };

    this.diagnosticsMap.set(ws.id, diag);

    // Perbarui status di basis data
    await prisma.workstation.update({
      where: { id: ws.id },
      data: {
        powerStatus: newStatus,
        lastHeartbeat: isPingOk || isPortOk ? new Date() : ws.lastHeartbeat,
      },
    });

    return diag;
  }

  public static getDiagnostics(workstationId: number): WorkstationDiagnostics | undefined {
    return this.diagnosticsMap.get(workstationId);
  }

  /**
   * Menjalankan siklus pemeriksaan ketersediaan untuk seluruh workstation secara berkala
   */
  public static async checkAllWorkstations(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const workstations = await prisma.workstation.findMany();

      for (const ws of workstations) {
        // Lakukan diagnosis real
        await this.diagnoseWorkstation(ws.id);
      }
    } catch (err) {
      console.error('[HeartbeatService] Galat siklus pemeriksaan:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Memulai timer polling otomatis
   */
  public static start(): void {
    if (this.timer) return;
    console.log(`[HeartbeatService] Memulai background heartbeat checker real-time (interval: ${config.heartbeatIntervalMs}ms)...`);
    // Jalankan pemeriksaan awal
    this.checkAllWorkstations();
    this.timer = setInterval(() => {
      this.checkAllWorkstations();
    }, config.heartbeatIntervalMs);
  }

  /**
   * Menghentikan background polling
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
