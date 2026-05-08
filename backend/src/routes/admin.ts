// ============================================================
// backend/src/routes/admin.ts  —  Fase 8
//
// Todas las rutas requieren: authenticate + requireRole(['admin'])
// ============================================================
import { upload, uploadImage } from '../controllers/uploadController';
import { Router } from 'express';
import {
  getStats, getReports,
  getAdminCategories, createCategory, updateCategory, deleteCategory,
  getAdminItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleItemAvailability,
  getAdminUsers, createAdminUser, updateAdminUser, toggleUserActive, resetUserPassword,
  getSettings, saveSettings,
} from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { requireRole }  from '../middleware/roleAuth';

const router = Router();
const isAdmin = [authenticate, requireRole(['admin'])];

// KPIs
router.get('/stats',   ...isAdmin, getStats);
router.get('/reports', ...isAdmin, getReports);

// Categorías
router.get('/menu/categories',         ...isAdmin, getAdminCategories);
router.post('/menu/categories',        ...isAdmin, createCategory);
router.put('/menu/categories/:id',     ...isAdmin, updateCategory);
router.delete('/menu/categories/:id',  ...isAdmin, deleteCategory);

// Items
router.get('/menu/items',              ...isAdmin, getAdminItems);
router.post('/menu/items',             ...isAdmin, createMenuItem);
router.put('/menu/items/:id',          ...isAdmin, updateMenuItem);
router.delete('/menu/items/:id',       ...isAdmin, deleteMenuItem);
router.patch('/menu/items/:id/availability', ...isAdmin, toggleItemAvailability);

// Usuarios
router.get('/users',                   ...isAdmin, getAdminUsers);
router.post('/users',                  ...isAdmin, createAdminUser);
router.put('/users/:id',               ...isAdmin, updateAdminUser);
router.patch('/users/:id/toggle',      ...isAdmin, toggleUserActive);
router.post('/users/:id/reset-password', ...isAdmin, resetUserPassword);

// Configuración
router.get('/settings',  ...isAdmin, getSettings);
router.put('/settings',  ...isAdmin, saveSettings);

// Subida de imágenes
router.post('/upload', ...isAdmin, upload.single('image'), uploadImage);

export default router;