// ============================================================
// frontend/src/hooks/useWebSocket.ts
//
// Conecta al WebSocket del backend y escucha actualizaciones
// de estado de la orden activa en tiempo real.
//
// Reconexión automática con backoff exponencial:
//   1s → 2s → 4s → 8s → ... → 30s máximo
//
// Compatible con el orderStore corregido (sin tableId).
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { useOrderStore } from '../store/orderStore';
import type { WsOrderStatusEvent, WsOrderReadyEvent } from '../types/order';

const WS_URL                = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';
const RECONNECT_INITIAL_MS  = 1_000;
const RECONNECT_MAX_MS      = 30_000;
const RECONNECT_MULTIPLIER  = 2;

interface UseWebSocketOptions {
  orderId:         string | null;
  onStatusChange?: (event: WsOrderStatusEvent) => void;
  onReady?:        (event: WsOrderReadyEvent)  => void;
}

export function useWebSocket({
  orderId,
  onStatusChange,
  onReady,
}: UseWebSocketOptions) {
  const wsRef           = useRef<WebSocket | null>(null);
  const reconnectDelay  = useRef(RECONNECT_INITIAL_MS);
  const reconnectTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted       = useRef(true);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);

  const connect = useCallback(() => {
    if (!orderId || !isMounted.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}?orderId=${orderId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Conectado. orderId:', orderId);
      reconnectDelay.current = RECONNECT_INITIAL_MS;
      // Suscribirse a los eventos de esta orden
      ws.send(JSON.stringify({ type: 'subscribe', orderId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type:    string;
          payload: WsOrderStatusEvent | WsOrderReadyEvent;
        };

        switch (data.type) {
          case 'order:status': {
            const payload = data.payload as WsOrderStatusEvent;
            updateOrderStatus(payload.status);
            onStatusChange?.(payload);
            break;
          }
          case 'order:ready': {
            const payload = data.payload as WsOrderReadyEvent;
            updateOrderStatus('ready_for_pickup');
            onReady?.(payload);
            break;
          }
          default:
            break;
        }
      } catch {
        console.warn('[WS] Mensaje no parseable:', event.data);
      }
    };

    ws.onerror = (err) => console.error('[WS] Error:', err);

    ws.onclose = () => {
      if (!isMounted.current) return;
      console.log('[WS] Desconectado. Reintentando en', reconnectDelay.current, 'ms');
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(
          reconnectDelay.current * RECONNECT_MULTIPLIER,
          RECONNECT_MAX_MS
        );
        connect();
      }, reconnectDelay.current);
    };
  }, [orderId, onStatusChange, onReady, updateOrderStatus]);

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