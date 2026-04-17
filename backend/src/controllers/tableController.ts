// ============================================================
// backend/src/controllers/tableController.ts
//
// CAMBIOS vs Fase 3 original:
// - validateTable: ahora requiere autenticación en la ruta.
//   Solo el flujo Con Mesero (Fase 6) usa este endpoint.
//   El flujo Autoservicio NO llama este controlador.
// ============================================================

import { Request, Response } from 'express';
import pool from '../utils/db';

// GET /api/tables/validate/:code
// Uso exclusivo del flujo Con Mesero — el mesero verifica una mesa.
// En Autoservicio este endpoint no se usa.
export async function validateTable(req: Request, res: Response) {
  try {
    const { code } = req.params;

    if (!code?.trim()) {
      return res.status(400).json({ message: 'Código de mesa requerido' });
    }

    // Acepta número de mesa (ej: "5") o código QR
    const result = await pool.query(
      `SELECT id, number, capacity, section, status
       FROM tables
       WHERE number::text = $1 OR qr_code = $1`,
      [code.trim()]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: `Mesa "${code}" no encontrada` });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[tables/validate]', err);
    return res.status(500).json({ message: 'Error al validar la mesa' });
  }
}

// GET /api/tables
// Lista todas las mesas con su estado actual (mesero y caja)
export async function getAllTables(_req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, number, capacity, section, status, qr_code
       FROM tables
       ORDER BY number ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('[tables/all]', err);
    return res.status(500).json({ message: 'Error al obtener mesas' });
  }
}

// PATCH /api/tables/:id/status
// Cambia el estado de una mesa (available, occupied, reserved, waiting_bill)
export async function updateTableStatus(req: Request, res: Response) {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const allowed = ['available', 'occupied', 'reserved', 'waiting_bill'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Estado inválido. Permitidos: ${allowed.join(', ')}`,
      });
    }

    const result = await pool.query(
      `UPDATE tables
       SET status = $1
       WHERE id = $2
       RETURNING id, number, status`,
      [status, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('[tables/status]', err);
    return res.status(500).json({ message: 'Error al actualizar estado de mesa' });
  }
}