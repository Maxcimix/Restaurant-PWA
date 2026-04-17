// ============================================================
// frontend/src/store/cajaStore.ts  —  Fase 4
//
// Estado en memoria del dashboard de Caja.
// Se puebla desde /api/orders/active al cargar y se actualiza
// en tiempo real vía WebSocket (useCajaWebSocket).
// NO persiste en localStorage — siempre fresco desde backend.
// ============================================================

import { create } from 'zustand';
import type { Order, OrderStatus } from '../types/order';
import type { OrderWithMeta } from '../types/caja';

interface CajaState {
  orders:        OrderWithMeta[];
  loading:       boolean;
  error:         string | null;
  newOrderAlert: boolean;  // activa sonido/visual de nueva orden

  setOrders:    (orders: Order[]) => void;
  addOrder:     (order: Order)    => void;
  updateStatus: (orderId: string, status: OrderStatus) => void;
  removeOrder:  (orderId: string) => void;
  setLoading:   (v: boolean)      => void;
  setError:     (msg: string | null) => void;
  clearAlert:   () => void;
}

function withMeta(order: Order): OrderWithMeta {
  const elapsedMs      = Date.now() - new Date(order.created_at).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  return { ...order, elapsedMinutes, isUrgent: elapsedMinutes > 20 };
}

export const useCajaStore = create<CajaState>()((set) => ({
  orders:        [],
  loading:       false,
  error:         null,
  newOrderAlert: false,

  setOrders: (orders) =>
    set({ orders: orders.map(withMeta), loading: false, error: null }),

  addOrder: (order) =>
    set((s) => ({ orders: [withMeta(order), ...s.orders], newOrderAlert: true })),

  updateStatus: (orderId, status) =>
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId ? withMeta({ ...o, status }) : o
      ),
    })),

  // Quitar del dashboard al completarse o cancelarse
  removeOrder: (orderId) =>
    set((s) => ({ orders: s.orders.filter((o) => o.id !== orderId) })),

  setLoading: (loading) => set({ loading }),
  setError:   (error)   => set({ error, loading: false }),
  clearAlert: ()        => set({ newOrderAlert: false }),
}));