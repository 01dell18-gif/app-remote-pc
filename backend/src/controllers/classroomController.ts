import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/auditService';

const prisma = new PrismaClient();

// Status status penguncian ruang lab (in-memory lock state)
const labLockState: Record<number, { isLocked: boolean; message: string; lockedAt: string }> = {};

export class ClassroomController {
  public static async lockClassroom(req: Request, res: Response): Promise<void> {
    try {
      const { labId, lock, message } = req.body;

      if (!labId) {
        res.status(400).json({ success: false, message: 'Parameter labId wajib diisi' });
        return;
      }

      const isLocked = lock !== false;
      const displayMsg = message || 'Layar Dikunci oleh Instruktur. Harap perhatikan penjelasan di depan.';

      labLockState[labId] = {
        isLocked,
        message: displayMsg,
        lockedAt: new Date().toISOString(),
      };

      if (req.user) {
        await AuditService.log(
          req.user.id,
          isLocked ? 'CLASSROOM_LOCK' : 'CLASSROOM_UNLOCK',
          'SUCCESS',
          null,
          { labId, message: displayMsg }
        );
      }

      res.json({
        success: true,
        message: isLocked
          ? `Seluruh workstation di Lab #${labId} telah dikunci`
          : `Kunci masukan Lab #${labId} telah dibuka`,
        lockState: labLockState[labId],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal mengatur status kunci kelas' });
    }
  }

  public static async getLockState(req: Request, res: Response): Promise<void> {
    try {
      const labId = parseInt(req.params.labId, 10);
      const state = labLockState[labId] || { isLocked: false, message: '', lockedAt: null };
      res.json({ success: true, state });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Gagal mengambil status kunci lab' });
    }
  }
}
