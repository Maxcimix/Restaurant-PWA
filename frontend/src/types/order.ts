// ============================================================
// frontend/src/types/order.ts
// Tipos de órdenes, items de orden y estados
// ============================================================

import type { MenuItem } from './menu';
 
// Todos los estados posibles de una orden
export type OrderStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'pending_validation'
  | 'sent_to_kitchen'
  | 'in_preparation'
  | 'ready_for_pickup'
  | 'delivered'
  | 'completed'
  | 'cancelled';
 
// Fuente de origen de la orden — autoservicio nunca usa mesa
export type OrderSource = 'autoservicio' | 'waiter' | 'kiosk';
 
// Item dentro del carrito (antes de crear la orden)
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}
 
// Orden completa retornada por el backend
export interface Order {
  id: string;
  order_number: string;
  // NOTA TÉCNICA: table_id es null en todas las órdenes autoservicio.
  // Solo tiene valor en el flujo Con Mesero (Fase 6).
  table_id: string | null;
  subtotal: number;
  tax: number | null;
  discount: number | null;
  tip: number;
  total: number;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: string;
  source: OrderSource;
  notes: string | null;
  created_at: string;
  validated_at: string | null;
  sent_to_kitchen_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  items?: OrderItemDetail[];
}
 
// Item de orden guardado en BD
export interface OrderItemDetail {
  id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions: string | null;
  status: string;
  name: string;
}
 
// ── Payload para crear orden autoservicio ────────────────────
// CRÍTICO: table_id es siempre null aquí.
// Las mesas son exclusivas del flujo Con Mesero (Fase 6).
export interface CreateOrderPayload {
  table_id: null;                       // ← siempre null en autoservicio
  source: 'autoservicio';               // ← literal, no genérico
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions: string;
  }>;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  notes: string;
}
 
// Eventos WebSocket
export interface WsOrderStatusEvent {
  orderId: string;
  status: OrderStatus;
  estimatedTime?: number;
  message?: string;
}
 
export interface WsOrderReadyEvent {
  orderId: string;
  orderNumber: string;
}