import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
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

  /**
   * Meluncurkan aplikasi Microsoft Remote Desktop (MSTSC) secara langsung di host Windows
   */
  public static async launchMstsc(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const workstation = await prisma.workstation.findUnique({ where: { id } });

      if (!workstation) {
        res.status(404).json({ success: false, message: 'Workstation tidak ditemukan' });
        return;
      }

      let cmd = `start mstsc.exe /v:${workstation.ipAddress}`;
      if (workstation.connectionMode === 'RDP_SHADOW') {
        cmd = `start mstsc.exe /v:${workstation.ipAddress} /shadow:1 /control /noConsentPrompt`;
      }

      exec(cmd, { windowsHide: false }, (err) => {
        if (err) {
          console.warn('[RemoteController] mstsc launch warn:', err.message);
        }
      });

      if (req.user) {
        await AuditService.log(
          req.user.id,
          'LAUNCH_NATIVE_RDP',
          'SUCCESS',
          workstation.id,
          { ip: workstation.ipAddress, hostname: workstation.hostname }
        );
      }

      res.json({
        success: true,
        message: `Remote Desktop Windows (MSTSC) berhasil dibuka untuk ${workstation.hostname} (${workstation.ipAddress})`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Gagal membuka Remote Desktop: ' + err.message });
    }
  }

  /**
   * Mengunduh profil file koneksi .RDP yang dapat langsung diklik pada komputer klien mana pun
   */
  public static async downloadRdpFile(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const workstation = await prisma.workstation.findUnique({ where: { id } });

      if (!workstation) {
        res.status(404).send('Workstation tidak ditemukan');
        return;
      }

      const rdpContent = [
        `full address:s:${workstation.ipAddress}:3389`,
        `prompt for credentials:i:1`,
        `administrative session:i:1`,
        `screen mode id:i:2`,
        `use multimon:i:0`,
        `desktopwidth:i:1920`,
        `desktopheight:i:1080`,
        `session bpp:i:32`,
        `compression:i:1`,
        `keyboardhook:i:2`,
        `audiomode:i:0`,
        `redirectclipboard:i:1`,
        `autoreconnection enabled:i:1`,
        `authentication level:i:2`,
        `enablecredsspsupport:i:1`,
        `span monitors:i:0`,
        `remoteapplicationmode:i:0`,
        ``,
      ].join('\r\n');

      res.setHeader('Content-Type', 'application/x-rdp');
      res.setHeader('Content-Disposition', `attachment; filename="${workstation.hostname}.rdp"`);
      res.send(rdpContent);
    } catch (err: any) {
      res.status(500).send('Gagal mengunduh file RDP: ' + err.message);
    }
  }
}
