// ============================================================
// backend/src/routes/orders.ts
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

// Pública* — el cliente crea su orden sin login
router.post('/',          createOrder);
router.get('/:id',        getOrderById);

// Protegidas — solo personal autenticado
router.get('/',           authenticate, requireRole(['caja','cocina','mesero','admin']), getActiveOrders);
router.patch('/:id/status', authenticate, requireRole(['caja','cocina','admin']), updateOrderStatus);

export default router;