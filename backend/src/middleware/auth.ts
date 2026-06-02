// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import redis from '../utils/redis';

export interface AuthRequest extends Request {
  user?: {
    id:    string;
    email: string;
    role:  string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  // Verificar si el token está en la blacklist de Redis
  // Usamos una IIFE async para poder usar await
  (async () => {
    try {
      const isBlacklisted = await redis
        .get(`blacklist:${token}`)
        .catch(() => null);

      if (isBlacklisted) {
        return res.status(401).json({ message: 'Sesión cerrada. Inicia sesión de nuevo.' });
      }

      const payload = verifyToken(token);
      req.user = payload as { id: string; email: string; role: string };
      return next();
    } catch {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
  })();
}