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

  /**
   * Ekspor data komputer lab ke format JSON/CSV
   */
  public static async exportWorkstations(req: Request, res: Response): Promise<void> {
    try {
      const labId = req.query.labId ? parseInt(req.query.labId as string, 10) : undefined;
      const filter = labId ? { labId } : {};

      const workstations = await prisma.workstation.findMany({
        where: filter,
        orderBy: [{ gridRow: 'asc' }, { gridColumn: 'asc' }],
        include: { laboratory: { select: { labName: true } } },
      });

      res.json({
        success: true,
        count: workstations.length,
        workstations,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengekspor data workstation: ' + err.message });
    }
  }

  /**
   * Impor massal data komputer dari CSV atau JSON
   */
  public static async importWorkstations(req: Request, res: Response): Promise<void> {
    try {
      const { labId, workstations, mode = 'upsert' } = req.body;

      if (!labId || !Array.isArray(workstations) || workstations.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Parameter labId dan daftar workstations (array) wajib diisi',
        });
        return;
      }

      const targetLabId = parseInt(labId, 10);
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < workstations.length; i++) {
        const item = workstations[i];
        const rowNum = i + 1;

        if (!item.hostname || !item.ipAddress || !item.macAddress) {
          errors.push(`Baris ${rowNum}: Hostname, IP Address, dan MAC Address wajib diisi.`);
          skippedCount++;
          continue;
        }

        const normalizedHostname = String(item.hostname).trim();
        const normalizedIp = String(item.ipAddress).trim();
        const normalizedMac = String(item.macAddress).trim().toUpperCase();
        const row = item.gridRow ? parseInt(item.gridRow, 10) : 1;
        const col = item.gridColumn ? parseInt(item.gridColumn, 10) : (createdCount + updatedCount + 1);
        const os = item.osFamily ? String(item.osFamily).toUpperCase() : 'WINDOWS';
        const conn = item.connectionMode || 'RDP_SHADOW';

        try {
          // Cari apakah sudah ada workstation dengan MAC Address yang sama
          const existing = await prisma.workstation.findUnique({
            where: { macAddress: normalizedMac },
          });

          if (existing) {
            if (mode === 'skip') {
              skippedCount++;
              continue;
            }

            // Update data komputer yang sudah ada
            await prisma.workstation.update({
              where: { id: existing.id },
              data: {
                labId: targetLabId,
                hostname: normalizedHostname,
                ipAddress: normalizedIp,
                gridRow: row,
                gridColumn: col,
                osFamily: os,
                connectionMode: conn,
              },
            });
            updatedCount++;
          } else {
            // Cek apakah ada konflik alamat IP dengan unit lain
            const existingIp = await prisma.workstation.findFirst({
              where: { ipAddress: normalizedIp },
            });
            if (existingIp) {
              errors.push(`Baris ${rowNum} (${normalizedHostname}): IP '${normalizedIp}' sudah digunakan oleh '${existingIp.hostname}'.`);
              skippedCount++;
              continue;
            }

            // Buat workstation baru
            await prisma.workstation.create({
              data: {
                labId: targetLabId,
                hostname: normalizedHostname,
                ipAddress: normalizedIp,
                macAddress: normalizedMac,
                gridRow: row,
                gridColumn: col,
                osFamily: os,
                connectionMode: conn,
                powerStatus: 'OFFLINE',
              },
            });
            createdCount++;
          }
        } catch (itemErr: any) {
          errors.push(`Baris ${rowNum} (${normalizedHostname}): ${itemErr.message}`);
          skippedCount++;
        }
      }

      if (req.user) {
        await AuditService.log(
          req.user.id,
          'IMPORT_WORKSTATIONS',
          'SUCCESS',
          targetLabId,
          { createdCount, updatedCount, skippedCount, totalProcessed: workstations.length }
        );
      }

      res.json({
        success: true,
        message: `Impor selesai: ${createdCount} baru ditambahkan, ${updatedCount} diperbarui, ${skippedCount} dilewati.`,
        createdCount,
        updatedCount,
        skippedCount,
        errors,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal memproses impor: ' + err.message });
    }
  }
}
