// ============================================================
// backend/src/routes/tables.ts
//
// CAMBIOS vs Fase 3 original:
// - ACLARACIÓN: GET /api/tables/validate/:code sigue existiendo
//   pero es para uso exclusivo del flujo Con Mesero (Fase 6),
//   donde el mesero puede asignar una mesa a un pedido.
//   El flujo Autoservicio NO llama este endpoint.
//
// - Todas las rutas de mesas requieren autenticación porque
//   son operaciones de personal, no del cliente.
// ============================================================

import { Router } from 'express';
import {
  validateTable,
  getAllTables,
  updateTableStatus,
} from '../controllers/tableController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Validar mesa — uso exclusivo del flujo Con Mesero (Fase 6).
// NOTA: En Fase 3 (Autoservicio) este endpoint NO se usa.
// Se mantiene para compatibilidad con Fase 6 (mesero).
router.get(
  '/validate/:code',
  authenticate,
  requireRole(['mesero', 'caja', 'admin']),
  validateTable
);

// Listar todas las mesas (mesero y caja)
router.get(
  '/',
  authenticate,
  requireRole(['mesero', 'caja', 'admin']),
  getAllTables
);

// Cambiar estado de una mesa
router.patch(
  '/:id/status',
  authenticate,
  requireRole(['mesero', 'caja', 'admin']),
  updateTableStatus
);

export default router;