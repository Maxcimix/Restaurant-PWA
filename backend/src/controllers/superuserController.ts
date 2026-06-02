import { Request, Response } from 'express';
import pool from '../utils/db';
import { broadcast } from '../websocket/handlers';

export async function getSuperuserConfig(_req: Request, res: Response) {
  try {
    const result = await pool.query(`SELECT key, value FROM settings`);
    const s: Record<string, string> = {};
    for (const row of result.rows) s[row.key] = row.value;
    return res.json({
      restaurant_name: s['name']           ?? 'Mi Restaurante',
      address:         s['address']        ?? '',
      phone:           s['phone']          ?? '',
      logo_url:        s['logo_url']       ?? null,
      operation_mode:  s['operation_mode'] ?? process.env.OPERATION_MODE ?? 'ambos',
      tax_rate:        parseFloat(s['tax_rate']       ?? '0'),
      tip_suggestion:  parseFloat(s['tip_suggestion'] ?? '0'),
      currency:        s['currency']       ?? 'COP',
      timezone:        s['timezone']       ?? 'America/Bogota',
    });
  } catch (err) {
    console.error('[superuser/config/get]', err);
    return res.status(500).json({ message: 'Error al obtener configuración' });
  }
}

export async function updateSuperuserConfig(req: Request, res: Response) {
  try {
    const data = req.body as Record<string, unknown>;
    const map: Record<string, string> = {
      restaurant_name: 'name',
      address:         'address',
      phone:           'phone',
      logo_url:        'logo_url',
      operation_mode:  'operation_mode',
      tax_rate:        'tax_rate',
      tip_suggestion:  'tip_suggestion',
      currency:        'currency',
      timezone:        'timezone',
    };
    for (const [bodyKey, dbKey] of Object.entries(map)) {
      if (data[bodyKey] !== undefined) {
        await pool.query(
          `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
          [dbKey, String(data[bodyKey])]
        );
      }
    }
    broadcast({ type: 'CONFIG_UPDATED', payload: data });
    return res.json({ message: 'Configuración actualizada' });
  } catch (err) {
    console.error('[superuser/config/put]', err);
    return res.status(500).json({ message: 'Error al actualizar configuración' });
  }
}