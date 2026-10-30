import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LabController {
  public static async getAllLabs(req: Request, res: Response): Promise<void> {
    try {
      const labs = await prisma.laboratory.findMany({
        include: {
          _count: {
            select: { workstations: true },
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

      res.json({
        success: true,
        lab: {
          id: lab.id,
          labName: lab.labName,
          subnetBroadcast: lab.subnetBroadcast,
          totalCapacity: lab.totalCapacity,
          createdAt: lab.createdAt,
        },
        workstations: lab.workstations,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data workstation lab' });
    }
  }

  public static async createLab(req: Request, res: Response): Promise<void> {
    try {
      const { labName, subnetBroadcast, totalCapacity } = req.body;
      if (!labName || !subnetBroadcast) {
        res.status(400).json({ success: false, message: 'Nama Lab dan Subnet Broadcast wajib diisi' });
        return;
      }

      const lab = await prisma.laboratory.create({
        data: {
          labName,
          subnetBroadcast,
          totalCapacity: totalCapacity ? parseInt(totalCapacity, 10) : 40,
        },
      });

      res.status(201).json({ success: true, lab });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Gagal menambahkan laboratorium' });
    }
  }
}
