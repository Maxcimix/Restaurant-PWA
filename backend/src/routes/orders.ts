// ============================================================
// backend/src/routes/orders.ts  —  Fase 4 (actualizado)
//
// NUEVO: POST /api/orders/:id/close (cierra pedido, genera recibo)
// ============================================================

import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderStatus,
  getActiveOrders,
} from '../controllers/orderController';
import { closeOrder } from '../controllers/cajaController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// ── ⚠️ REGLA CRÍTICA: rutas específicas SIEMPRE antes que /:id ──
// Si /:id va primero, Express interpreta "active" como un UUID
// y el endpoint nunca se alcanza.

// ── Rutas específicas (sin parámetros dinámicos) ─────────────
router.get(
  '/active',
  authenticate,
  requireRole(['caja', 'cocina', 'admin']),
  getActiveOrders
);

// ── Ruta pública: crear orden (cliente sin login) ────────────
router.post('/', createOrder);

// ── Rutas con parámetro /:id — van AL FINAL ──────────────────
router.get('/:id', getOrderById);

router.patch(
  '/:id/status',
  authenticate,
  requireRole(['caja', 'cocina', 'admin']),
  updateOrderStatus
);

// Fase 4: cerrar pedido y generar recibo
router.post(
  '/:id/close',
  authenticate,
  requireRole(['caja', 'admin']),
  closeOrder
);

export default router;