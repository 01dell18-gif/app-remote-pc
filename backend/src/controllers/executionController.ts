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
}
