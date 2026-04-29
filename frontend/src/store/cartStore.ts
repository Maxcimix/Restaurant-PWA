// ============================================================
// frontend/src/store/cartStore.ts
//
// Store del carrito — Autoservicio NO gestiona mesas.
// Zustand + persist → localStorage con clave 'rpwa-cart'.
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from '../types/menu';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes:    string;
}

interface CartState {
  items: CartItem[];

  addItem:     (item: MenuItem, qty?: number, notes?: string) => void;
  removeItem:  (menuItemId: string) => void;
  updateQty:   (menuItemId: string, qty: number) => void;
  clearCart:   () => void;
  getTotal:    () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1, notes = '') =>
        set((state) => {
          const existing = state.items.find(
            (ci) => ci.menuItem.id === item.id
          );
          if (existing) {
            return {
              items: state.items.map((ci) =>
                ci.menuItem.id === item.id
                  ? { ...ci, quantity: ci.quantity + qty }
                  : ci
              ),
            };
          }
          return {
            items: [...state.items, { menuItem: item, quantity: qty, notes }],
          };
        }),

      removeItem: (menuItemId) =>
        set((state) => ({
          items: state.items.filter((ci) => ci.menuItem.id !== menuItemId),
        })),

      updateQty: (menuItemId, qty) => {
        if (qty <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((ci) =>
            ci.menuItem.id === menuItemId ? { ...ci, quantity: qty } : ci
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce(
          (sum, ci) => sum + ci.menuItem.price * ci.quantity,
          0
        ),

      getTotalItems: () =>
        get().items.reduce((sum, ci) => sum + ci.quantity, 0),
    }),
    {
      name: 'rpwa-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);