import { Router } from 'express';
import { getCategories, getMenuItems } from '../controllers/menuController';
import { getMenuAvailability } from '../controllers/menuController';

const router = Router();

// GET /api/menu/categories
router.get('/categories', getCategories);

// GET /api/menu/items?category=:uuid
router.get('/items', getMenuItems);

// GET /api/menu/availability
// Retorna disponibilidad de cada item según stock en bodega cocina/principal
router.get('/availability', getMenuAvailability);

export default router;
