// ============================================================
// frontend/src/services/orderService.ts
//
// Servicios para crear y consultar órdenes.
// El backend re-calcula totales y valida disponibilidad.
// ============================================================

import { apiFetch } from './api';
import type { Order, CreateOrderPayload } from '../types/order';
 
/**
 * Crea una nueva orden autoservicio.
 *
 * NOTA TÉCNICA: table_id es null por diseño — autoservicio no
 * gestiona mesas. El tipo CreateOrderPayload tiene table_id: null
 * (no string | null) para que TypeScript lo enforze.
 *
 * El backend re-calcula subtotal, tax y total. Nunca confiar
 * en los totales calculados en el cliente.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
 
/**
 * Consulta el estado actual de una orden.
 * Incluye items con nombres (JOIN con menu_items en backend).
 */
export async function getOrderById(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`);
}

/**
 * Verifica si una orden puede ser modificada.
 * Solo se puede modificar antes de enviar a cocina.
 */
export async function canModifyOrder(orderId: string): Promise<{
  canModify: boolean;
  status: string;
  reason: string | null;
}> {
  return apiFetch<{ canModify: boolean; status: string; reason: string | null }>(
    `/orders/${orderId}/can-modify`
  );
}

/**
 * Modifica una orden existente (agregar/quitar/cambiar items).
 * Solo funciona si la orden está en estado pending_payment o payment_confirmed.
 */
export interface ModifyOrderPayload {
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
  }>;
}

export async function modifyOrder(orderId: string, payload: ModifyOrderPayload): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/modify`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}