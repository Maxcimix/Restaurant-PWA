-- Insertar roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador del sistema'),
  ('cashier', 'Cajero - gestión de pagos'),
  ('waiter', 'Mesero - toma de órdenes'),
  ('kitchen', 'Cocinero - preparación de platillos'),
  ('customer', 'Cliente - realiza pedidos');

-- Insertar tablas
INSERT INTO tables (number, capacity, section, qr_code) VALUES
  (1, 2, 'main', 'QR-001'),
  (2, 4, 'main', 'QR-002'),
  (3, 6, 'patio', 'QR-003'),
  (4, 2, 'bar', 'QR-004');

-- Categorías de menú de ejemplo
INSERT INTO menu_categories (name, description, position, is_active) VALUES
  ('Entradas',    'Para empezar con buen pie',         1, true),
  ('Principales', 'Platos fuertes del chef',           2, true),
  ('Bebidas',     'Refrescantes opciones para tomar',  3, true),
  ('Postres',     'El toque dulce final',              4, true)
ON CONFLICT DO NOTHING;

-- Insertar Ususarios
INSERT INTO users (email, password_hash, first_name, last_name, role_id) VALUES
  ('caja@restaurant.com',   '$2b$10$...', 'Ana',    'Caja',   2),
  ('cocina@restaurant.com', '$2b$10$...', 'Pedro',  'Chef',   3),
  ('mesero@restaurant.com', '$2b$10$...', 'Carlos', 'Mesa',   4),
  ('admin@restaurant.com',  '$2b$10$...', 'Super',  'Admin',  1);