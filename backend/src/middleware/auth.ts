import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Extiende Request para incluir el usuario decodificado
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

  try {
    const payload = verifyToken(token);
    req.user = payload as { id: string; email: string; role: string };
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}