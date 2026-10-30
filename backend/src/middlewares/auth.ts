import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: 'SUPERADMIN' | 'INSTRUCTOR' | 'LAB_ASSISTANT';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Akses ditolak: Token otentikasi tidak disediakan' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Sesi login tidak valid atau telah kedaluwarsa' });
    return;
  }
}

export function requireRole(allowedRoles: Array<'SUPERADMIN' | 'INSTRUCTOR' | 'LAB_ASSISTANT'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terotentikasi' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Akses ditolak: Peran ${req.user.role} tidak memiliki wewenang untuk tindakan ini`,
      });
      return;
    }

    next();
  };
}
