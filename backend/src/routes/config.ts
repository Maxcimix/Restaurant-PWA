// ============================================================
// backend/src/routes/config.ts
//
// Lee el modo de operación desde la variable de entorno
// OPERATION_MODE definida al momento del despliegue.
//
// .env del restaurante:
//   OPERATION_MODE=autoservicio   → solo kiosko QR
//   OPERATION_MODE=mesero         → solo servicio con mesero
//   OPERATION_MODE=ambos          → los dos modos (default)
//
// El restaurante NO puede cambiar esto desde la app.
// Solo el equipo técnico lo modifica al instalar el sistema.
// ============================================================

import { Router } from 'express';
import type { Request, Response } from 'express';
import pool from '../utils/db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT key, value FROM settings`);
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return res.json({
      operationMode: (settings['operation_mode'] ?? process.env.OPERATION_MODE ?? 'ambos').trim().toLowerCase(),
      taxRate:        parseFloat(settings['tax_rate']       ?? '0'),
      tipSuggestion:  parseFloat(settings['tip_suggestion'] ?? '0'),
      currency:       settings['currency']  ?? 'COP',
      timezone:       settings['timezone']  ?? 'America/Bogota',
    });
  } catch {
    return res.json({
      operationMode: (process.env.OPERATION_MODE ?? 'ambos').trim().toLowerCase(),
      taxRate: 0, tipSuggestion: 0, currency: 'COP', timezone: 'America/Bogota',
    });
  }
});

export default router;