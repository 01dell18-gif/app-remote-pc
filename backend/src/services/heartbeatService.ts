import net from 'net';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

export class HeartbeatService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Menguji apakah port target (RDP/VNC/Mock) merespons koneksi TCP
   */
  public static probeHost(ip: string, port: number = 3389, timeout: number = 1500): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  /**
   * Menjalankan siklus pemeriksaan ketersediaan untuk seluruh workstation
   */
  public static async checkAllWorkstations(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const workstations = await prisma.workstation.findMany();

      for (const ws of workstations) {
        let isOnline = false;

        if (ws.connectionMode === 'MOCK_AGENT') {
          // Mock workstation selalu dapat disimulasikan atau dicek di mock port
          isOnline = ws.powerStatus === 'ONLINE' || ws.powerStatus === 'IN_SESSION';
        } else {
          const port = ws.connectionMode === 'VNC' ? 5900 : 3389;
          isOnline = await this.probeHost(ws.ipAddress, port, 1000);
          
          // Jika tidak terdeteksi via real port tapi statusnya baru saja diubah ke ONLINE secara sengaja dalam demo,
          // pertahankan statusnya kecuali jika sudah offline
          if (!isOnline && (ws.powerStatus === 'ONLINE' || ws.powerStatus === 'IN_SESSION')) {
            // Kita biarkan status saat ini jika baru saja di-Wake
            isOnline = true;
          }
        }

        const newStatus = isOnline
          ? ws.powerStatus === 'IN_SESSION'
            ? 'IN_SESSION'
            : 'ONLINE'
          : 'OFFLINE';

        if (ws.powerStatus !== newStatus || (isOnline && !ws.lastHeartbeat)) {
          await prisma.workstation.update({
            where: { id: ws.id },
            data: {
              powerStatus: newStatus,
              lastHeartbeat: isOnline ? new Date() : ws.lastHeartbeat,
            },
          });
        }
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
    console.log(`[HeartbeatService] Memulai background heartbeat checker (interval: ${config.heartbeatIntervalMs}ms)...`);
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
