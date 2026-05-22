// ============================================================
// frontend/src/services/waiterService.ts  —  Fase 6
//
// NUEVO: modifyWaiterOrder / canModifyWaiterOrder
// Reutilizan los mismos endpoints del backend que autoservicio
// (/orders/:id/modify y /orders/:id/can-modify).
// ============================================================

import { apiFetch } from './api';
import type { Table, WaiterOrderPayload } from '../types/table';
import type { Order } from '../types/order';

export const getTables = (): Promise<Table[]> =>
  apiFetch<Table[]>('/tables');

export const updateTableStatus = (
  tableId: string,
  status: Table['status']
): Promise<Table> =>
  apiFetch<Table>(`/tables/${tableId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status }),
  });

export const createWaiterOrder = (payload: WaiterOrderPayload): Promise<Order> =>
  apiFetch<Order>('/orders', {
    method: 'POST',
    body:   JSON.stringify(payload),
  });

/**
 * Verifica si una orden puede ser modificada por el mesero.
 * Solo permite modificar antes de que la caja la envíe a cocina.
 */
export const canModifyWaiterOrder = (orderId: string): Promise<{
  canModify: boolean;
  status: string;
  reason: string | null;
}> => apiFetch(`/orders/${orderId}/can-modify`);

/**
 * Modifica una orden existente reemplazando sus items.
 * Solo funciona en estado pending_payment / payment_confirmed / pending_validation.
 */
export const modifyWaiterOrder = (
  orderId: string,
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
  }>
): Promise<Order> =>
  apiFetch<Order>(`/orders/${orderId}/modify`, {
    method: 'PATCH',
    body:   JSON.stringify({ items }),
  });

export const getActiveOrders = (): Promise<Order[]> =>
  apiFetch<Order[]>('/orders/active');

export const getOrderDetail = (orderId: string): Promise<Order> =>
  apiFetch<Order>(`/orders/${orderId}`);

export const markAsDelivered = (orderId: string): Promise<Order> =>
  apiFetch<Order>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status: 'delivered' }),
  });

export const requestBill = (
  orderId: string,
  payload: { payment_method: string; tip?: number; notes?: string; }
): Promise<{
  orderId: string; orderNumber: string; paymentMethod: string;
  tip: number; subtotal: number; tax: number; total: number; status: string;
}> =>
  apiFetch(`/orders/${orderId}/request-bill`, {
    method: 'PATCH',
    body:   JSON.stringify(payload),
  });

  /**
 * Marca un ítem individual como entregado.
 * Si todos los ítems quedan entregados, la orden pasa a 'delivered'.
 */
export const deliverItem = (
  orderId: string,
  itemId:  string
): Promise<{ item: unknown; allDelivered: boolean }> =>
  apiFetch(`/orders/${orderId}/items/${itemId}/deliver`, {
    method: 'PATCH',
  });