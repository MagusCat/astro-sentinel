-- ============================================================================
-- Limpieza de esquema acordada en la revisión de diseño:
--   1. payments.payment_method  text+libre  → enum payment_method_type
--   2. payments.category        text+CHECK  → enum payment_category
--   3. clients.registration_source          → eliminada
--   4. product_categories                   → subcategorías (parent_id)
--   5. products.category (texto duplicado)  → eliminada; solo category_id
--
-- Va acoplada al despliegue del código que deja de leer registration_source y
-- products.category.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

-- ── 0. Datos que no encajarían en los enums: abortar con un mensaje claro ────
DO $$
DECLARE v text;
BEGIN
  SELECT string_agg(DISTINCT payment_method, ', ') INTO v
    FROM public.payments
   WHERE payment_method NOT IN ('efectivo', 'tarjeta', 'transferencia');
  IF v IS NOT NULL THEN
    RAISE EXCEPTION 'payments.payment_method tiene valores fuera del enum: %. Corrígelos antes de aplicar.', v;
  END IF;
END $$;

-- ── 1. Vistas que dependen de las columnas que cambian ──────────────────────
DROP VIEW IF EXISTS public.vw_daily_revenue;
DROP VIEW IF EXISTS public.vw_payments_extended;
DROP VIEW IF EXISTS public.vw_client_status;

-- ── 2. Enums de pagos ───────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regtype('public.payment_method_type') IS NULL THEN
    CREATE TYPE public.payment_method_type AS ENUM ('efectivo', 'tarjeta', 'transferencia');
  END IF;
  IF to_regtype('public.payment_category') IS NULL THEN
    CREATE TYPE public.payment_category AS ENUM ('MEMBERSHIP', 'PRODUCT');
  END IF;
END $$;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_category_check;

ALTER TABLE public.payments
  ALTER COLUMN payment_method TYPE public.payment_method_type
  USING payment_method::public.payment_method_type;

ALTER TABLE public.payments
  ALTER COLUMN category TYPE public.payment_category
  USING category::public.payment_category;

-- Los RPC reciben el método como parámetro text y lo insertan tal cual. Un cast
-- de asignación text → enum los mantiene funcionando sin recrearlos; un valor
-- fuera del enum sigue fallando.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_cast
                  WHERE castsource = 'text'::regtype
                    AND casttarget = 'public.payment_method_type'::regtype) THEN
    CREATE CAST (text AS public.payment_method_type) WITH INOUT AS ASSIGNMENT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_cast
                  WHERE castsource = 'text'::regtype
                    AND casttarget = 'public.payment_category'::regtype) THEN
    CREATE CAST (text AS public.payment_category) WITH INOUT AS ASSIGNMENT;
  END IF;
END $$;

-- ── 3. clients.registration_source ──────────────────────────────────────────
ALTER TABLE public.clients DROP COLUMN IF EXISTS registration_source;

-- ── 4. Subcategorías ────────────────────────────────────────────────────────
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid
  REFERENCES public.product_categories(id) ON DELETE RESTRICT;

-- El nombre es único entre hermanos, no global ("Accesorios" puede existir bajo
-- dos padres). NULLS NOT DISTINCT: dos raíces tampoco pueden llamarse igual.
ALTER TABLE public.product_categories DROP CONSTRAINT IF EXISTS product_categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_categories_parent_name
  ON public.product_categories (parent_id, lower(name)) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id
  ON public.product_categories (parent_id);

ALTER TABLE public.product_categories DROP CONSTRAINT IF EXISTS product_categories_not_own_parent;
ALTER TABLE public.product_categories
  ADD CONSTRAINT product_categories_not_own_parent CHECK (parent_id IS DISTINCT FROM id);

CREATE OR REPLACE FUNCTION public.product_categories_prevent_cycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_id FROM product_categories WHERE id = NEW.parent_id
      UNION
      SELECT c.id, c.parent_id
        FROM product_categories c
        JOIN ancestors a ON c.id = a.parent_id
    )
    SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'La categoría no puede colgar de una de sus subcategorías';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_categories_prevent_cycle ON public.product_categories;
CREATE TRIGGER trg_product_categories_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.product_categories_prevent_cycle();

REVOKE ALL ON FUNCTION public.product_categories_prevent_cycle() FROM PUBLIC, anon, authenticated;

-- ── 5. products.category → solo category_id ─────────────────────────────────
-- Resuelve un nombre de categoría raíz a su id, creándola si no existe.
CREATE OR REPLACE FUNCTION public.resolve_product_category(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := nullif(trim(p_name), '');
  v_id   uuid;
BEGIN
  IF v_name IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO product_categories (name)
  VALUES (v_name)
  ON CONFLICT (parent_id, lower(name)) DO NOTHING;

  SELECT id INTO v_id
    FROM product_categories
   WHERE parent_id IS NULL AND lower(name) = lower(v_name);

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_product_category(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_product_category(text) TO service_role;

-- Última pasada de enlace antes de borrar el texto.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category') THEN
    EXECUTE $q$
      UPDATE public.products
         SET category_id = public.resolve_product_category(category)
       WHERE category_id IS NULL
         AND nullif(trim(category), '') IS NOT NULL
    $q$;
  END IF;
END $$;

ALTER TABLE public.products DROP COLUMN IF EXISTS category;

-- Misma firma que antes (el código no cambia la llamada); p_category es ahora
-- el NOMBRE de la categoría y se resuelve a category_id.
CREATE OR REPLACE FUNCTION public.create_product_with_inventory(
  p_name text, p_description text, p_price numeric, p_sku text,
  p_category text, p_initial_stock integer, p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  INSERT INTO products (name, description, price, sku, category_id)
  VALUES (p_name, p_description, p_price, p_sku, resolve_product_category(p_category))
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, current_stock)
  VALUES (v_product_id, p_initial_stock);

  INSERT INTO inventory_movements (product_id, user_id, movement_type, quantity, previous_stock, new_stock)
  VALUES (v_product_id, p_user_id, 'INITIAL', p_initial_stock, 0, p_initial_stock);

  RETURN v_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_product_with_inventory(text, text, numeric, text, text, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_with_inventory(text, text, numeric, text, text, integer, uuid) TO service_role;

-- ── 6. Recrear las vistas ───────────────────────────────────────────────────
CREATE VIEW public.vw_client_status WITH (security_invoker = on) AS
  SELECT DISTINCT ON (c.id)
    c.id,
    c.full_name,
    c.email,
    c.phone_number,
    c.is_active,
    c.created_at,
    m.id IS NOT NULL AS has_active_membership,
    m.status         AS current_membership_status,
    p.plan_name      AS current_plan_name,
    cls.name         AS current_class_name
  FROM clients c
  LEFT JOIN memberships m ON c.id = m.client_id AND m.status IN ('active', 'frozen')
  LEFT JOIN class_plans p ON m.class_plan_id = p.id
  LEFT JOIN classes cls   ON p.class_id = cls.id
  WHERE c.is_active = true
  ORDER BY c.id,
    CASE m.status WHEN 'active' THEN 1 WHEN 'frozen' THEN 2 ELSE 3 END,
    m.end_date DESC NULLS LAST;

CREATE VIEW public.vw_daily_revenue WITH (security_invoker = on) AS
  SELECT
    date(p.transaction_date) AS payment_date,
    p.payment_method,
    u.full_name              AS user_name,
    count(p.id)              AS total_transactions,
    sum(p.total_amount)      AS total_revenue
  FROM payments p
  LEFT JOIN users u ON p.user_id = u.id
  WHERE u.is_active = true
  GROUP BY date(p.transaction_date), p.payment_method, u.full_name
  ORDER BY date(p.transaction_date) DESC;

CREATE VIEW public.vw_payments_extended WITH (security_invoker = on) AS
  SELECT DISTINCT ON (c.id)
    p.id,
    p.client_id,
    c.full_name AS client_name,
    c.email     AS client_email,
    p.user_id,
    u.full_name AS user_name,
    u.role      AS user_role,
    p.total_amount,
    p.payment_method,
    p.transaction_date,
    m.class_plan_id
  FROM payments p
  JOIN clients c     ON p.client_id = c.id
  JOIN memberships m ON p.id = m.payment_id
  LEFT JOIN users u  ON p.user_id = u.id;

REVOKE ALL ON public.vw_client_status, public.vw_daily_revenue, public.vw_payments_extended FROM anon, authenticated;
GRANT SELECT ON public.vw_client_status, public.vw_daily_revenue, public.vw_payments_extended TO service_role;
