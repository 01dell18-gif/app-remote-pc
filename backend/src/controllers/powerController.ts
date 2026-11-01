import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { WolService } from '../services/wolService';
import { AuditService } from '../services/auditService';

const prisma = new PrismaClient();

export class PowerController {
  /**
   * Mengirim sinyal Wake-on-LAN ke satu atau banyak workstation
   */
  public static async wakeOnLan(req: Request, res: Response): Promise<void> {
    try {
      const { workstationIds } = req.body;

      if (!workstationIds || !Array.isArray(workstationIds) || workstationIds.length === 0) {
        res.status(400).json({ success: false, message: 'Daftar workstationIds wajib diberikan (array)' });
        return;
      }

      const workstations = await prisma.workstation.findMany({
        where: { id: { in: workstationIds.map((id: any) => parseInt(id, 10)) } },
        include: { laboratory: true },
      });

      if (workstations.length === 0) {
        res.status(404).json({ success: false, message: 'Tidak ada workstation yang cocok ditemukan' });
        return;
      }

      const results = [];
      for (const ws of workstations) {
        // Gunakan subnet broadcast lab atau hitung otomatis dari IP PC
        const subnetCalculated = WolService.calculateBroadcast(ws.ipAddress);
        const broadcast = ws.laboratory?.subnetBroadcast || subnetCalculated;

        const resSend = await WolService.sendPacket(ws.macAddress, broadcast);
        // Kirim juga ke subnet calculated jika berbeda
        if (subnetCalculated !== broadcast) {
          WolService.sendPacket(ws.macAddress, subnetCalculated).catch(() => {});
        }

        if (req.user) {
          await AuditService.log(
            req.user.id,
            'WAKE_ON_LAN',
            resSend.success ? 'SUCCESS' : 'FAILED',
            ws.id,
            { mac: ws.macAddress, broadcast, message: resSend.message }
          );
        }

        results.push({
          id: ws.id,
          hostname: ws.hostname,
          ...resSend,
        });
      }

      res.json({
        success: true,
        message: `Sinyal Wake-on-LAN berhasil dipancarkan ke ${results.length} unit komputer`,
        results,
      });
    } catch (err: any) {
      console.error('[PowerController] Galat WoL:', err);
      res.status(500).json({ success: false, message: err.message || 'Gagal mengeksekusi Wake-on-LAN' });
    }
  }

  /**
   * Eksekusi pematian sistem operasi jarak jauh (graceful shutdown)
   */
  public static async shutdown(req: Request, res: Response): Promise<void> {
    try {
      const { workstationIds, force } = req.body;

      if (!workstationIds || !Array.isArray(workstationIds) || workstationIds.length === 0) {
        res.status(400).json({ success: false, message: 'Daftar workstationIds wajib diisi' });
        return;
      }

      const workstations = await prisma.workstation.findMany({
        where: { id: { in: workstationIds.map((id: any) => parseInt(id, 10)) } },
      });

      for (const ws of workstations) {
        // Eksekusi remote shutdown Windows via RPC jika Windows
        if (ws.osFamily === 'WINDOWS') {
          const forceFlag = force ? '/f' : '';
          exec(`shutdown /m \\\\${ws.ipAddress} /s /t 15 ${forceFlag} /c "Dimatikan oleh Instruktur via FYJ Remote"`, { windowsHide: true }, (err) => {
            if (err) console.warn(`[PowerController] Perintah shutdown ke ${ws.ipAddress} dilaporkan:`, err.message);
          });
        }

        await prisma.workstation.update({
          where: { id: ws.id },
          data: { powerStatus: 'OFFLINE' },
        });

        if (req.user) {
          await AuditService.log(
            req.user.id,
            'REMOTE_SHUTDOWN',
            'SUCCESS',
            ws.id,
            { hostname: ws.hostname, force: !!force }
          );
        }
      }

      res.json({
        success: true,
        message: `Instruksi pematian sistem (shutdown) dikirim ke ${workstations.length} komputer`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengeksekusi shutdown' });
    }
  }

  /**
   * Eksekusi mulai ulang sistem operasi jarak jauh (reboot)
   */
  public static async reboot(req: Request, res: Response): Promise<void> {
    try {
      const { workstationIds } = req.body;

      if (!workstationIds || !Array.isArray(workstationIds) || workstationIds.length === 0) {
        res.status(400).json({ success: false, message: 'Daftar workstationIds wajib diisi' });
        return;
      }

      const workstations = await prisma.workstation.findMany({
        where: { id: { in: workstationIds.map((id: any) => parseInt(id, 10)) } },
      });

      for (const ws of workstations) {
        if (ws.osFamily === 'WINDOWS') {
          exec(`shutdown /m \\\\${ws.ipAddress} /r /t 10 /f /c "Mulai ulang oleh Instruktur via FYJ Remote"`, { windowsHide: true }, (err) => {
            if (err) console.warn(`[PowerController] Perintah reboot ke ${ws.ipAddress} dilaporkan:`, err.message);
          });
        }

        await prisma.workstation.update({
          where: { id: ws.id },
          data: { powerStatus: 'ONLINE', lastHeartbeat: new Date() },
        });

        if (req.user) {
          await AuditService.log(
            req.user.id,
            'REMOTE_REBOOT',
            'SUCCESS',
            ws.id,
            { hostname: ws.hostname }
          );
        }
      }

      res.json({
        success: true,
        message: `Instruksi reboot dikirim ke ${workstations.length} komputer`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengeksekusi reboot' });
    }
  }
}
