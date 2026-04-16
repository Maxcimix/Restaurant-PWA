// ============================================================
// frontend/src/services/orderService.ts
//
// Servicios para crear y consultar órdenes.
// El backend re-calcula totales y valida disponibilidad.
// ============================================================

import { apiFetch } from './api';
import type { Order, CreateOrderPayload } from '../types/order';

/**
 * Crea una nueva orden en el backend.
 * El backend: verifica items disponibles, calcula subtotal/total,
 * asigna order_number único y retorna la orden creada.
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Consulta el estado actual de una orden por ID.
 * Incluye los items con nombres (JOIN con menu_items).
 */
export async function getOrderById(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`);
}