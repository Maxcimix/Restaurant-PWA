-- ============================================================
-- backend/database/schema.sql  —  Versión consolidada final
-- Incluye todas las tablas de F1 → F11
-- Sin necesidad de 004_inventory.sql, 005_shift_f10.sql,
-- ni 011_restaurant_config.sql por separado.
-- ============================================================

-- ── Secuencia para order_number único y atómico ──────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ── Roles ────────────────────────────────────────────────────
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Usuarios ─────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  phone         VARCHAR(20),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── Mesas ────────────────────────────────────────────────────
CREATE TABLE tables (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number     INTEGER NOT NULL UNIQUE,
  capacity   INTEGER NOT NULL,
  section    VARCHAR(50),
  status     VARCHAR(20) DEFAULT 'available'
               CHECK (status IN ('available','occupied','reserved','waiting_bill')),
  qr_code    TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Categorías de menú ───────────────────────────────────────
CREATE TABLE menu_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL UNIQUE,
  description  TEXT,
  icon         VARCHAR(255),
  image_url    TEXT,
  position     INTEGER,
  is_active    BOOLEAN DEFAULT TRUE,
  skip_kitchen BOOLEAN DEFAULT FALSE,   -- F10/F11: bypass cocina
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ── Items del menú ───────────────────────────────────────────
CREATE TABLE menu_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID NOT NULL REFERENCES menu_categories(id),
  name             VARCHAR(100) NOT NULL UNIQUE,
  description      TEXT,
  image_url        TEXT,
  price            DECIMAL(10,2) NOT NULL,
  preparation_time INTEGER,
  is_available     BOOLEAN DEFAULT TRUE,
  is_out_of_stock  BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

-- ── Órdenes ──────────────────────────────────────────────────
CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number       VARCHAR(10) UNIQUE NOT NULL,
  table_id           UUID REFERENCES tables(id) ON DELETE SET NULL,
  customer_id        UUID REFERENCES users(id),
  waiter_id          UUID REFERENCES users(id),
  cashier_id         UUID REFERENCES users(id),
  subtotal           DECIMAL(10,2) NOT NULL,
  tax                DECIMAL(10,2),
  discount           DECIMAL(10,2),
  tip                DECIMAL(10,2) DEFAULT 0,
  total              DECIMAL(10,2) NOT NULL,
  status             VARCHAR(30) DEFAULT 'pending_payment',
  payment_method     VARCHAR(20),
  payment_status     VARCHAR(20) DEFAULT 'pending',
  payment_reference  VARCHAR(255),
  source             VARCHAR(20) CHECK (source IN ('autoservicio','waiter','kiosk')),
  notes              TEXT,
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW(),
  validated_at       TIMESTAMP,
  sent_to_kitchen_at TIMESTAMP,
  ready_at           TIMESTAMP,
  delivered_at       TIMESTAMP,
  completed_at       TIMESTAMP
);

-- ── Items de orden ───────────────────────────────────────────
CREATE TABLE order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id         UUID NOT NULL REFERENCES menu_items(id),
  quantity             INTEGER NOT NULL,
  price                DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  status               VARCHAR(20) DEFAULT 'pending',
  delivered_at         TIMESTAMP,   -- F7: marcar ítem entregado
  created_at           TIMESTAMP DEFAULT NOW()
);

-- ── Pagos ────────────────────────────────────────────────────
CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id),
  amount       DECIMAL(10,2) NOT NULL,
  method       VARCHAR(20) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  reference    VARCHAR(255),
  processed_at TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ── Audit log ────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   VARCHAR(255),
  timestamp     TIMESTAMP DEFAULT NOW()
);

-- ── Tiempos de orden (métricas) ──────────────────────────────
CREATE TABLE IF NOT EXISTS order_timings (
  id                   SERIAL PRIMARY KEY,
  order_id             UUID REFERENCES orders(id),
  time_to_kitchen_secs INTEGER,
  time_to_ready_secs   INTEGER,
  time_total_secs      INTEGER,
  created_at           TIMESTAMP DEFAULT NOW()
);

-- ── Settings (configuración clave-valor) ─────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ── F9: Proveedores ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150) NOT NULL UNIQUE,
  contact_name VARCHAR(100),
  phone        VARCHAR(30),
  email        VARCHAR(255),
  address      TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- ── F9: Ingredientes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(150) NOT NULL UNIQUE,
  unit           VARCHAR(30)  NOT NULL,
  stock_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock      DECIMAL(12,3) NOT NULL DEFAULT 0,
  cost_per_unit  DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier_id    UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

-- ── F9: Recetas ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id      UUID NOT NULL REFERENCES menu_items(id)  ON DELETE CASCADE,
  ingredient_id     UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_required DECIMAL(12,3) NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE (menu_item_id, ingredient_id)
);

-- ── F9: Retiros de turno ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_withdrawals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_user_id UUID NOT NULL REFERENCES users(id),
  started_at   TIMESTAMP DEFAULT NOW(),
  closed_at    TIMESTAMP,
  status       VARCHAR(20) DEFAULT 'abierto'
                 CHECK (status IN ('abierto','cerrado')),
  notes        TEXT
);

-- ── F9: Detalle de retiros ───────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_withdrawal_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_withdrawal_id UUID NOT NULL REFERENCES shift_withdrawals(id) ON DELETE CASCADE,
  ingredient_id       UUID NOT NULL REFERENCES ingredients(id),
  quantity_withdrawn  DECIMAL(12,3) NOT NULL,
  quantity_remaining  DECIMAL(12,3),
  created_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE (shift_withdrawal_id, ingredient_id)
);

-- ── F9/F10: Movimientos de inventario ────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id       UUID NOT NULL REFERENCES ingredients(id),
  type                VARCHAR(30) NOT NULL
                        CHECK (type IN ('entrada','salida','ajuste','consumo_turno')),
  quantity            DECIMAL(12,3) NOT NULL,
  stock_after         DECIMAL(12,3),
  user_id             UUID REFERENCES users(id),
  shift_withdrawal_id UUID REFERENCES shift_withdrawals(id),
  order_item_id       UUID REFERENCES order_items(id) ON DELETE SET NULL,  -- F10
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ── F11: Configuración global del restaurante ────────────────
CREATE TABLE IF NOT EXISTS restaurant_config (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  restaurant_name  VARCHAR(120)  NOT NULL DEFAULT 'Mi Restaurante',
  logo_url         TEXT,
  primary_color    VARCHAR(7)    NOT NULL DEFAULT '#f97316',
  secondary_color  VARCHAR(7)    NOT NULL DEFAULT '#1c1410',
  accent_color     VARCHAR(7)    NOT NULL DEFAULT '#22c55e',
  operation_mode   VARCHAR(20)   NOT NULL DEFAULT 'ambos'
                     CHECK (operation_mode IN ('autoservicio','mesero','ambos')),
  address          TEXT,
  phone            VARCHAR(30),
  tax_rate         DECIMAL(5,2)  NOT NULL DEFAULT 8.00
                     CHECK (tax_rate >= 0 AND tax_rate <= 100),
  currency         VARCHAR(3)    NOT NULL DEFAULT 'COP',
  timezone         VARCHAR(60)   NOT NULL DEFAULT 'America/Bogota',
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at automático en restaurant_config
CREATE OR REPLACE FUNCTION fn_update_restaurant_config_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restaurant_config_updated_at
  BEFORE UPDATE ON restaurant_config
  FOR EACH ROW EXECUTE FUNCTION fn_update_restaurant_config_ts();

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX idx_orders_table    ON orders(table_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_waiter   ON orders(waiter_id);
CREATE INDEX idx_orders_cashier  ON orders(cashier_id);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_orders_source   ON orders(source);
CREATE INDEX idx_menu_items_cat  ON menu_items(category_id);
CREATE INDEX idx_order_items_ord ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier    ON ingredients(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_active      ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_inv_mov_ingredient      ON inventory_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_type            ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_inv_mov_created         ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inv_mov_withdrawal      ON inventory_movements(shift_withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_order_item      ON inventory_movements(order_item_id);
CREATE INDEX IF NOT EXISTS idx_shift_wd_cook           ON shift_withdrawals(cook_user_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_wd_status         ON shift_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_swi_remaining           ON shift_withdrawal_items(shift_withdrawal_id, quantity_remaining);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingr_item     ON menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingr_ingr     ON menu_item_ingredients(ingredient_id);