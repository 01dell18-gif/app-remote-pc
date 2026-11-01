import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HeartbeatService } from '../services/heartbeatService';

const prisma = new PrismaClient();

export class LabController {
  public static async getAllLabs(req: Request, res: Response): Promise<void> {
    try {
      const labs = await prisma.laboratory.findMany({
        include: {
          _count: {
            select: { workstations: true },
          },
          workstations: {
            orderBy: [{ gridRow: 'asc' }, { gridColumn: 'asc' }],
          },
        },
        orderBy: { id: 'asc' },
      });
      res.json({ success: true, labs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data laboratorium' });
    }
  }

  public static async getLabWorkstations(req: Request, res: Response): Promise<void> {
    try {
      const labId = parseInt(req.params.id, 10);
      if (isNaN(labId)) {
        res.status(400).json({ success: false, message: 'ID Laboratorium tidak valid' });
        return;
      }

      const lab = await prisma.laboratory.findUnique({
        where: { id: labId },
        include: {
          workstations: {
            orderBy: [{ gridRow: 'asc' }, { gridColumn: 'asc' }],
          },
        },
      });

      if (!lab) {
        res.status(404).json({ success: false, message: 'Laboratorium tidak ditemukan' });
        return;
      }

      // Gabungkan informasi diagnostik jaringan real-time
      const workstationsWithDiag = lab.workstations.map((ws) => ({
        ...ws,
        diagnostics: HeartbeatService.getDiagnostics(ws.id) || null,
      }));

      res.json({
        success: true,
        lab: {
          id: lab.id,
          labName: lab.labName,
          subnetBroadcast: lab.subnetBroadcast,
          totalCapacity: lab.totalCapacity,
          createdAt: lab.createdAt,
        },
        workstations: workstationsWithDiag,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data workstation lab' });
    }
  }

  public static async createLab(req: Request, res: Response): Promise<void> {
    try {
      const { labName, subnetBroadcast, totalCapacity } = req.body;
      if (!labName || !labName.trim()) {
        res.status(400).json({ success: false, message: 'Nama Ruang Lab wajib diisi' });
        return;
      }

      const lab = await prisma.laboratory.create({
        data: {
          labName: labName.trim(),
          subnetBroadcast: subnetBroadcast?.trim() || '255.255.255.255',
          totalCapacity: totalCapacity ? parseInt(totalCapacity, 10) : 40,
        },
      });

      res.status(201).json({ success: true, lab });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({ success: false, message: `Nama ruangan '${req.body.labName}' sudah terdaftar.` });
        return;
      }
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan laboratorium' });
    }
  }

  public static async updateLab(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { labName, subnetBroadcast, totalCapacity } = req.body;

      const existing = await prisma.laboratory.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Laboratorium tidak ditemukan' });
        return;
      }

      const updated = await prisma.laboratory.update({
        where: { id },
        data: {
          ...(labName && { labName }),
          ...(subnetBroadcast && { subnetBroadcast }),
          ...(totalCapacity !== undefined && { totalCapacity: parseInt(totalCapacity, 10) }),
        },
      });

      res.json({ success: true, lab: updated });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({ success: false, message: `Nama ruangan '${req.body.labName}' sudah digunakan oleh lab lain.` });
        return;
      }
      res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui laboratorium' });
    }
  }

  public static async deleteLab(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await prisma.laboratory.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Laboratorium tidak ditemukan' });
        return;
      }

      await prisma.laboratory.delete({ where: { id } });

      res.json({ success: true, message: `Laboratorium ${existing.labName} berhasil dihapus` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal menghapus laboratorium' });
    }
  }
}
