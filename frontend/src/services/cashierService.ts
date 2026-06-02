// ============================================================
// frontend/src/services/cashierService.ts  —  Fase 7
//
// Servicios HTTP del módulo Caja Con Mesero.
// Todas las rutas requieren JWT con rol caja/admin.
// ============================================================

import { apiFetch } from './api';
import type {
  WaitingTable,
  BillDetail,
  PayOrderPayload,
  PayOrderResponse,
} from '../types/cashier';

/**
 * Lista todas las mesas en estado 'waiting_bill' con sus totales.
 * El backend hace JOIN con orders para incluir subtotal, tax, total
 * y datos del mesero.
 */
export const getWaitingTables = (): Promise<WaitingTable[]> =>
  apiFetch<WaitingTable[]>('/cashier/tables/waiting-bill');

/**
 * Genera la cuenta detallada para una orden.
 * El backend calcula: items con precios, subtotal, IVA, propina
 * sugerida (10%) y total final.
 *
 * Lanzar POST (no GET) permite al backend registrar el momento
 * en que se solicitó la cuenta (audit trail).
 */
export const generateBill = (orderId: string): Promise<BillDetail> =>
  apiFetch<BillDetail>(`/cashier/orders/${orderId}/bill`, {
    method: 'POST',
    body:   JSON.stringify({}),
  });

/**
 * Procesa el pago de una orden.
 * El backend valida: amountPaid >= total, registra cashier_id,
 * actualiza payment_status = 'paid', emite WS order:paid.
 *
 * Incluye protección en backend contra doble cobro (idempotencia
 * basada en payment_status).
 */
export const payOrder = (
  orderId: string,
  payload: PayOrderPayload
): Promise<PayOrderResponse> =>
  apiFetch<PayOrderResponse>(`/cashier/orders/${orderId}/pay`, {
    method: 'POST',
    body:   JSON.stringify(payload),
  });

/**
 * Libera la mesa tras confirmar el pago.
 * El backend: cambia table.status → 'available', cierra la orden
 * (status → 'completed'), emite WS table:released.
 *
 * Operación atómica en transacción DB para evitar estados inconsistentes.
 */
export const releaseTable = (tableId: string): Promise<{ tableId: string; status: 'available' }> =>
  apiFetch(`/cashier/tables/${tableId}/release`, {
    method: 'PATCH',
    body:   JSON.stringify({}),
  });
/**
 * Obtiene todas las órdenes activas del mesero para el panel
 * de monitoreo de caja. Incluye desde sent_to_kitchen hasta
 * waiting_bill. Caja las puede ver pero solo cobra las waiting_bill.
 */
export const getActiveMonitorOrders = (): Promise<import('../types/cashier').MonitorOrder[]> =>
  apiFetch<import('../types/cashier').MonitorOrder[]>('/orders/active').then((orders) =>
    // Filtrar solo órdenes del mesero (source='waiter') que están activas
    (orders as (import('../types/cashier').MonitorOrder & { source?: string })[])
      .filter((o) => (o as { source?: string }).source === 'waiter')
      .map((o) => ({
        orderId:       o.orderId       ?? (o as { id?: string }).id ?? '',
        orderNumber:   o.orderNumber   ?? (o as { order_number?: string }).order_number ?? '',
        tableId:       o.tableId       ?? (o as { table_id?: string }).table_id ?? null,
        tableNumber:   o.tableNumber   ?? (o as { table_number?: number }).table_number ?? null,
        waiterName:    o.waiterName    ?? (o as { waiter_name?: string }).waiter_name ?? null,
        status:        o.status        ?? '',
        paymentMethod: o.paymentMethod ?? (o as { payment_method?: string }).payment_method ?? null,
        tip:           parseFloat(String(o.tip ?? '0')),
        subtotal:      parseFloat(String(o.subtotal ?? '0')),
        tax:           parseFloat(String(o.tax ?? '0')),
        total:         parseFloat(String(o.total ?? '0')),
        createdAt:     o.createdAt     ?? (o as { created_at?: string }).created_at ?? '',
        items:         o.items ?? [],
      }))
  );
