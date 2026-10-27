-- ============================================================================
-- Categoría de producto pasa de texto suelto a tabla.
--
-- Se crea product_categories, se backfillean las categorías existentes y se
-- añade products.category_id (FK). La columna de texto products.category se
-- MANTIENE (deprecada) para no romper el código actual; migrar el código a
-- category_id es un follow-up (ver notas de la migración en el README).
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill: una fila por categoría distinta existente.
INSERT INTO public.product_categories (name)
SELECT DISTINCT trim(category)
  FROM public.products
 WHERE category IS NOT NULL AND trim(category) <> ''
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.product_categories(id);

-- Enlazar productos existentes a su categoría (case-insensitive).
UPDATE public.products p
   SET category_id = pc.id
  FROM public.product_categories pc
 WHERE p.category_id IS NULL
   AND p.category IS NOT NULL
   AND lower(trim(p.category)) = lower(pc.name);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);

COMMENT ON COLUMN public.products.category IS 'DEPRECADO: usar category_id. Se mantiene por compatibilidad hasta migrar el código.';

-- RLS deny-all + acceso solo service role.
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_categories FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO service_role;
