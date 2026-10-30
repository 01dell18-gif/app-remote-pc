import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditController {
  public static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const logs = await prisma.auditTrail.findMany({
        take: limit,
        orderBy: { executedAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, fullName: true, role: true },
          },
          workstation: {
            select: { id: true, hostname: true, ipAddress: true },
          },
        },
      });

      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengambil riwayat jejak audit' });
    }
  }
}
