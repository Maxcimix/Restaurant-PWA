// ============================================================
// backend/src/controllers/menuController.ts
//
// Controladores para el menú del restaurante.
// GET /api/menu/categories  → categorías activas ordenadas
// GET /api/menu/items       → items disponibles, filtro opcional
// ============================================================

import { Request, Response } from 'express';
import pool from '../utils/db';

// GET /api/menu/categories
export async function getCategories(_req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT id, name, description, icon, image_url, position, is_active
      FROM menu_categories
      WHERE is_active = true
      ORDER BY position ASC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('[menu/categories]', err);
    return res.status(500).json({ message: 'Error al obtener categorías' });
  }
}

// GET /api/menu/items?category=:id
export async function getMenuItems(req: Request, res: Response) {
  try {
    const { category } = req.query;

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