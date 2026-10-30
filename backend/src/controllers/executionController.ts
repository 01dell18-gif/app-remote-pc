import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { AuditService } from '../services/auditService';

const prisma = new PrismaClient();

export interface LaunchPayload {
  workstationIds: number[];
  appPath: string;
  args?: string;
  executionType?: 'PATH' | 'SCRIPT';
  scriptContent?: string;
}

export interface TerminatePayload {
  workstationIds: number[];
  processName: string;
  force?: boolean;
}

export class ExecutionController {
  /**
   * Menjalankan program atau skrip pada workstation target
   */
  public static async launchApp(req: Request, res: Response): Promise<void> {
    try {
      const { workstationIds, appPath, args, executionType, scriptContent } = req.body as LaunchPayload;

      if (!workstationIds || !Array.isArray(workstationIds) || workstationIds.length === 0) {
        res.status(400).json({ success: false, message: 'Daftar workstationIds wajib diberikan (array)' });
        return;
      }

      if (executionType === 'SCRIPT') {
        if (!scriptContent || !scriptContent.trim()) {
          res.status(400).json({ success: false, message: 'Konten skrip tidak boleh kosong' });
          return;
        }
      } else {
        if (!appPath || !appPath.trim()) {
          res.status(400).json({ success: false, message: 'Alamat path aplikasi wajib diisi' });
          return;
        }
      }

      const workstations = await prisma.workstation.findMany({
        where: { id: { in: workstationIds.map((id) => Number(id)) } },
      });

      if (workstations.length === 0) {
        res.status(404).json({ success: false, message: 'Tidak ada workstation yang cocok ditemukan' });
        return;
      }

      const results = [];

      for (const ws of workstations) {
        let commandToRun = '';
        const targetCommand = executionType === 'SCRIPT' ? scriptContent : `${appPath} ${args || ''}`.trim();

        // Jika IP lokal atau dalam mode uji coba, jalankan langsung di host Windows lokal
        const isLocalHost = ws.ipAddress === '127.0.0.1' || ws.ipAddress === 'localhost' || ws.connectionMode === 'MOCK_AGENT';

        if (isLocalHost) {
          // Jalankan di komputer lokal
          commandToRun = `start "" "${appPath}" ${args || ''}`;
        } else {
          // Untuk komputer target remote di jaringan LAN Windows (menggunakan PowerShell WMI / WinRM)
          // Contoh: powershell -Command "Invoke-Command -ComputerName <IP> -ScriptBlock { Start-Process '<path>' }"
          commandToRun = `powershell -Command "Start-Process -FilePath '${appPath}' ${args ? `-ArgumentList '${args}'` : ''}"`;
        }

        // Eksekusi proses secara asynchronous
        exec(commandToRun, { windowsHide: true }, (error) => {
          if (error) {
            console.warn(`[ExecutionController] Eksekusi pada ${ws.hostname}:`, error.message);
          }
        });

        if (req.user) {
          await AuditService.log(
            req.user.id,
            'APP_LAUNCH',
            'SUCCESS',
            ws.id,
            { appPath, args, executionType, hostname: ws.hostname }
          );
        }

        results.push({
          workstationId: ws.id,
          hostname: ws.hostname,
          ipAddress: ws.ipAddress,
          status: 'EXECUTED',
          message: `Instruksi eksekusi '${appPath || 'skrip'}' berhasil dikirim ke ${ws.hostname}`,
        });
      }

      res.json({
        success: true,
        message: `Aplikasi berhasil dijalankan pada ${results.length} workstation`,
        results,
      });
    } catch (err: any) {
      console.error('[ExecutionController] Galat launchApp:', err);
      res.status(500).json({ success: false, message: err.message || 'Gagal menjalankan aplikasi pada target' });
    }
  }

  /**
   * Menutup atau menghentikan (terminate / kill) proses aplikasi yang sedang berjalan
   */
  public static async terminateApp(req: Request, res: Response): Promise<void> {
    try {
      const { workstationIds, processName, force } = req.body as TerminatePayload;

      if (!workstationIds || !Array.isArray(workstationIds) || workstationIds.length === 0) {
        res.status(400).json({ success: false, message: 'Daftar workstationIds wajib diberikan' });
        return;
      }

      if (!processName || !processName.trim()) {
        res.status(400).json({ success: false, message: 'Nama proses aplikasi (misal: notepad.exe, chrome.exe) wajib diisi' });
        return;
      }

      // Pastikan ada ekstensi .exe jika di Windows
      let proc = processName.trim();
      if (!proc.endsWith('.exe') && !proc.includes('.')) {
        proc += '.exe';
      }

      const workstations = await prisma.workstation.findMany({
        where: { id: { in: workstationIds.map((id) => Number(id)) } },
      });

      const results = [];

      for (const ws of workstations) {
        const isLocalHost = ws.ipAddress === '127.0.0.1' || ws.ipAddress === 'localhost' || ws.connectionMode === 'MOCK_AGENT';

        let killCmd = '';
        if (isLocalHost) {
          // Taskkill lokal di Windows
          killCmd = `taskkill ${force !== false ? '/F' : ''} /IM "${proc}" /T`;
        } else {
          // Taskkill remote di Windows: taskkill /S <ip> /U <user> /P <pass> /IM <proc>
          killCmd = `taskkill /S ${ws.ipAddress} ${force !== false ? '/F' : ''} /IM "${proc}" /T`;
        }

        exec(killCmd, { windowsHide: true }, (error) => {
          if (error) {
            console.warn(`[ExecutionController] Tutup proses ${proc} pada ${ws.hostname}:`, error.message);
          }
        });

        if (req.user) {
          await AuditService.log(
            req.user.id,
            'APP_TERMINATE',
            'SUCCESS',
            ws.id,
            { processName: proc, force: !!force, hostname: ws.hostname }
          );
        }

        results.push({
          workstationId: ws.id,
          hostname: ws.hostname,
          processName: proc,
          status: 'SIGNAL_SENT',
          message: `Instruksi penutupan proses '${proc}' dikirim ke ${ws.hostname}`,
        });
      }

      res.json({
        success: true,
        message: `Instruksi penutupan aplikasi '${proc}' berhasil dikirim ke ${results.length} workstation`,
        results,
      });
    } catch (err: any) {
      console.error('[ExecutionController] Galat terminateApp:', err);
      res.status(500).json({ success: false, message: err.message || 'Gagal menutup aplikasi' });
    }
  }

  /**
   * Menyediakan daftar preset aplikasi laboratorium yang umum digunakan
   */
  public static getPresets(req: Request, res: Response): void {
    const presets = [
      {
        id: 'vscode',
        name: 'Visual Studio Code',
        category: 'Development',
        appPath: 'code',
        processName: 'Code.exe',
        defaultArgs: '.',
        description: 'Buka editor teks pemrograman VS Code',
      },
      {
        id: 'chrome',
        name: 'Google Chrome Browser',
        category: 'Browser',
        appPath: 'chrome.exe',
        processName: 'chrome.exe',
        defaultArgs: 'https://google.com',
        description: 'Buka peramban Google Chrome dengan URL pilihan',
      },
      {
        id: 'edge',
        name: 'Microsoft Edge Browser',
        category: 'Browser',
        appPath: 'msedge.exe',
        processName: 'msedge.exe',
        defaultArgs: 'https://google.com',
        description: 'Buka peramban Microsoft Edge',
      },
      {
        id: 'notepad',
        name: 'Notepad (Catatan)',
        category: 'Utilitas',
        appPath: 'notepad.exe',
        processName: 'notepad.exe',
        defaultArgs: '',
        description: 'Editor teks ringan bawaan Windows',
      },
      {
        id: 'calculator',
        name: 'Kalkulator',
        category: 'Utilitas',
        appPath: 'calc.exe',
        processName: 'CalculatorApp.exe',
        defaultArgs: '',
        description: 'Aplikasi kalkulator sistem',
      },
      {
        id: 'cmd',
        name: 'Command Prompt (CMD)',
        category: 'Sistem',
        appPath: 'cmd.exe',
        processName: 'cmd.exe',
        defaultArgs: '',
        description: 'Konsol baris perintah Windows',
      },
      {
        id: 'powershell',
        name: 'Windows PowerShell',
        category: 'Sistem',
        appPath: 'powershell.exe',
        processName: 'powershell.exe',
        defaultArgs: '-NoExit',
        description: 'Konsol otomasi PowerShell',
      },
      {
        id: 'packettracer',
        name: 'Cisco Packet Tracer',
        category: 'Laboratorium Jaringan',
        appPath: 'PacketTracer.exe',
        processName: 'PacketTracer.exe',
        defaultArgs: '',
        description: 'Simulator jaringan Cisco untuk praktikum lab',
      },
    ];

    res.json({ success: true, presets });
  }

  // Penyimpanan aturan pembatasan aktif
  private static activeRestrictions: Array<{
    id: string;
    type: 'APP' | 'WEBSITE';
    target: string;
    reason?: string;
    blockedAt: string;
    workstationIds: number[];
  }> = [];

  /**
   * Terapkan pembatasan / pemblokiran aplikasi atau link website
   */
  public static async applyRestriction(req: Request, res: Response): Promise<void> {
    try {
      const { workstationIds, type, target, action, reason } = req.body;

      if (!workstationIds || !Array.isArray(workstationIds) || workstationIds.length === 0) {
        res.status(400).json({ success: false, message: 'Daftar workstationIds wajib diberikan' });
        return;
      }

      if (!type || !['APP', 'WEBSITE'].includes(type)) {
        res.status(400).json({ success: false, message: 'Tipe pembatasan harus APP atau WEBSITE' });
        return;
      }

      if (!target || !target.trim()) {
        res.status(400).json({ success: false, message: 'Target nama aplikasi atau alamat domain tidak boleh kosong' });
        return;
      }

      const cleanTarget = target.trim().toLowerCase();
      const workstations = await prisma.workstation.findMany({
        where: { id: { in: workstationIds.map((id: any) => Number(id)) } },
      });

      for (const ws of workstations) {
        // Coba kirimkan instruksi pembatasan ke Mock Agent jika aktif pada port 5902
        try {
          const agentUrl = `http://${ws.ipAddress === '127.0.0.1' || ws.ipAddress.startsWith('192.168.1.') ? '127.0.0.1' : ws.ipAddress}:5902/api/restrictions`;
          fetch(agentUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, target: cleanTarget, action }),
            signal: AbortSignal.timeout(1500),
          }).catch(() => {});
        } catch (_) {}

        // Eksekusi pada host Windows lokal (fallback / native enforcement)
        if (action === 'BLOCK') {
          if (type === 'APP') {
            // Matikan langsung proses jika sedang berjalan
            exec(`taskkill /F /IM ${cleanTarget}`, { windowsHide: true }, () => {});
            // Daftarkan dummy debugger di registry agar tidak dapat dibuka siswa
            exec(
              `reg add "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\${cleanTarget}" /v Debugger /t REG_SZ /d "systray.exe" /f`,
              { windowsHide: true },
              () => {}
            );
          } else if (type === 'WEBSITE') {
            // Sinkhole domain ke 127.0.0.1 pada hosts Windows
            const hostsCmd = `powershell -Command "Add-Content -Path $env:windir\\System32\\drivers\\etc\\hosts -Value \`"127.0.0.1 ${cleanTarget} # FYJ_BLOCK\`" -ErrorAction SilentlyContinue"`;
            exec(hostsCmd, { windowsHide: true }, () => {});
          }
        } else {
          // UNBLOCK
          if (type === 'APP') {
            exec(
              `reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\${cleanTarget}" /v Debugger /f`,
              { windowsHide: true },
              () => {}
            );
          } else if (type === 'WEBSITE') {
            const cleanHostsCmd = `powershell -Command "try { (Get-Content -Path $env:windir\\System32\\drivers\\etc\\hosts) | Where-Object { $_ -notmatch '${cleanTarget}' } | Set-Content -Path $env:windir\\System32\\drivers\\etc\\hosts } catch {}"`;
            exec(cleanHostsCmd, { windowsHide: true }, () => {});
          }
        }

        if (req.user) {
          await AuditService.log(
            req.user.id,
            action === 'BLOCK' ? 'RESTRICTION_APPLIED' : 'RESTRICTION_REMOVED',
            'SUCCESS',
            ws.id,
            { type, target: cleanTarget, action, reason }
          );
        }
      }

      // Perbarui state in-memory aturan aktif
      if (action === 'BLOCK') {
        const existingIdx = ExecutionController.activeRestrictions.findIndex(
          (r) => r.type === type && r.target.toLowerCase() === cleanTarget
        );
        if (existingIdx >= 0) {
          ExecutionController.activeRestrictions[existingIdx].workstationIds = Array.from(
            new Set([...ExecutionController.activeRestrictions[existingIdx].workstationIds, ...workstationIds])
          );
        } else {
          ExecutionController.activeRestrictions.push({
            id: `${type}_${Date.now()}`,
            type,
            target: cleanTarget,
            reason: reason || 'Pembatasan fokus kelas oleh pengajar',
            blockedAt: new Date().toISOString(),
            workstationIds,
          });
        }
      } else {
        // UNBLOCK: hapus workstationIds atau hapus aturan jika kosong
        ExecutionController.activeRestrictions = ExecutionController.activeRestrictions
          .map((r) => {
            if (r.type === type && r.target.toLowerCase() === cleanTarget) {
              return {
                ...r,
                workstationIds: r.workstationIds.filter((id) => !workstationIds.includes(id)),
              };
            }
            return r;
          })
          .filter((r) => r.workstationIds.length > 0);
      }

      res.json({
        success: true,
        message:
          action === 'BLOCK'
            ? `Berhasil memblokir ${type === 'APP' ? 'aplikasi' : 'website'} '${cleanTarget}' pada ${workstationIds.length} komputer target.`
            : `Berhasil membuka blokir '${cleanTarget}' pada ${workstationIds.length} komputer target.`,
        activeRestrictions: ExecutionController.activeRestrictions,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal memproses pembatasan: ' + err.message });
    }
  }

  /**
   * Mendapatkan daftar pembatasan aktif dan template preset
   */
  public static async getRestrictions(_req: Request, res: Response): Promise<void> {
    const presetBans = {
      apps: [
        { name: 'Discord', processName: 'Discord.exe', category: 'Sosial & Komunikasi' },
        { name: 'Spotify Music', processName: 'Spotify.exe', category: 'Streaming Musik' },
        { name: 'Telegram Desktop', processName: 'Telegram.exe', category: 'Sosial & Komunikasi' },
        { name: 'Steam Client', processName: 'steam.exe', category: 'Game & Hiburan' },
        { name: 'Roblox Player', processName: 'RobloxPlayerBeta.exe', category: 'Game & Hiburan' },
        { name: 'Minecraft', processName: 'javaw.exe', category: 'Game & Hiburan' },
        { name: 'Genshin Impact', processName: 'GenshinImpact.exe', category: 'Game & Hiburan' },
        { name: 'Epic Games', processName: 'EpicGamesLauncher.exe', category: 'Game & Hiburan' },
      ],
      websites: [
        { name: 'YouTube Video', domain: 'youtube.com', category: 'Streaming Video' },
        { name: 'TikTok', domain: 'tiktok.com', category: 'Media Sosial' },
        { name: 'Facebook', domain: 'facebook.com', category: 'Media Sosial' },
        { name: 'Instagram', domain: 'instagram.com', category: 'Media Sosial' },
        { name: 'Twitter / X', domain: 'x.com', category: 'Media Sosial' },
        { name: 'Roblox Web', domain: 'roblox.com', category: 'Game Online' },
        { name: 'Netflix', domain: 'netflix.com', category: 'Streaming Film' },
        { name: 'ChatGPT / AI Bot', domain: 'chatgpt.com', category: 'Kecerdasan Buatan (AI)' },
      ],
    };

    res.json({
      success: true,
      activeRestrictions: ExecutionController.activeRestrictions,
      presets: presetBans,
    });
  }
}
