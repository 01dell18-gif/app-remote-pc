import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuditService } from '../services/auditService';

const prisma = new PrismaClient();

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user || !user.isActive) {
        res.status(401).json({ success: false, message: 'Akun tidak ditemukan atau tidak aktif' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Kredensial login tidak cocok' });
        return;
      }

      const tokenPayload = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      };

      const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '12h' });

      await AuditService.log(user.id, 'USER_LOGIN', 'SUCCESS', null, {
        ip: req.ip || req.socket.remoteAddress,
      });

      res.json({
        success: true,
        message: 'Login berhasil',
        token,
        user: tokenPayload,
      });
    } catch (err: any) {
      console.error('[AuthController] Galat login:', err);
      res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server' });
    }
  }

  public static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Tidak terotentikasi' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data profil' });
    }
  }
}
