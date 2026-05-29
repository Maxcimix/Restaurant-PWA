// ============================================================
// frontend/src/hooks/useStockAvailability.ts
//
// Hook que consulta la disponibilidad de los items del menú
// y se suscribe a eventos WebSocket de agotamiento/reposición.
//
// Uso:
//   const { availability, isLoading } = useStockAvailability();
//   const itemAvail = availability[item.id];
//   if (!itemAvail?.available) → mostrar "Agotado"
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';

export interface ItemAvailability {
  available: boolean;
  reason?:   string;
}

export function useStockAvailability() {
  const [availability, setAvailability] = useState<Record<string, ItemAvailability>>({});
  const [isLoading,    setIsLoading]    = useState(false);

  const fetchAvailability = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<Record<string, ItemAvailability>>('/menu/availability');
      setAvailability(data);
    } catch (err) {
      console.warn('[useStockAvailability] Error al cargar disponibilidad:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Suscripción a eventos WebSocket
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type:    string;
          payload: { menuItemId: string };
        };

        if (msg.type === 'menu:item_unavailable') {
          setAvailability((prev) => ({
            ...prev,
            [msg.payload.menuItemId]: { available: false, reason: 'Agotado' },
          }));
        }

        if (msg.type === 'menu:item_available') {
          setAvailability((prev) => ({
            ...prev,
            [msg.payload.menuItemId]: { available: true },
          }));
        }

        // Cuando hay un reabastecimiento global → recargar todo
        if (msg.type === 'inventory:stock_update') {
          fetchAvailability();
        }
      } catch {
        // ignorar mensajes no JSON
      }
    };

    // Conectar al WebSocket del servidor
    const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined)
      ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.addEventListener('message', handleMessage);
    } catch {
      console.warn('[useStockAvailability] No se pudo conectar al WebSocket');
    }

    return () => {
      ws?.removeEventListener('message', handleMessage);
      if (ws?.readyState === WebSocket.OPEN) ws.close();
    };
  }, [fetchAvailability]);

  return { availability, isLoading, refetch: fetchAvailability };
}
