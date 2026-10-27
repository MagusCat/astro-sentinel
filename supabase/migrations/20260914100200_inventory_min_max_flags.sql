-- ============================================================================
-- Umbrales de reposición en `products`, estado de stock en `inventory`.
--
-- Separación deliberada de responsabilidades (siguen siendo dos entidades):
--   · products  → POLÍTICA: cuánto quiero tener (min_stock, max_stock) y si el
--                 producto sigue disponible (is_active, is_temporary).
--   · inventory → ESTADO: cuánto hay ahora mismo (current_stock).
--
-- Los flags NO pueden ser columnas generadas: una columna generada en Postgres
-- no puede leer otra tabla, y aquí el umbral y el stock viven en tablas
-- distintas. Se exponen en la vista `vw_inventory_status`, que además aplica la
-- regla de negocio: un producto retirado o temporal NO genera alerta aunque
-- esté en cero.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

-- ── Política de reposición: en el producto ──────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS max_stock integer;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_min_stock_nonnegative;
ALTER TABLE public.products
  ADD CONSTRAINT products_min_stock_nonnegative CHECK (min_stock >= 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_max_stock_gte_min;
ALTER TABLE public.products
  ADD CONSTRAINT products_max_stock_gte_min
  CHECK (max_stock IS NULL OR max_stock >= min_stock);

COMMENT ON COLUMN public.products.min_stock    IS 'Umbral de reposición: por debajo de esto el producto se considera en stock bajo.';
COMMENT ON COLUMN public.products.max_stock    IS 'Techo de reposición (opcional): cuánto se busca tener tras reponer.';
COMMENT ON COLUMN public.products.is_temporary IS 'Producto temporal/estacional: no genera alertas de reposición.';

-- ── Vista de estado ─────────────────────────────────────────────────────────
-- `vw_inventory_status` la crea 20260918090000: lee products.category_id, que
-- no existe hasta 20260914100300, así que crearla aquí rompía una BD vacía.
