// ============================================================
// backend/src/routes/orders.ts
//
// CAMBIOS vs Fase 3 original:
// - POST /api/orders y GET /api/orders/:id son públicos.
//   El cliente autoservicio los usa sin login.
// - table_id es null en autoservicio — el controller lo valida
//   según el campo source del body.
// ============================================================

import { Router } from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderStatus,
  getActiveOrders,
} from '../controllers/orderController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// ── Rutas públicas (cliente sin login) ──────────────────────

// Crea una nueva orden. En autoservicio: table_id = null, source = 'autoservicio'.
// En flujo mesero: table_id = UUID de la mesa, source = 'waiter'.
router.post('/', createOrder);

// Consulta el estado de una orden — el cliente rastrea su pedido
router.get('/:id', getOrderById);

// ── Rutas protegidas (solo personal autenticado) ─────────────

// Dashboard de caja/cocina — lista todas las órdenes activas
router.get(
  '/',
  authenticate,
  requireRole(['caja', 'cocina', 'mesero', 'admin']),
  getActiveOrders
);

// Actualizar estado de una orden (caja valida, cocina prepara, etc.)
router.patch(
  '/:id/status',
  authenticate,
  requireRole(['caja', 'cocina', 'admin']),
  updateOrderStatus
);

export default router;