-- ============================================================================
-- Mueve los umbrales de reposición de `inventory` a `products`.
--
-- `products` e `inventory` siguen siendo dos entidades separadas: la política
-- (cuánto quiero tener, y si el producto sigue disponible) pertenece al
-- producto; el estado (cuánto hay) al inventario.
--
-- Esta migración solo hace trabajo real en entornos donde se aplicó la versión
-- ANTIGUA de 100200 (la que puso min_stock/max_stock y los flags generados en
-- `inventory`). En un entorno con la versión corregida es todo no-op.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

-- ── 1. Política en products (por si 100200 corregida aún no corrió) ─────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock    integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_stock    integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false;

-- ── 2. Rescatar los umbrales que vivían en inventory ────────────────────────
-- Solo pisa productos que todavía no tienen política propia definida.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'min_stock'
  ) THEN
    EXECUTE $q$
      UPDATE public.products p
         SET min_stock = COALESCE(i.min_stock, p.min_stock),
             max_stock = COALESCE(i.max_stock, p.max_stock)
        FROM public.inventory i
       WHERE i.product_id = p.id
         AND p.min_stock = 0
         AND p.max_stock IS NULL
    $q$;
  END IF;
END $$;

-- ── 3. Retirar estado derivado y umbrales de inventory ──────────────────────
-- DROP COLUMN se lleva por delante el índice parcial que dependía del flag.
DROP INDEX IF EXISTS public.idx_inventory_low_stock;

ALTER TABLE public.inventory DROP COLUMN IF EXISTS is_low_stock;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS is_out_of_stock;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS min_stock;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS max_stock;

-- ── 4. Restricciones de la política ─────────────────────────────────────────
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_min_stock_nonnegative;
ALTER TABLE public.products
  ADD CONSTRAINT products_min_stock_nonnegative CHECK (min_stock >= 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_max_stock_gte_min;
ALTER TABLE public.products
  ADD CONSTRAINT products_max_stock_gte_min
  CHECK (max_stock IS NULL OR max_stock >= min_stock);

-- ── 5. Vista de estado (única fuente de las alertas) ────────────────────────
CREATE OR REPLACE VIEW public.vw_inventory_status
WITH (security_invoker = on) AS
  SELECT
    p.id            AS product_id,
    p.name,
    p.sku,
    p.category_id,
    p.is_active,
    p.is_temporary,
    p.min_stock,
    p.max_stock,
    COALESCE(i.current_stock, 0) AS current_stock,
    i.last_updated,
    COALESCE(i.current_stock, 0) <= 0            AS is_out_of_stock,
    COALESCE(i.current_stock, 0) <= p.min_stock  AS is_low_stock,
    (
      p.is_active
      AND NOT p.is_temporary
      AND COALESCE(i.current_stock, 0) <= p.min_stock
    ) AS needs_restock,
    CASE
      WHEN p.max_stock IS NULL THEN NULL
      ELSE GREATEST(0, p.max_stock - COALESCE(i.current_stock, 0))
    END AS suggested_order_qty
  FROM public.products p
  LEFT JOIN public.inventory i ON i.product_id = p.id;

REVOKE ALL ON public.vw_inventory_status FROM anon, authenticated;
GRANT SELECT ON public.vw_inventory_status TO service_role;
