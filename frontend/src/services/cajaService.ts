// ============================================================
// frontend/src/services/cajaService.ts  —  Fase 4
// Todas las rutas requieren JWT (rol caja/admin).
// ============================================================

import { apiFetch } from './api';
import type { Order } from '../types/order';
import type { CloseOrderPayload, CloseOrderResponse } from '../types/caja';

export const getActiveOrders = (): Promise<Order[]> =>
  apiFetch<Order[]>('/orders/active');

export const updateOrderStatus = (orderId: string, status: string): Promise<Order> =>
  apiFetch<Order>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status }),
  });

export const closeOrder = (
  orderId: string,
  payload?: CloseOrderPayload
): Promise<CloseOrderResponse> =>
  apiFetch<CloseOrderResponse>(`/orders/${orderId}/close`, {
    method: 'POST',
    body:   JSON.stringify(payload ?? {}),
  });

export const getOrderDetail = (orderId: string): Promise<Order> =>
  apiFetch<Order>(`/orders/${orderId}`);