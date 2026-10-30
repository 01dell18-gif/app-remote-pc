import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CryptoService, RemoteConnectionPayload } from '../services/cryptoService';
import { AuditService } from '../services/auditService';

const prisma = new PrismaClient();

export class RemoteController {
  /**
   * Menghasilkan token terenkripsi AES-256 berumur 60 detik untuk membuka sesi WebSocket
   */
  public static async generateToken(req: Request, res: Response): Promise<void> {
    try {
      const { workstationId } = req.body;

      if (!workstationId) {
        res.status(400).json({ success: false, message: 'Parameter workstationId wajib diisi' });
        return;
      }

      const id = parseInt(workstationId, 10);
      const workstation = await prisma.workstation.findUnique({
        where: { id },
        include: { laboratory: true },
      });

      if (!workstation) {
        res.status(404).json({ success: false, message: 'Workstation tidak ditemukan' });
        return;
      }

      const connectionType = workstation.connectionMode === 'VNC' ? 'vnc' : 'rdp';
      const defaultPort = workstation.connectionMode === 'VNC' ? 5900 : 3389;

      // Bentuk payload token sesuai PRD Bagian 7.1
      const payload: RemoteConnectionPayload = {
        connection: {
          type: connectionType,
          settings: {
            hostname: workstation.ipAddress,
            port: defaultPort,
            security: 'nla',
            'ignore-cert': true,
            username: 'lab_student',
            password: 'EncryptedPasswordOrKey',
            width: 1920,
            height: 1080,
            dpi: 96,
            'resize-method': 'display-update',
            workstationId: workstation.id,
            hostnameTarget: workstation.hostname,
          },
        },
        expires: Date.now() + 60 * 1000, // Ephemeral 60 detik
      };

      const token = CryptoService.encryptToken(payload);

      // Tandai status IN_SESSION jika tadinya ONLINE
      if (workstation.powerStatus === 'ONLINE') {
        await prisma.workstation.update({
          where: { id: workstation.id },
          data: { powerStatus: 'IN_SESSION' },
        });
      }

      if (req.user) {
        await AuditService.log(
          req.user.id,
          'INIT_REMOTE_SESSION',
          'SUCCESS',
          workstation.id,
          { mode: workstation.connectionMode, hostname: workstation.hostname }
        );
      }

      res.json({
        success: true,
        token,
        expiresInSeconds: 60,
        workstation: {
          id: workstation.id,
          hostname: workstation.hostname,
          ipAddress: workstation.ipAddress,
          connectionMode: workstation.connectionMode,
          osFamily: workstation.osFamily,
        },
      });
    } catch (err: any) {
      console.error('[RemoteController] Galat generate token:', err);
      res.status(500).json({ success: false, message: 'Gagal membuat token remote desktop' });
    }
  }
}
