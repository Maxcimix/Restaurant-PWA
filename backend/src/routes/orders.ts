// ============================================================
// backend/src/routes/orders.ts
//
// NUEVO: PATCH /api/orders/:id/request-bill
//   El mesero lo llama cuando el cliente pide la cuenta.
//   Registra método de pago + propina y cambia mesa a waiting_bill.
//   A partir de ahí, caja puede cobrar.
// ============================================================

import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderStatus,
  getActiveOrders,
  getOrderHistory,
  requestBill,
} from '../controllers/orderController';
import { closeOrder }  from '../controllers/cajaController';
import { getOrderMetrics } from '../controllers/metricsController';
import { authenticate }   from '../middleware/auth';
import { requireRole }    from '../middleware/roleAuth';

const router = Router();

// ── Rutas específicas (SIEMPRE antes que /:id) ───────────────

// Órdenes activas — caja, cocina, mesero, admin
router.get(
  '/active',
  authenticate,
  requireRole(['caja', 'cocina', 'mesero', 'admin']),
  getActiveOrders
);

// Historial del día — solo caja y admin
router.get(
  '/history',
  authenticate,
  requireRole(['caja', 'admin']),
  getOrderHistory
);

// Métricas operacionales — solo admin y caja
router.get(
  '/metrics',
  authenticate,
  requireRole(['caja', 'admin']),
  getOrderMetrics
);

// ── Ruta pública: crear orden ────────────────────────────────
router.post('/', createOrder);

// ── Rutas con parámetro /:id ─────────────────────────────────
router.get('/:id', getOrderById);

router.patch(
  '/:id/status',
  authenticate,
  requireRole(['caja', 'cocina', 'mesero', 'admin']),
  updateOrderStatus
);

// NUEVO: El mesero solicita la cuenta (cliente pidió pagar).
// Registra método de pago + propina → mesa pasa a waiting_bill → caja cobra.
router.patch(
  '/:id/request-bill',
  authenticate,
  requireRole(['mesero', 'admin']),
  requestBill
);

router.post(
  '/:id/close',
  authenticate,
  requireRole(['caja', 'admin']),
  closeOrder
);

export default router;