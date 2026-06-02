// backend/src/controllers/menuController.ts
import { Request, Response } from 'express';
import pool from '../utils/db';
import redis from '../utils/redis';

const CACHE_KEYS = {
  categories: 'menu:categories',
  items:      (categoryId?: string) =>
    categoryId ? `menu:items:${categoryId}` : 'menu:items:all',
};

const TTL = {
  categories: 60 * 10,  // 10 minutos
  items:      60 * 5,   // 5 minutos
};

// GET /api/menu/categories
export async function getCategories(_req: Request, res: Response) {
  try {
    // 1. Intentar desde cache
    const cached = await redis.get(CACHE_KEYS.categories).catch(() => null);
    if (cached) {
      console.log('[Redis] HIT: categorías');
      return res.json(JSON.parse(cached));
    }

    // 2. Si no hay cache, ir a PostgreSQL
    console.log('[Redis] MISS: categorías — consultando BD');
    const result = await pool.query(`
      SELECT DISTINCT ON (id)
        id, name, description, icon, image_url, position, is_active
      FROM menu_categories
      WHERE is_active = true
      ORDER BY id, position ASC
    `);

    const sorted = result.rows.sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position
    );

    // 3. Guardar en Redis con TTL
    await redis
      .setEx(CACHE_KEYS.categories, TTL.categories, JSON.stringify(sorted))
      .catch((err) => console.warn('[Redis] No se pudo guardar cache:', err.message));

    return res.json(sorted);
  } catch (err) {
    console.error('[menu/categories]', err);
    return res.status(500).json({ message: 'Error al obtener categorías' });
  }
}

// GET /api/menu/items?category=:id
export async function getMenuItems(req: Request, res: Response) {
  try {
    const { category } = req.query;
    const categoryId =
      typeof category === 'string' ? category : undefined;

    const cacheKey = CACHE_KEYS.items(categoryId);

    // 1. Intentar desde cache
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      console.log(`[Redis] HIT: items (${cacheKey})`);
      return res.json(JSON.parse(cached));
    }

    // 2. Si no hay cache, ir a PostgreSQL
    console.log(`[Redis] MISS: items — consultando BD (${cacheKey})`);

    let query = `
      SELECT id, category_id, name, description, image_url,
             price, preparation_time, is_available, is_out_of_stock
      FROM menu_items
      WHERE is_available = true
    `;
    const params: string[] = [];

    if (categoryId) {
      params.push(categoryId);
      query += ` AND category_id = $${params.length}`;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    // 3. Guardar en Redis con TTL
    await redis
      .setEx(cacheKey, TTL.items, JSON.stringify(result.rows))
      .catch((err) => console.warn('[Redis] No se pudo guardar cache:', err.message));

    return res.json(result.rows);
  } catch (err) {
    console.error('[menu/items]', err);
    return res.status(500).json({ message: 'Error al obtener items del menú' });
  }
}

// Función auxiliar para invalidar el cache del menú
// Se llama desde el admin cuando modifica el menú (Fase 8)
export async function invalidateMenuCache(): Promise<void> {
  const keys = await redis.keys('menu:*').catch(() => [] as string[]);
  if (keys.length > 0) {
    await redis.del(keys).catch(() => null);
    console.log(`[Redis] Cache del menú invalidado (${keys.length} keys)`);
  }
}

import { InventoryValidationService } from '../services/InventoryValidationService';

export async function getMenuAvailability(_req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const availability = await InventoryValidationService.getMenuAvailability(client);
    return res.json(availability);
  } catch (err) {
    console.error('[menu/availability]', err);
    return res.status(500).json({ message: 'Error al obtener disponibilidad del menú' });
  } finally {
    client.release();
  }
}