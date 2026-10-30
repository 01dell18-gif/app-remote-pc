import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/auditService';

const prisma = new PrismaClient();

export class WorkstationController {
  public static async createWorkstation(req: Request, res: Response): Promise<void> {
    try {
      const { labId, hostname, ipAddress, macAddress, gridRow, gridColumn, osFamily, connectionMode } = req.body;

      if (!labId || !hostname || !ipAddress || !macAddress) {
        res.status(400).json({
          success: false,
          message: 'Parameter labId, hostname, ipAddress, dan macAddress wajib diisi',
        });
        return;
      }

      // Format dan validasi MAC
      const normalizedMac = macAddress.trim().toUpperCase();
      const normalizedIp = ipAddress.trim();

      // Cek duplikasi IP
      const existingIp = await prisma.workstation.findFirst({
        where: { ipAddress: normalizedIp },
      });
      if (existingIp) {
        res.status(409).json({
          success: false,
          message: `Konflik Jaringan: Alamat IP '${normalizedIp}' telah digunakan oleh '${existingIp.hostname}'`,
        });
        return;
      }

      // Cek duplikasi MAC
      const existingMac = await prisma.workstation.findUnique({
        where: { macAddress: normalizedMac },
      });
      if (existingMac) {
        res.status(409).json({
          success: false,
          message: `Konflik Fisik: Alamat MAC '${normalizedMac}' telah terdaftar pada '${existingMac.hostname}'`,
        });
        return;
      }

      const workstation = await prisma.workstation.create({
        data: {
          labId: parseInt(labId, 10),
          hostname: hostname.trim(),
          ipAddress: normalizedIp,
          macAddress: normalizedMac,
          gridRow: gridRow ? parseInt(gridRow, 10) : 1,
          gridColumn: gridColumn ? parseInt(gridColumn, 10) : 1,
          osFamily: osFamily || 'WINDOWS',
          connectionMode: connectionMode || 'RDP_SHADOW',
          powerStatus: 'OFFLINE',
        },
      });

      if (req.user) {
        await AuditService.log(
          req.user.id,
          'CREATE_WORKSTATION',
          'SUCCESS',
          workstation.id,
          { hostname: workstation.hostname, ip: workstation.ipAddress, mac: workstation.macAddress }
        );
      }

      res.status(201).json({ success: true, workstation });
    } catch (err: any) {
      console.error('[WorkstationController] Galat create:', err);
      res.status(500).json({ success: false, message: err.message || 'Gagal mendaftarkan workstation' });
    }
  }

  public static async updateWorkstation(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { labId, hostname, ipAddress, macAddress, gridRow, gridColumn, osFamily, connectionMode, powerStatus } = req.body;

      const existing = await prisma.workstation.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Workstation tidak ditemukan' });
        return;
      }

      if (ipAddress && ipAddress !== existing.ipAddress) {
        const dupIp = await prisma.workstation.findFirst({
          where: { ipAddress: ipAddress.trim(), NOT: { id } },
        });
        if (dupIp) {
          res.status(409).json({ success: false, message: `Alamat IP '${ipAddress}' sudah dipakai perangkat lain` });
          return;
        }
      }

      if (macAddress && macAddress.toUpperCase() !== existing.macAddress) {
        const dupMac = await prisma.workstation.findUnique({
          where: { macAddress: macAddress.trim().toUpperCase() },
        });
        if (dupMac && dupMac.id !== id) {
          res.status(409).json({ success: false, message: `Alamat MAC '${macAddress}' sudah dipakai perangkat lain` });
          return;
        }
      }

      const updated = await prisma.workstation.update({
        where: { id },
        data: {
          ...(labId && { labId: parseInt(labId, 10) }),
          ...(hostname && { hostname: hostname.trim() }),
          ...(ipAddress && { ipAddress: ipAddress.trim() }),
          ...(macAddress && { macAddress: macAddress.trim().toUpperCase() }),
          ...(gridRow !== undefined && { gridRow: parseInt(gridRow, 10) }),
          ...(gridColumn !== undefined && { gridColumn: parseInt(gridColumn, 10) }),
          ...(osFamily && { osFamily }),
          ...(connectionMode && { connectionMode }),
          ...(powerStatus && { powerStatus }),
        },
      });

      if (req.user) {
        await AuditService.log(req.user.id, 'UPDATE_WORKSTATION', 'SUCCESS', id, req.body);
      }

      res.json({ success: true, workstation: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui data workstation' });
    }
  }

  public static async deleteWorkstation(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await prisma.workstation.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Workstation tidak ditemukan' });
        return;
      }

      await prisma.workstation.delete({ where: { id } });

      if (req.user) {
        await AuditService.log(req.user.id, 'DELETE_WORKSTATION', 'SUCCESS', id, {
          hostname: existing.hostname,
        });
      }

      res.json({ success: true, message: `Workstation ${existing.hostname} berhasil dihapus` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal menghapus workstation' });
    }
  }
}
