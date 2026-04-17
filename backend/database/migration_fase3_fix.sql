-- ============================================================
-- backend/database/migration_fase3_fix.sql
--
-- Aplica solo si ya tienes la BD corriendo y no quieres
-- recrear el contenedor Docker.
--
-- Uso:
--   docker exec -it restaurant_postgres psql \
--     -U postgres -d restaurant_pwa \
--     -f /docker-entrypoint-initdb.d/migration_fase3_fix.sql
--
-- O manualmente:
--   docker exec -it restaurant_postgres psql -U postgres -d restaurant_pwa
--   \i migration_fase3_fix.sql
-- ============================================================

-- 1. Permitir NULL en table_id (autoservicio no tiene mesa)
ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL;

-- 2. Cambiar ON DELETE behavior a SET NULL
--    (si se borra una mesa, la orden histórica queda con table_id = NULL)
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_table_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_table_id_fkey
  FOREIGN KEY (table_id)
  REFERENCES tables(id)
  ON DELETE SET NULL;

-- 3. Agregar updated_at si no existe
--    (requerido por PATCH /api/orders/:id/status)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 4. Actualizar CHECK de source con valor correcto 'autoservicio'
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_source_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_source_check
  CHECK (source IN ('autoservicio', 'waiter', 'kiosk'));

-- 5. Actualizar registros existentes que usen 'app' como source
UPDATE orders
  SET source = 'autoservicio'
  WHERE source = 'app';

-- 6. Índice para source (útil en dashboards de caja/cocina)
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

-- Verificar resultado
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('table_id', 'source', 'updated_at')
ORDER BY column_name;