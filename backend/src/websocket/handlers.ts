// ============================================================
// backend/src/websocket/handlers.ts
//
// Maneja las conexiones WebSocket de clientes, caja y cocina.
// Permite suscribirse a una orderId específica para recibir
// solo los eventos relevantes de esa orden.
//
// Uso desde orderController:
//   import { broadcast } from '../websocket/handlers';
//   broadcast({ type: 'order:status', payload: {...}, targetOrderId: id });
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';

interface WsClient extends WebSocket {
  isAlive:  boolean;
  orderId?: string; // orden a la que está suscrito
  role?:    string; // rol del usuario (para caja/cocina reciben todo)
}

interface BroadcastOptions {
  type:           string;
  payload:        unknown;
  targetOrderId?: string; // si se especifica, solo va a clientes suscritos a esa orden
}

let wss: WebSocketServer | null = null;

/**
 * Inicializa el servidor WebSocket sobre el HTTP server de Express.
 * Se llama una sola vez desde server.ts.
 */
export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WsClient, req: IncomingMessage) => {
    ws.isAlive = true;

    // Extraer orderId de query string (?orderId=xxx)
    const url    = new URL(req.url ?? '/', `http://localhost`);
    const oId    = url.searchParams.get('orderId');
    if (oId) ws.orderId = oId;

    console.log(`[WS] Cliente conectado. orderId: ${ws.orderId ?? 'ninguno'}`);

    // Confirmar conexión al cliente
    ws.send(JSON.stringify({ type: 'connected', payload: { orderId: ws.orderId } }));

    // Manejar mensajes del cliente
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; orderId?: string; role?: string };

        if (msg.type === 'subscribe' && msg.orderId) {
          ws.orderId = msg.orderId;
          console.log(`[WS] Suscripción a orden: ${msg.orderId}`);
        }

        if (msg.type === 'role' && msg.role) {
          ws.role = msg.role;
        }
      } catch {
        // Ignorar mensajes malformados
      }
    });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      console.log(`[WS] Cliente desconectado. orderId: ${ws.orderId ?? 'ninguno'}`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Error en cliente:', err.message);
    });
  });

  // Heartbeat: detectar conexiones muertas cada 30s
  const heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      const ws = client as WsClient;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));

  console.log('[WS] Servidor WebSocket iniciado');
}

/**
 * Envía un mensaje a los clientes relevantes.
 *
 * Si se especifica targetOrderId:
 *   - Los clientes con ese orderId lo reciben.
 *   - Los clientes con rol 'caja' o 'cocina' siempre lo reciben (monitores globales).
 *
 * Si NO se especifica targetOrderId:
 *   - Se envía a TODOS los clientes conectados (broadcast global).
 */
export function broadcast(options: BroadcastOptions): void {
  if (!wss) return;

  const { type, payload, targetOrderId } = options;
  const message = JSON.stringify({ type, payload });

  wss.clients.forEach((client) => {
    const ws = client as WsClient;
    if (ws.readyState !== WebSocket.OPEN) return;

    if (!targetOrderId) {
      ws.send(message);
      return;
    }

    // Enviar si: está suscrito a esta orden, O tiene rol de monitor global
    const isSubscribed  = ws.orderId === targetOrderId;
    const isGlobalRole  = ws.role === 'caja' || ws.role === 'cocina' || ws.role === 'admin';

    if (isSubscribed || isGlobalRole) {
      ws.send(message);
    }
  });
}