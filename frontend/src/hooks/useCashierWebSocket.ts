import { useEffect, useRef, useCallback } from 'react';
import { useCashierStore } from '../store/cashierStore';
import { getWaitingTables, getActiveMonitorOrders } from '../services/cashierService';
import type {
  WsTableReleasedEvent,
  WsOrderPaidEvent,
  WsBillRequestedEvent,
  MonitorOrder,
} from '../types/cashier';

const WS_URL = import.meta.env.VITE_WS_URL ?? 
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export function useCashierWebSocket(token: string | null) {
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1_000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted      = useRef(true);

  const {
    removeWaitingTable,
    addWaitingTable,
    setWaitingTables,
    setMonitorOrders,
    upsertMonitorOrder,
    updateMonitorStatus,
    removeMonitorOrder,
  } = useCashierStore();

  // Carga inicial de datos al conectar
  const loadInitialData = useCallback(async () => {
    try {
      const [waiting, monitor] = await Promise.all([
        getWaitingTables(),
        getActiveMonitorOrders(),
      ]);
      setWaitingTables(waiting);
      setMonitorOrders(monitor);
    } catch {
      // fallo silencioso — se reintentará con reconexión
    }
  }, [setWaitingTables, setMonitorOrders]);

  const connect = useCallback(() => {
    if (!token || !isMounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(`${WS_URL}?role=caja`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS CajaMesero] Conectado');
      reconnectDelay.current = 1_000;
      ws.send(JSON.stringify({ type: 'role', role: 'caja' }));
      loadInitialData();
    };

    ws.onmessage = ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data as string) as {
          type:    string;
          payload: Record<string, unknown>;
        };

        switch (type) {

          // ── Nueva orden del mesero → agregar al monitor ──────────
          case 'order:new': {
            // Solo órdenes de mesero llegan aquí con source='waiter'
            if (payload.source === 'waiter') {
              const o: MonitorOrder = {
                orderId:       payload.orderId       as string,
                orderNumber:   payload.orderNumber   as string,
                tableId:       (payload.tableId       as string | null) ?? null,
                tableNumber:   (payload.tableNumber   as number | null) ?? null,
                waiterName:    (payload.waiterName    as string | null) ?? null,
                status:        payload.status         as string,
                paymentMethod: null,
                tip:           0,
                subtotal:      parseFloat(String(payload.subtotal ?? '0')),
                tax:           parseFloat(String(payload.tax      ?? '0')),
                total:         parseFloat(String(payload.total    ?? '0')),
                createdAt:     new Date().toISOString(),
                items:         (payload.items as MonitorOrder['items']) ?? [],
              };
              upsertMonitorOrder(o);
            }
            break;
          }

          // ── Cambio de estado de orden → actualizar monitor ───────
          case 'order:status': {
            const orderId = payload.orderId as string;
            const status  = payload.status  as string;
            updateMonitorStatus(orderId, status);
            break;
          }

          // ── Mesero solicitó la cuenta ────────────────────────────
          case 'order:bill_requested': {
            const p = payload as unknown as WsBillRequestedEvent;
            // Actualizar en el monitor
            updateMonitorStatus(p.orderId, 'waiting_bill', {
              paymentMethod: p.paymentMethod,
              tip:           p.tip,
              total:         p.total,
            });
            // Recargar waiting tables para obtener todos los datos necesarios
            getWaitingTables()
              .then(setWaitingTables)
              .catch(() => {});
            break;
          }

          // ── Mesa liberada (pago completado) ──────────────────────
          case 'table:released': {
            const p = payload as unknown as WsTableReleasedEvent;
            removeWaitingTable(p.tableId);
            // También quitar del monitor (orden completada)
            // Se identifica por tableId — hay a lo sumo 1 orden activa por mesa
            break;
          }

          // ── Pago confirmado ──────────────────────────────────────
          case 'order:paid': {
            const p = payload as unknown as WsOrderPaidEvent;
            removeWaitingTable(p.tableId);
            removeMonitorOrder(p.orderId);
            break;
          }

          // ── Estado de mesa cambia ────────────────────────────────
          case 'table:status': {
            const status = payload.status as string;
            if (status === 'waiting_bill') {
              // El evento bill_requested ya lo maneja arriba.
              // Este es un fallback para sincronizar.
            }
            if (status === 'available') {
              // Mesa liberada — quitar del monitor si hay alguna orden de esa mesa
              const tableId = payload.tableId as string;
              // Recargar para estar seguros
              getWaitingTables().then(setWaitingTables).catch(() => {});
              // Quitar órdenes completadas del monitor
              removeMonitorOrder(payload.orderId as string);
            }
            break;
          }

          default:
            break;
        }
      } catch {
        console.warn('[WS CajaMesero] Mensaje no parseable:', data);
      }
    };

    ws.onerror  = (e) => console.error('[WS CajaMesero] Error:', e);
    ws.onclose  = () => {
      if (!isMounted.current) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
        connect();
      }, reconnectDelay.current);
    };
  }, [token, removeWaitingTable, addWaitingTable, setWaitingTables,
      setMonitorOrders, upsertMonitorOrder, updateMonitorStatus,
      removeMonitorOrder, loadInitialData]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);
}