// ============================================================
// frontend/src/hooks/useCajaWebSocket.ts  —  Fase 4
//
// WebSocket para el rol caja. Recibe broadcast global de todas
// las órdenes (order:new, order:status) y actualiza el store.
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { useCajaStore } from '../store/cajaStore';
import type { OrderStatus } from '../types/order';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

export function useCajaWebSocket(token: string | null) {
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1_000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted      = useRef(true);

  const { addOrder, updateStatus, removeOrder } = useCajaStore();

  const connect = useCallback(() => {
    if (!token || !isMounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}?role=caja`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS Caja] Conectado');
      reconnectDelay.current = 1_000;
      ws.send(JSON.stringify({ type: 'role', role: 'caja' }));
    };

    ws.onmessage = ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data as string) as {
          type: string;
          payload: Record<string, unknown>;
        };

        switch (type) {
          case 'order:new':
            addOrder({
              id:             payload.orderId as string,
              order_number:   payload.orderNumber as string,
              table_id:       (payload.tableId as string | null) ?? null,
              status:         payload.status as OrderStatus,
              total:          payload.total as number,
              source:         payload.source as 'autoservicio' | 'waiter' | 'kiosk',
              subtotal:       payload.total as number,
              tax:            null, discount: null, tip: 0,
              payment_method: null, payment_status: 'pending',
              notes: null,
              created_at:        new Date().toISOString(),
              validated_at:      null, sent_to_kitchen_at: null,
              ready_at:          null, delivered_at: null, completed_at: null,
            });
            break;

          case 'order:status': {
            const status = payload.status as OrderStatus;
            if (['completed', 'cancelled'].includes(status)) {
              removeOrder(payload.orderId as string);
            } else {
              updateStatus(payload.orderId as string, status);
            }
            break;
          }

          default: break;
        }
      } catch {
        console.warn('[WS Caja] Mensaje no parseable:', data);
      }
    };

    ws.onerror  = (e) => console.error('[WS Caja] Error:', e);
    ws.onclose  = () => {
      if (!isMounted.current) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
        connect();
      }, reconnectDelay.current);
    };
  }, [token, addOrder, updateStatus, removeOrder]);

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