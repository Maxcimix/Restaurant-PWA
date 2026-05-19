-- ============================================================
-- backend/database/seeds.sql  —  Versión consolidada final
--
-- Contiene TODO lo de:
--   004_inventory.sql   → proveedores + ingredientes demo
--   011_restaurant_config.sql → rol superusuario + usuario + config
--   seeds.sql original  → roles, usuarios, mesas, menú
--
-- Ya NO se necesitan los archivos 004, 005 ni 011 por separado.
-- ============================================================

-- ── Secuencia atómica para order_number ──────────────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ── Roles ────────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
  ('admin',        'Administrador con acceso total'),
  ('caja',         'Cajero: valida y cierra pedidos'),
  ('cocina',       'Cocinero: KDS y preparación'),
  ('mesero',       'Mesero: mesas y órdenes'),
  ('cliente',      'Cliente del restaurante'),
  ('superusuario', 'Propietario: configuración global del negocio')
ON CONFLICT (name) DO NOTHING;

-- ── Usuarios de prueba ───────────────────────────────────────
-- Contraseñas:
--   admin@restaurant.com      → admin1234
--   caja@restaurant.com       → caja1234
--   cocina@restaurant.com     → cocina1234
--   mesero@restaurant.com     → mesero1234
--   super@restaurant.com      → super1234
INSERT INTO users (email, password_hash, role_id, first_name, last_name, is_active)
VALUES
  (
    'admin@restaurant.com',
    '$2b$10$Nr/BBgIVtM878NzU1Hhkduazo3P1xo..Uho0ruJQJiwQtyZufBHmO',
    (SELECT id FROM roles WHERE name = 'admin'),
    'Admin', 'Sistema', true
  ),
  (
    'caja@restaurant.com',
    '$2b$10$9J9yAse2E6bM.c3arwNFcOtnbsqCq9YIi5x3EuUwN8Og8gp/qIWg6',
    (SELECT id FROM roles WHERE name = 'caja'),
    'Cajero', 'Sistema', true
  ),
  (
    'cocina@restaurant.com',
    '$2b$10$veo5Y1q8HiyQ3wA29SULDelmXAAluBdSSYC97mEw4Kf0rpT6.53Ve',
    (SELECT id FROM roles WHERE name = 'cocina'),
    'Cocina', 'Sistema', true
  ),
  (
    'mesero@restaurant.com',
    '$2b$10$duSAhC/4eaTzngZHL3PkluWvW4q0tzY5TxtpEsPklWlGi7M42Zytm',
    (SELECT id FROM roles WHERE name = 'mesero'),
    'Mesero', 'Sistema', true
  ),
  (
    'super@restaurant.com',
    '$2b$10$jRMm.nPR.F3Xm2wSVaKF3.2lz0Myl3r5f9r5edS7D/phP2yg561E.',
    (SELECT id FROM roles WHERE name = 'superusuario'),
    'Super', 'Admin', true
  )
ON CONFLICT (email) DO NOTHING;

-- ── Configuración inicial del restaurante ────────────────────
INSERT INTO restaurant_config (id)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM restaurant_config WHERE id = 1);

-- ── Mesas ────────────────────────────────────────────────────
INSERT INTO tables (number, capacity, section, status) VALUES
  (1, 4, 'Salón principal', 'available'),
  (2, 4, 'Salón principal', 'available'),
  (3, 6, 'Salón principal', 'available'),
  (4, 2, 'Terraza',         'available'),
  (5, 4, 'Terraza',         'available'),
  (6, 8, 'Privado',         'available')
ON CONFLICT (number) DO NOTHING;

-- ── Categorías de menú ───────────────────────────────────────
INSERT INTO menu_categories (name, description, position, is_active) VALUES
  ('Entradas',    'Para abrir el apetito',   1, true),
  ('Principales', 'Platos fuertes del chef', 2, true),
  ('Bebidas',     'Frescas y naturales',     3, true),
  ('Postres',     'El toque dulce final',    4, true)
ON CONFLICT (name) DO NOTHING;

-- ── Items de menú ────────────────────────────────────────────
INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Ensalada César', 'Lechuga romana, crutones, parmesano y aderezo Caesar', 8.50, 5, true
FROM menu_categories WHERE name = 'Entradas' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Sopa del día', 'Consultar con el mesero', 6.00, 5, true
FROM menu_categories WHERE name = 'Entradas' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Hamburguesa Clásica', 'Carne 200g, queso cheddar, lechuga y tomate', 12.00, 12, true
FROM menu_categories WHERE name = 'Principales' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Pasta Alfredo', 'Fettuccine con salsa cremosa y parmesano', 11.50, 10, true
FROM menu_categories WHERE name = 'Principales' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Limonada Natural', 'Limones frescos, agua y azúcar', 3.50, 3, true
FROM menu_categories WHERE name = 'Bebidas' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Agua Mineral', '500ml', 2.00, 1, true
FROM menu_categories WHERE name = 'Bebidas' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, preparation_time, is_available)
SELECT id, 'Brownie con Helado', 'Brownie de chocolate tibio con helado de vainilla', 5.50, 5, true
FROM menu_categories WHERE name = 'Postres' LIMIT 1
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- F9: Proveedores e ingredientes de bodega (antes en 004)
-- ============================================================

-- ── Proveedores ──────────────────────────────────────────────
INSERT INTO suppliers (name, contact_name, phone, email, address) VALUES
  ('Distribuidora Alimentos Frescos', 'Juliana Mora',   '310-000-0001', 'juliana@frescos.co',   'Cra 30 # 45-12, Bogotá'),
  ('Carnes Premium S.A.S',            'Ricardo Pardo',  '311-000-0002', 'rpardo@carnesprem.co', 'Av. Boyacá # 12-80, Bogotá'),
  ('Bebidas del Valle',               'Sofía Herrera',  '315-000-0003', 'sofia@bebidasv.co',    'Calle 80 # 90-34, Medellín')
ON CONFLICT (name) DO NOTHING;

-- ── Ingredientes alineados con el menú existente ─────────────
INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Lechuga romana', 'kg', 8.000, 2.000, 3500,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Parmesano rallado', 'kg', 4.000, 1.000, 28000,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Carne molida 80/20', 'kg', 12.000, 3.000, 18000,
       id FROM suppliers WHERE name = 'Carnes Premium S.A.S' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Pan de hamburguesa', 'und', 24, 8, 1200,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Queso cheddar', 'kg', 3.000, 1.000, 22000,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Fettuccine seco', 'kg', 6.000, 1.500, 4500,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Crema de leche', 'l', 4.000, 1.000, 6500,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Limón tahití', 'kg', 5.000, 1.500, 3200,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Chocolate 70%', 'kg', 2.000, 0.500, 32000,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

-- Stock bajo → demuestra alertas
INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Helado de vainilla', 'kg', 0.800, 1.000, 15000,
       id FROM suppliers WHERE name = 'Distribuidora Alimentos Frescos' LIMIT 1
ON CONFLICT (name) DO NOTHING;

-- Stock agotado → demuestra estado crítico
INSERT INTO ingredients (name, unit, stock_quantity, min_stock, cost_per_unit, supplier_id)
SELECT 'Agua mineral 500ml', 'und', 0, 12, 800,
       id FROM suppliers WHERE name = 'Bebidas del Valle' LIMIT 1
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Credenciales de acceso:
--   admin@restaurant.com      / admin1234
--   caja@restaurant.com       / caja1234
--   cocina@restaurant.com     / cocina1234
--   mesero@restaurant.com     / mesero1234
--   super@restaurant.com      / super1234
-- ============================================================