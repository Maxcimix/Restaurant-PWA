import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Siempre usa DESPUÉS de `authenticate`.
 *
 * Ejemplo: router.get('/ruta', authenticate, requireRole(['admin', 'caja']), handler)
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Acceso denegado. Rol requerido: ${allowedRoles.join(' o ')}`,
      });
    }

    return next();
  };
}