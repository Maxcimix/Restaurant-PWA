-- ============================================================
-- backend/database/011_restaurant_config.sql  —  Fase 11
--
-- Ejecutar UNA SOLA VEZ:
--   docker cp backend/database/011_restaurant_config.sql restaurant_postgres:/tmp/
--   docker exec -it restaurant_postgres psql -U postgres -d restaurant_pwa -f /tmp/011_restaurant_config.sql
-- ============================================================

BEGIN;

-- ── 1. Tabla de configuración global del restaurante ─────────
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

-- Fila única inicial (id=1 siempre)
INSERT INTO restaurant_config (id)
SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM restaurant_config WHERE id = 1);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION fn_update_restaurant_config_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurant_config_updated_at ON restaurant_config;
CREATE TRIGGER trg_restaurant_config_updated_at
  BEFORE UPDATE ON restaurant_config
  FOR EACH ROW EXECUTE FUNCTION fn_update_restaurant_config_ts();

-- ── 2. Rol superusuario (tabla roles, no enum) ───────────────
INSERT INTO roles (name, description)
VALUES ('superusuario', 'Propietario: configuración global del negocio')
ON CONFLICT (name) DO NOTHING;

-- ── 3. Usuario superusuario inicial ──────────────────────────
-- Contraseña: super1234
-- Hash bcrypt generado con bcrypt.hashSync('super1234', 10)
INSERT INTO users (email, password_hash, role_id, first_name, last_name, is_active)
SELECT
  'super@restaurant.com',
  '$2b$10$Nr/BBgIVtM878NzU1HhkduAzo3P1xo..Uho0ruJQJiwQtyZufBHmO',
  (SELECT id FROM roles WHERE name = 'superusuario'),
  'Super', 'Admin',
  true
ON CONFLICT (email) DO NOTHING;

-- ── 4. Migrar operation_mode del .env a la BD ────────────────
-- Si ya tienes un valor en .env, actualiza aquí:
-- UPDATE restaurant_config SET operation_mode = 'ambos' WHERE id = 1;

COMMIT;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE 'Migración 011 aplicada. Superusuario: super@restaurante.com / super1234';
  RAISE NOTICE 'IMPORTANTE: Cambiar la contraseña del superusuario antes de producción.';
END $$;