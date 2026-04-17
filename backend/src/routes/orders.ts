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
import { requireRole }  from '../middleware/roleAuth';

const router = Router();

// ── Rutas públicas (cliente sin login) ──────────────────────
router.post('/',    createOrder);
router.get('/:id',  getOrderById);

// ── Rutas protegidas ─────────────────────────────────────────
router.get(
  '/',
  authenticate,
  requireRole(['caja','cocina','mesero','admin']),
  getActiveOrders
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole(['caja','cocina','admin']),
  updateOrderStatus
);

// NUEVO Fase 4: cerrar pedido y generar recibo
router.post(
  '/:id/close',
  authenticate,
  requireRole(['caja','admin']),
  closeOrder
);

export default router;