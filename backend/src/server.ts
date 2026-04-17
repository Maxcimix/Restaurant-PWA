// ============================================================
// backend/src/server.ts
//
// CAMBIOS vs Fase 3 original:
// - Usa createServer(http) para compartir puerto con WebSocket.
// - Registra menuRoutes, tableRoutes y orderRoutes del fix.
// - /api/dev solo disponible en desarrollo.
// ============================================================

import express from 'express';
import cors    from 'cors';
import { createServer } from 'http';
import dotenv  from 'dotenv';

import authRoutes   from './routes/auth';
import menuRoutes   from './routes/menu';
import tableRoutes  from './routes/tables';
import orderRoutes  from './routes/orders';
import devRoutes    from './routes/dev';

import { initWebSocket } from './websocket/handlers';

dotenv.config();

const app    = express();
const server = createServer(app); // HTTP compartido con WebSocket

// ── Middlewares ──────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/menu',   menuRoutes);   // públicas — menú dinámico
app.use('/api/tables', tableRoutes);  // protegidas — solo personal
app.use('/api/orders', orderRoutes);  // mixtas — ver routes/orders.ts

// Ruta de seeds — solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV ?? 'development' });
});

// ── WebSocket ────────────────────────────────────────────────
initWebSocket(server);

// ── Arranque ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001');
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Environment] ${process.env.NODE_ENV ?? 'development'}`);
});