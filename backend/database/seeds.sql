-- ============================================================
-- backend/database/seeds.sql
--
-- FIX #3: Roles ahora en español (admin, caja, cocina, mesero)
--         coinciden con el backend y el frontend.
-- FIX #4: Las contraseñas se generan con el script helper.
--         Ver instrucciones al final de este archivo.
--
-- IMPORTANTE: Este archivo inserta roles y mesas.
-- Los usuarios de prueba se crean con el endpoint /api/dev/seed
-- o con el script: node scripts/generate-seeds.ts
-- ============================================================

-- ── Secuencia atómica para order_number (FIX race condition) ─
-- Se crea aquí para que esté disponible desde el inicio
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ── Roles en español ─────────────────────────────────────────
-- FIX #3: Antes eran 'cashier','waiter','kitchen','customer'
--         Ahora coinciden con routes/orders.ts y App.tsx
INSERT INTO roles (name, description) VALUES
  ('admin',   'Administrador con acceso total'),
  ('caja',    'Cajero: valida y cierra pedidos'),
  ('cocina',  'Cocinero: KDS y preparación'),
  ('mesero',  'Mesero: mesas y órdenes'),
  ('cliente', 'Cliente del restaurante')
ON CONFLICT (name) DO NOTHING;

-- ── Mesas de ejemplo ─────────────────────────────────────────
INSERT INTO tables (number, capacity, section, status) VALUES
  (1, 4, 'Salón principal', 'available'),
  (2, 4, 'Salón principal', 'available'),
  (3, 6, 'Salón principal', 'available'),
  (4, 2, 'Terraza',         'available'),
  (5, 4, 'Terraza',         'available'),
  (6, 8, 'Privado',         'available')
ON CONFLICT (number) DO NOTHING;

-- ── Categorías de menú de ejemplo ────────────────────────────
INSERT INTO menu_categories (name, description, position, is_active) VALUES
  ('Entradas',    'Para abrir el apetito',        1, true),
  ('Principales', 'Platos fuertes del chef',      2, true),
  ('Bebidas',     'Frescas y naturales',           3, true),
  ('Postres',     'El toque dulce final',          4, true)
ON CONFLICT DO NOTHING;

-- ── Items de menú de ejemplo ──────────────────────────────────
-- Entradas
INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Ensalada César', 'Lechuga romana, crutones, parmesano y aderezo Caesar', 8.50, 5, true
FROM menu_categories WHERE name = 'Entradas' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Sopa del día', 'Consultar con el mesero', 6.00, 5, true
FROM menu_categories WHERE name = 'Entradas' LIMIT 1
ON CONFLICT DO NOTHING;

-- Principales
INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Hamburguesa Clásica', 'Carne 200g, queso cheddar, lechuga y tomate', 12.00, 12, true
FROM menu_categories WHERE name = 'Principales' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Pasta Alfredo', 'Fettuccine con salsa cremosa y parmesano', 11.50, 10, true
FROM menu_categories WHERE name = 'Principales' LIMIT 1
ON CONFLICT DO NOTHING;

-- Bebidas
INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Limonada Natural', 'Limones frescos, agua y azúcar', 3.50, 3, true
FROM menu_categories WHERE name = 'Bebidas' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Agua Mineral', '500ml', 2.00, 1, true
FROM menu_categories WHERE name = 'Bebidas' LIMIT 1
ON CONFLICT DO NOTHING;

-- Postres
INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Brownie con Helado', 'Brownie de chocolate tibio con helado de vainilla', 5.50, 5, true
FROM menu_categories WHERE name = 'Postres' LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================
-- USUARIOS DE PRUEBA
--
-- FIX #4: Los hashes '$2b$10$...' del archivo anterior eran
--         placeholders inválidos. Nadie podía hacer login.
--
-- Para crear usuarios con hashes reales, usa UNA de estas opciones:
--
-- Opción A — Endpoint HTTP (más fácil, Docker corriendo):
--   Abrir en el navegador:
--   http://localhost:3001/api/dev/seed
--
-- Opción B — Script desde Windows (Docker corriendo):
--   cd backend
--   npx ts-node scripts/generate-seeds.ts
--
-- Opción C — Dentro del contenedor Docker:
--   docker exec -it restaurant_backend node -e "
--     const b=require('bcryptjs');
--     Promise.all([
--       b.hash('admin1234',10),
--       b.hash('caja1234',10),
--       b.hash('cocina1234',10),
--       b.hash('mesero1234',10)
--     ]).then(h=>console.log(JSON.stringify(h)))"
--   → Copia los hashes y ejecuta el INSERT manualmente en psql
--
-- Credenciales de prueba:
--   admin@restaurant.com   / admin1234
--   caja@restaurant.com    / caja1234
--   cocina@restaurant.com  / cocina1234
--   mesero@restaurant.com  / mesero1234
-- ============================================================