// ============================================================
// backend/src/routes/menu.ts
//
// Rutas del menú — públicas, sin autenticación.
// Las categorías e items los gestiona el Admin en Fase 8.
// El frontend renderiza dinámicamente lo que retornen estos endpoints.
// ============================================================
 
import { Router } from 'express';
import { getCategories, getMenuItems } from '../controllers/menuController';
 
const router = Router();
 
// GET /api/menu/categories
// Retorna categorías activas ordenadas por position, sin duplicados (DISTINCT ON)
router.get('/categories', getCategories);
 
// GET /api/menu/items?category=:uuid
// Retorna items disponibles, filtrado opcional por category_id
router.get('/items', getMenuItems);
 
export default router;
 