// ============================================================
// backend/src/server.ts
//
// Punto de entrada del backend.
// Registra todas las rutas y el servidor WebSocket.
// ============================================================

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';

import authRoutes   from './routes/auth';
import menuRoutes   from './routes/menu';
import tableRoutes  from './routes/tables';
import orderRoutes  from './routes/orders';
import devRoutes    from './routes/dev';

import { initWebSocket } from './websocket/handlers';

dotenv.config();

const app    = express();
const server = createServer(app); // HTTP server que comparte con WebSocket

// ── Middlewares ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',   authRoutes);
app.use('/api/menu',   menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);

// Solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV });
});

// ── WebSocket ────────────────────────────────────────────────
initWebSocket(server);

// ── Arranque ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001');
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Environment] ${process.env.NODE_ENV ?? 'development'}`);
});