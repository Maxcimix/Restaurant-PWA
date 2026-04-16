// ============================================================
// frontend/src/services/tableService.ts
//
// Valida que el código de mesa/QR exista y esté disponible.
// ============================================================

import { apiFetch } from './api';
import type { TableInfo } from '../types/order';

/**
 * Valida un código de mesa (ingresado manualmente o desde QR).
 * El backend verifica que la mesa exista.
 * @param code - Número de mesa o código QR
 */
export async function validateTable(code: string): Promise<TableInfo> {
  return apiFetch<TableInfo>(`/tables/validate/${encodeURIComponent(code)}`);
}