// ============================================================
// frontend/src/store/cartStore.ts
//
// Store global del carrito usando Zustand + persist.
// Persiste en localStorage para sobrevivir recargas de página.
// Se resetea automáticamente tras un checkout exitoso.
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, MenuItem } from '../types';

// Re-exportamos MenuItem para que coincida con el tipo esperado
export type { CartItem };

interface CartState {
  // ── Estado ──────────────────────────────────────────────
  items: CartItem[];
  tableId: string | null;   // ID de la mesa asignada al cliente
  tableNumber: number | null; // Número de mesa para mostrar en UI

  // ── Acciones de mesa ────────────────────────────────────
  setTable: (id: string, number: number) => void;
  clearTable: () => void;

  // ── Acciones del carrito ─────────────────────────────────
  /**
   * Agrega un item al carrito. Si ya existe, incrementa la cantidad.
   * @param item - El item del menú a agregar
   * @param qty - Cantidad a agregar (default 1)
   * @param notes - Instrucciones especiales (opcional)
   */
  addItem: (item: MenuItem, qty?: number, notes?: string) => void;

  /**
   * Elimina completamente un item del carrito por su ID.
   */
  removeItem: (menuItemId: string) => void;

  /**
   * Actualiza la cantidad de un item. Si qty <= 0, lo elimina.
   */
  updateQty: (menuItemId: string, qty: number) => void;

  /**
   * Vacía el carrito por completo (post-checkout o acción manual).
   */
  clearCart: () => void;

  // ── Selectores calculados ────────────────────────────────
  /**
   * Suma de (precio × cantidad) de todos los items.
   * El cálculo final se re-verifica en el backend.
   */
  getTotal: () => number;

  /**
   * Cantidad total de unidades en el carrito (para el badge).
   */
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      tableId: null,
      tableNumber: null,

      // ── Mesa ─────────────────────────────────────────────
      setTable: (id, number) => set({ tableId: id, tableNumber: number }),
      clearTable: () => set({ tableId: null, tableNumber: null }),

      // ── Carrito ──────────────────────────────────────────
      addItem: (item, qty = 1, notes = '') => {
        set((state) => {
          const existing = state.items.find(
            (ci) => ci.menuItem.id === item.id
          );
          if (existing) {
            // Incrementar cantidad si ya está en el carrito
            return {
              items: state.items.map((ci) =>
                ci.menuItem.id === item.id
                  ? { ...ci, quantity: ci.quantity + qty }
                  : ci
              ),
            };
          }
          // Agregar nuevo item
          return {
            items: [...state.items, { menuItem: item, quantity: qty, notes }],
          };
        });
      },

      removeItem: (menuItemId) => {
        set((state) => ({
          items: state.items.filter((ci) => ci.menuItem.id !== menuItemId),
        }));
      },

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

      clearCart: () => set({ items: [], tableId: null, tableNumber: null }),

      // ── Selectores ───────────────────────────────────────
      getTotal: () => {
        const { items } = get();
        return items.reduce(
          (sum, ci) => sum + ci.menuItem.price * ci.quantity,
          0
        );
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((sum, ci) => sum + ci.quantity, 0);
      },
    }),
    {
      name: 'rpwa-cart',  // clave en localStorage
      // Solo persistir items y mesa, no las funciones
      partialize: (state) => ({
        items: state.items,
        tableId: state.tableId,
        tableNumber: state.tableNumber,
      }),
    }
  )
);