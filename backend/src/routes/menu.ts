// ============================================================
// backend/src/routes/menu.ts
// ============================================================
import { Router } from 'express';
import { getCategories, getMenuItems } from '../controllers/menuController';

const router = Router();
router.get('/categories', getCategories);
router.get('/items',      getMenuItems);
export default router;