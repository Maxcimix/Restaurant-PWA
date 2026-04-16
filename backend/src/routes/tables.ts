// ============================================================
// backend/src/routes/tables.ts
// ============================================================
import { Router } from 'express';
import { validateTable, getAllTables, updateTableStatus } from '../controllers/tableController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';

const router = Router();

// Pública — el cliente necesita validar su mesa sin login
router.get('/validate/:code', validateTable);

// Protegidas — solo personal
router.get('/',        authenticate, requireRole(['mesero','caja','admin']), getAllTables);
router.patch('/:id/status', authenticate, requireRole(['mesero','caja','admin']), updateTableStatus);

export default router;