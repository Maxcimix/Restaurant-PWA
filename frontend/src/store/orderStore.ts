// ============================================================
// frontend/src/store/orderStore.ts
//
// Almacena la orden activa del cliente durante el tracker.
// Se actualiza en tiempo real vía WebSocket.
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderStatus } from '../types/order';

interface OrderState {
  activeOrder: Order | null;
  setActiveOrder: (order: Order) => void;
  updateOrderStatus: (status: OrderStatus) => void;
  clearActiveOrder: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      activeOrder: null,

      setActiveOrder: (order) => set({ activeOrder: order }),

      // Actualiza solo el status (llamado desde WebSocket)
      updateOrderStatus: (status) =>
        set((state) => ({
          activeOrder: state.activeOrder
            ? { ...state.activeOrder, status }
            : null,
        })),

      clearActiveOrder: () => set({ activeOrder: null }),
    }),
    { name: 'rpwa-active-order' }
  )
);