// ============================================================
// frontend/src/store/cashierStore.ts  —  Fase 7 (actualizado)
//
// NUEVO: monitorOrders — panel de monitoreo de caja.
//   Caja puede ver TODAS las órdenes del mesero desde que se envían
//   a cocina (modo solo-lectura). Solo interviene cuando la orden
//   llega a 'waiting_bill' (mesero solicitó la cuenta).
//
// La mesa solo puede ser liberada por CAJA al procesar el pago.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  WaitingTable,
  BillDetail,
  PayOrderResponse,
  CashierPaymentMethod,
  MonitorOrder,
} from '../types/cashier';

interface CashierState {
  // ── Panel monitor (todas las órdenes activas del mesero) ─
  monitorOrders: MonitorOrder[];

  // ── Mesas esperando cuenta (solo waiting_bill) ───────────
  waitingTables: WaitingTable[];
  loading:       boolean;
  error:         string | null;

  // ── Flujo de cobro activo ────────────────────────────────
  selectedTable:    WaitingTable | null;
  activeBill:       BillDetail | null;
  paymentMethod:    CashierPaymentMethod;
  paymentResult:    PayOrderResponse | null;
  isProcessing:     boolean;

  // ── Acciones monitor ─────────────────────────────────────
  setMonitorOrders:    (orders: MonitorOrder[]) => void;
  upsertMonitorOrder:  (order: MonitorOrder) => void;
  updateMonitorStatus: (orderId: string, status: string, extra?: Partial<MonitorOrder>) => void;
  removeMonitorOrder:  (orderId: string) => void;

  // ── Acciones waiting tables ──────────────────────────────
  setWaitingTables:   (tables: WaitingTable[]) => void;
  addWaitingTable:    (table: WaitingTable) => void;
  removeWaitingTable: (tableId: string) => void;
  setLoading:         (v: boolean) => void;
  setError:           (msg: string | null) => void;

  selectTable:       (table: WaitingTable) => void;
  setActiveBill:     (bill: BillDetail)    => void;
  setPaymentMethod:  (m: CashierPaymentMethod) => void;
  setPaymentResult:  (r: PayOrderResponse) => void;
  setProcessing:     (v: boolean)          => void;

  resetFlow:         () => void;
}

export const useCashierStore = create<CashierState>()(
  persist(
    (set) => ({
      monitorOrders: [],
      waitingTables: [],
      loading:       false,
      error:         null,
      selectedTable: null,
      activeBill:    null,
      paymentMethod: 'efectivo',
      paymentResult: null,
      isProcessing:  false,

      // ── Monitor ───────────────────────────────────────────
      setMonitorOrders: (orders) => set({ monitorOrders: orders }),

      upsertMonitorOrder: (order) =>
        set((s) => {
          const exists = s.monitorOrders.find((o) => o.orderId === order.orderId);
          return {
            monitorOrders: exists
              ? s.monitorOrders.map((o) => o.orderId === order.orderId ? { ...o, ...order } : o)
              : [...s.monitorOrders, order],
          };
        }),

      updateMonitorStatus: (orderId, status, extra = {}) =>
        set((s) => ({
          monitorOrders: s.monitorOrders.map((o) =>
            o.orderId === orderId ? { ...o, status, ...extra } : o
          ),
        })),

      removeMonitorOrder: (orderId) =>
        set((s) => ({
          monitorOrders: s.monitorOrders.filter((o) => o.orderId !== orderId),
        })),

      // ── Waiting tables ────────────────────────────────────
      setWaitingTables: (tables) =>
        set({ waitingTables: tables, loading: false, error: null }),

      addWaitingTable: (table) =>
        set((s) => ({
          waitingTables: s.waitingTables.find((t) => t.tableId === table.tableId)
            ? s.waitingTables
            : [...s.waitingTables, table],
        })),

      removeWaitingTable: (tableId) =>
        set((s) => ({
          waitingTables: s.waitingTables.filter((t) => t.tableId !== tableId),
        })),

      setLoading:   (loading)  => set({ loading }),
      setError:     (error)    => set({ error, loading: false }),

      // Pre-carga el método de pago que el mesero ya eligió al solicitar la cuenta.
      // Sin esto, PaymentMethod siempre arranca en 'efectivo' y caja tiene que elegir de nuevo.
      selectTable: (table) => set({
        selectedTable: table,
        activeBill:    null,
        paymentResult: null,
        paymentMethod: (table.paymentMethod as CashierPaymentMethod) ?? 'efectivo',
      }),
      setActiveBill:(bill)     => set({ activeBill: bill }),
      setPaymentMethod: (m)   => set({ paymentMethod: m }),
      setPaymentResult: (r)   => set({ paymentResult: r }),
      setProcessing:(v)        => set({ isProcessing: v }),

      resetFlow: () =>
        set({
          selectedTable: null,
          activeBill:    null,
          paymentResult: null,
          paymentMethod: 'efectivo',
          isProcessing:  false,
          error:         null,
        }),
    }),
    {
      name:    'rpwa-cashier-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        selectedTable: s.selectedTable,
        activeBill:    s.activeBill,
        paymentMethod: s.paymentMethod,
      }),
    }
  )
);
