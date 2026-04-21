// ============================================================
// frontend/src/hooks/useWaiterWebSocket.ts  —  Fase 6
//
// WebSocket para el módulo mesero.
// Se conecta con ?role=mesero → recibe broadcast global de:
//   - order:status (para actualizar estado de sus mesas)
//   - table:status (cuando caja u otro mesero actualiza una mesa)
//
// Patrón idéntico a useCajaWebSocket.ts y useKitchenSocket.ts
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { useWaiterStore } from '../store/waiterStore';
import type { OrderStatus } from '../types/order';
import type { TableStatus } from '../types/table';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

export function useWaiterWebSocket(token: string | null) {
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1_000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted      = useRef(true);

  const { updateTableStatus } = useWaiterStore();

  const connect = useCallback(() => {
    if (!token || !isMounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}?role=mesero`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS Mesero] Conectado');
      reconnectDelay.current = 1_000;
      ws.send(JSON.stringify({ type: 'role', role: 'mesero' }));
    };

    ws.onmessage = ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data as string) as {
          type:    string;
          payload: Record<string, unknown>;
        };

        switch (type) {
          // Cambio de status de una orden — actualizar mesa asociada
          case 'order:status': {
            const status  = payload.status  as OrderStatus;
            const tableId = payload.tableId as string | null;

            if (!tableId) break; // orden de autoservicio, ignorar

            // Sincronizar estado de la mesa según el status de la orden
            if (['completed', 'cancelled'].includes(status)) {
              updateTableStatus(tableId, 'available', {
                current_order_id:     null,
                current_order_number: null,
                current_order_status: null,
              });
            } else {
              updateTableStatus(tableId, 'occupied', {
                current_order_status: status,
              });
            }
            break;
          }

          // El backend emite este evento cuando se actualiza una mesa
          case 'table:status': {
            const tableId = payload.tableId as string;
            const status  = payload.status  as TableStatus;
            updateTableStatus(tableId, status);
            break;
          }

          default:
            break;
        }
      } catch {
        console.warn('[WS Mesero] Mensaje no parseable:', data);
      }
    };

    ws.onerror  = (e) => console.error('[WS Mesero] Error:', e);

    ws.onclose  = () => {
      if (!isMounted.current) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
        connect();
      }, reconnectDelay.current);
    };
  }, [token, updateTableStatus]);

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