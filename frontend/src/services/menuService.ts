// ============================================================
// frontend/src/services/menuService.ts
//
// FIX CRÍTICO: PostgreSQL retorna DECIMAL como string.
// parseFloat() convierte price y preparation_time a number
// para que toFixed() funcione sin crashear.
// ============================================================

import { apiFetch } from './api';
import type { MenuCategory, MenuItem } from '../types/menu';

export async function getCategories(): Promise<MenuCategory[]> {
  const raw = await apiFetch<MenuCategory[]>('/menu/categories');

  // Deduplicar por id (capa defensiva en cliente)
  const seen = new Map<string, MenuCategory>();
  for (const cat of raw) {
    if (!seen.has(cat.id)) seen.set(cat.id, cat);
  }
  return Array.from(seen.values());
}

export async function getMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const query = categoryId ? `?category=${categoryId}` : '';
  const raw   = await apiFetch<MenuItem[]>(`/menu/items${query}`);

  // FIX: PostgreSQL devuelve DECIMAL como string → convertir a number
  // Sin esto, item.price.toFixed(2) lanza "toFixed is not a function"
  return raw.map((item) => ({
    ...item,
    price:            parseFloat(item.price as unknown as string),
    preparation_time: item.preparation_time != null
      ? parseInt(item.preparation_time as unknown as string, 10)
      : null,
  }));
}