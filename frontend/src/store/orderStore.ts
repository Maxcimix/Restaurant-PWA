// ============================================================
// frontend/src/store/orderStore.ts
//
// Store de la orden activa durante el tracker.
// Persiste en localStorage para sobrevivir recargas.
// Se actualiza en tiempo real desde useWebSocket.
//
// Compatible con el cartStore corregido (sin tableId).
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order, OrderStatus } from '../types/order';

interface OrderState {
  activeOrder: Order | null;
  isModifying: boolean;  // Flag para indicar que estamos en modo modificación
  setActiveOrder:    (order: Order) => void;
  // Llamado desde useWebSocket cuando llega order:status
  updateOrderStatus: (status: OrderStatus) => void;
  clearActiveOrder:  () => void;
  // Modo modificación
  startModifying:    () => void;
  stopModifying:     () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      activeOrder: null,
      isModifying: false,

      setActiveOrder: (order) => set({ activeOrder: order }),

      // Solo actualiza el campo status — no reemplaza la orden completa
      updateOrderStatus: (status) =>
        set((state) => ({
          activeOrder: state.activeOrder
            ? { ...state.activeOrder, status }
            : null,
        })),

      clearActiveOrder: () => set({ activeOrder: null, isModifying: false }),

      startModifying: () => set({ isModifying: true }),
      stopModifying:  () => set({ isModifying: false }),
    }),
    { name: 'rpwa-active-order' }
  )
);
