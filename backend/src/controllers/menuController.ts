// ============================================================
// backend/src/controllers/menuController.ts
//
// CAMBIOS vs Fase 3 original:
// - getCategories(): usa SELECT DISTINCT ON (id) para garantizar
//   registros únicos. Esto corrige el bug de categorías duplicadas.
// - getMenuItems(): sin cambios funcionales.
// ============================================================

import { Request, Response } from 'express';
import pool from '../utils/db';

// GET /api/menu/categories
export async function getCategories(_req: Request, res: Response) {
  try {
    // CORREGIDO: DISTINCT ON (id) garantiza que cada categoría
    // aparezca una sola vez incluso si hay datos corruptos en BD.
    // ORDER BY id, position ASC es requerido por DISTINCT ON en PostgreSQL.
    const result = await pool.query(`
      SELECT DISTINCT ON (id)
        id, name, description, icon, image_url, position, is_active
      FROM menu_categories
      WHERE is_active = true
      ORDER BY id, position ASC
    `);

    // Re-ordenar por position después de deduplicar
    // (DISTINCT ON requiere que el primer ORDER BY sea la columna del DISTINCT)
    const sorted = result.rows.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    );

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

    // ARQUITECTURA: query 100% dinámica — sin categorías hardcodeadas.
    // Los items de cualquier categoría que cree el Admin en Fase 8
    // funcionan automáticamente aquí.
    let query = `
      SELECT id, category_id, name, description, image_url,
             price, preparation_time, is_available, is_out_of_stock
      FROM menu_items
      WHERE is_available = true
    `;
    const params: string[] = [];

    if (category && typeof category === 'string') {
      params.push(category);
      query += ` AND category_id = $${params.length}`;
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('[menu/items]', err);
    return res.status(500).json({ message: 'Error al obtener items del menú' });
  }
}