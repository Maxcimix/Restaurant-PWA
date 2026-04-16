// ============================================================
// frontend/src/services/menuService.ts
//
// Servicios para consultar el menú del restaurante.
// Todas las rutas son públicas (no requieren JWT).
// ============================================================

import { apiFetch } from './api';
import type { MenuCategory, MenuItem } from '../types/menu';

/**
 * Obtiene todas las categorías activas ordenadas por posición.
 */
export async function getCategories(): Promise<MenuCategory[]> {
  return apiFetch<MenuCategory[]>('/menu/categories');
}

/**
 * Obtiene items del menú disponibles.
 * @param categoryId - Si se provee, filtra por categoría.
 */
export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const query = categoryId ? `?category=${categoryId}` : '';
  const items = await apiFetch<MenuItem[]>(`/menu/items${query}`);
  
  return items.map((item) => ({
    ...item,
    price: Number(item.price),
    preparation_time: Number(item.preparation_time),
  }));
}