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

// Item dentro del carrito (antes de crear la orden)
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string; // instrucciones especiales del cliente
}

// Orden completa retornada por el backend
export interface Order {
  id: string;
  order_number: string;
  table_id: string | null;
  subtotal: number;
  tax: number | null;
  discount: number | null;
  tip: number;
  total: number;
  status: OrderStatus;
  payment_method: string | null;
  payment_status: string;
  source: 'app' | 'waiter' | 'kiosk';
  notes: string | null;
  created_at: string;
  validated_at: string | null;
  sent_to_kitchen_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  // items expandidos (cuando se consulta con JOIN)
  items?: OrderItemDetail[];
}

// Item de orden ya guardado en BD
export interface OrderItemDetail {
  id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions: string | null;
  status: string;
  name: string; // nombre del plato (JOIN con menu_items)
}

// Payload para crear orden
export interface CreateOrderPayload {
  table_id: string | null;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions: string;
  }>;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia';
  notes: string;
  source: 'app';
}

// Tabla validada
export interface TableInfo {
  id: string;
  number: number;
  capacity: number;
  section: string | null;
  status: 'available' | 'occupied' | 'reserved';
}

// Evento WebSocket de cambio de estado
export interface WsOrderStatusEvent {
  orderId: string;
  status: OrderStatus;
  estimatedTime?: number; // minutos
  message?: string;
}

// Evento WebSocket de orden lista
export interface WsOrderReadyEvent {
  orderId: string;
  orderNumber: string;
}