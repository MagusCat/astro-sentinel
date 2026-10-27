-- ============================================================================
-- Anulación de pagos, descuentos y cierre de caja.
--
-- • Anular NO borra: memberships.payment_id es ON DELETE CASCADE y la terminal es
--   inmutable. El pago queda marcado (voided_at/by/reason), su membresía se cancela,
--   el stock vendido vuelve como movimiento RETURN, y deja de contar como ingreso.
-- • Descuento: lo decide un admin/maintainer. Lo valida y lo resta SQL (precio de la
--   BD − descuento); queda asentado en payments.discount_amount.
-- • Mensajes para el operador con ERRCODE 'SN400' (ver 20261027090100).
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS discount_amount numeric(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voided_at   timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by   uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS void_reason text;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_discount_nonnegative;
ALTER TABLE public.payments ADD CONSTRAINT payments_discount_nonnegative CHECK (discount_amount >= 0);
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_void_consistent;
ALTER TABLE public.payments ADD CONSTRAINT payments_void_consistent
  CHECK ((voided_at IS NULL) = (voided_by IS NULL) AND (voided_at IS NULL) = (void_reason IS NULL));

CREATE INDEX IF NOT EXISTS idx_payments_not_voided_date
  ON public.payments (transaction_date DESC) WHERE voided_at IS NULL;

-- ── Helper: ¿el operador puede autorizar descuentos/anulaciones? ────────────
CREATE OR REPLACE FUNCTION public.is_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active AND role IN ('admin', 'maintainer'))
$$;

-- ── Cobro de membresía con descuento opcional ───────────────────────────────
-- Cambia la firma (nuevo p_discount), así que se reemplaza la anterior.
DROP FUNCTION IF EXISTS public.process_membership_checkout(uuid, uuid, uuid, text);

CREATE FUNCTION public.process_membership_checkout(
  p_client_id      uuid,
  p_class_plan_id  uuid,
  p_user_id        uuid,
  p_payment_method text,
  p_discount       numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan RECORD;
  v_existing RECORD;
  v_base_end_date date;
  v_start_date date;
  v_end_date date;
  v_discount numeric := COALESCE(p_discount, 0);
  v_total numeric;
  v_payment_id uuid;
  v_membership_id uuid;
BEGIN
  IF p_payment_method NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'El método de pago seleccionado no es válido.' USING ERRCODE = 'SN400';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active) THEN
    RAISE EXCEPTION 'Operador no válido.' USING ERRCODE = 'SN400';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND is_active) THEN
    RAISE EXCEPTION 'El cliente seleccionado no existe en el sistema.' USING ERRCODE = 'SN400';
  END IF;

  -- Precio y duración SIEMPRE desde la base de datos.
  SELECT id, class_id, price, duration_days
  INTO v_plan
  FROM class_plans
  WHERE id = p_class_plan_id AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El plan seleccionado no está disponible.' USING ERRCODE = 'SN400';
  END IF;

  IF v_discount < 0 OR v_discount > v_plan.price THEN
    RAISE EXCEPTION 'El descuento debe estar entre 0 y el precio del plan.' USING ERRCODE = 'SN400';
  END IF;
  IF v_discount > 0 AND NOT is_manager(p_user_id) THEN
    RAISE EXCEPTION 'Solo un administrador puede aplicar descuentos.' USING ERRCODE = 'SN400';
  END IF;
  v_total := v_plan.price - v_discount;

  -- ¿Membresía activa/congelada vigente para la misma disciplina? Se encadena.
  SELECT m.id, m.end_date, m.status
  INTO v_existing
  FROM memberships m
  JOIN class_plans cp ON cp.id = m.class_plan_id
  WHERE m.client_id = p_client_id
    AND cp.class_id IS NOT DISTINCT FROM v_plan.class_id
    AND m.status IN ('active', 'frozen')
    AND m.end_date >= CURRENT_DATE
  ORDER BY m.end_date DESC
  LIMIT 1
  FOR UPDATE OF m;

  IF FOUND THEN
    IF v_existing.status = 'frozen' THEN
      v_base_end_date := unfreeze_membership(v_existing.id);
    ELSE
      v_base_end_date := v_existing.end_date;
    END IF;
  END IF;

  IF v_base_end_date IS NOT NULL THEN
    v_start_date := v_base_end_date + 1;
  ELSE
    v_start_date := CURRENT_DATE;
  END IF;

  v_end_date := v_start_date + v_plan.duration_days;

  INSERT INTO payments (client_id, user_id, processed_by, total_amount, discount_amount, payment_method, category)
  VALUES (p_client_id, p_user_id, p_user_id, v_total, v_discount, p_payment_method, 'MEMBERSHIP')
  RETURNING id INTO v_payment_id;

  INSERT INTO memberships (payment_id, client_id, class_plan_id, amount_paid, start_date, end_date, status)
  VALUES (v_payment_id, p_client_id, p_class_plan_id, v_total, v_start_date, v_end_date, 'active')
  RETURNING id INTO v_membership_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'membership_id', v_membership_id,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'amount_charged', v_total,
    'discount', v_discount
  );
END;
$$;

-- ── Venta de productos con descuento opcional ───────────────────────────────
DROP FUNCTION IF EXISTS public.process_product_checkout(uuid, uuid, text, jsonb);

CREATE FUNCTION public.process_product_checkout(
  p_client_id      uuid,
  p_user_id        uuid,
  p_payment_method text,
  p_items          jsonb,
  p_discount       numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment_id uuid;
  v_item RECORD;
  v_product RECORD;
  v_total numeric := 0;
  v_discount numeric := COALESCE(p_discount, 0);
  v_meta jsonb := '[]'::jsonb;
BEGIN
  IF p_payment_method NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'El método de pago seleccionado no es válido.' USING ERRCODE = 'SN400';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active) THEN
    RAISE EXCEPTION 'Operador no válido.' USING ERRCODE = 'SN400';
  END IF;

  IF p_client_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND is_active) THEN
    RAISE EXCEPTION 'El cliente seleccionado no existe en el sistema.' USING ERRCODE = 'SN400';
  END IF;

  -- Precio real desde products, bloqueo de stock y validación.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida en la venta.' USING ERRCODE = 'SN400';
    END IF;

    SELECT p.name, p.price, i.current_stock
    INTO v_product
    FROM products p
    JOIN inventory i ON i.product_id = p.id
    WHERE p.id = v_item.product_id AND p.is_active
    FOR UPDATE OF i;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Un producto del carrito ya no está disponible.' USING ERRCODE = 'SN400';
    END IF;

    IF v_product.current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente de "%" (quedan %).', v_product.name, v_product.current_stock
        USING ERRCODE = 'SN400';
    END IF;

    v_total := v_total + (v_product.price * v_item.quantity);
    v_meta := v_meta || jsonb_build_object(
      'product_id',   v_item.product_id,
      'product_name', v_product.name,
      'quantity',     v_item.quantity,
      'price',        v_product.price
    );
  END LOOP;

  IF jsonb_array_length(v_meta) = 0 THEN
    RAISE EXCEPTION 'La venta no incluye productos.' USING ERRCODE = 'SN400';
  END IF;

  IF v_discount < 0 OR v_discount > v_total THEN
    RAISE EXCEPTION 'El descuento debe estar entre 0 y el total de la venta.' USING ERRCODE = 'SN400';
  END IF;
  IF v_discount > 0 AND NOT is_manager(p_user_id) THEN
    RAISE EXCEPTION 'Solo un administrador puede aplicar descuentos.' USING ERRCODE = 'SN400';
  END IF;

  INSERT INTO payments (client_id, user_id, total_amount, discount_amount, payment_method, category, metadata, processed_by)
  VALUES (p_client_id, p_user_id, v_total - v_discount, v_discount, p_payment_method, 'PRODUCT', v_meta, p_user_id)
  RETURNING id INTO v_payment_id;

  -- Detalle de la venta como filas reales (a precio de lista; el descuento va en la cabecera).
  INSERT INTO payment_lines (payment_id, product_id, product_name, quantity, unit_price)
  SELECT v_payment_id, x.product_id, x.product_name, x.quantity, x.price
    FROM jsonb_to_recordset(v_meta)
         AS x(product_id uuid, product_name text, quantity integer, price numeric);

  -- Descuenta stock y asienta la salida, ligada al pago.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
  LOOP
    UPDATE inventory
    SET current_stock = current_stock - v_item.quantity,
        last_updated = now()
    WHERE product_id = v_item.product_id
    RETURNING current_stock INTO v_product;

    INSERT INTO inventory_movements (
      product_id, user_id, movement_type, quantity, previous_stock, new_stock, payment_id
    ) VALUES (
      v_item.product_id, p_user_id, 'SALE', -v_item.quantity,
      v_product.current_stock + v_item.quantity, v_product.current_stock, v_payment_id
    );
  END LOOP;

  RETURN v_payment_id;
END;
$$;

-- ── Anular un pago ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.void_payment(p_payment_id uuid, p_user_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment RECORD;
  v_line RECORD;
  v_prev integer;
BEGIN
  IF NOT is_manager(p_user_id) THEN
    RAISE EXCEPTION 'Solo un administrador puede anular pagos.' USING ERRCODE = 'SN400';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Indica el motivo de la anulación (mínimo 5 caracteres).' USING ERRCODE = 'SN400';
  END IF;

  SELECT id, voided_at INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado.' USING ERRCODE = 'SN400';
  END IF;
  IF v_payment.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este pago ya fue anulado.' USING ERRCODE = 'SN400';
  END IF;

  UPDATE memberships SET status = 'cancelled' WHERE payment_id = p_payment_id;

  -- Devuelve al inventario lo vendido, con su movimiento ligado al pago.
  FOR v_line IN SELECT product_id, quantity FROM payment_lines WHERE payment_id = p_payment_id LOOP
    SELECT current_stock INTO v_prev FROM inventory WHERE product_id = v_line.product_id FOR UPDATE;
    IF FOUND THEN
      UPDATE inventory SET current_stock = v_prev + v_line.quantity, last_updated = now()
       WHERE product_id = v_line.product_id;
      INSERT INTO inventory_movements (product_id, user_id, movement_type, quantity, previous_stock, new_stock, payment_id)
      VALUES (v_line.product_id, p_user_id, 'RETURN', v_line.quantity, v_prev, v_prev + v_line.quantity, p_payment_id);
    END IF;
  END LOOP;

  UPDATE payments
     SET voided_at = now(), voided_by = p_user_id, void_reason = trim(p_reason)
   WHERE id = p_payment_id;
END;
$$;

-- ── Cierre de caja / resumen de un rango de días ────────────────────────────
-- Todo el dinero se suma aquí en SQL (amount_base = moneda base).
CREATE OR REPLACE FUNCTION public.cash_closing(p_from date, p_to date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH ps AS (
    SELECT p.*, u.full_name AS user_name, c.full_name AS client_name, vu.full_name AS voided_by_name
      FROM payments p
      LEFT JOIN users u ON u.id = p.processed_by
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN users vu ON vu.id = p.voided_by
     WHERE date(p.transaction_date) BETWEEN p_from AND p_to
  ), ok AS (
    SELECT * FROM ps WHERE voided_at IS NULL
  )
  SELECT jsonb_build_object(
    'net',       (SELECT COALESCE(sum(amount_base), 0) FROM ok),
    'discounts', (SELECT COALESCE(sum(round(discount_amount * exchange_rate, 4)), 0) FROM ok),
    'count',     (SELECT count(*) FROM ok),
    'by_method', COALESCE((SELECT jsonb_agg(x ORDER BY x.total DESC) FROM (
                   SELECT payment_method::text AS label, sum(amount_base) AS total, count(*) AS count
                     FROM ok GROUP BY payment_method) x), '[]'::jsonb),
    'by_staff',  COALESCE((SELECT jsonb_agg(x ORDER BY x.total DESC) FROM (
                   SELECT COALESCE(user_name, 'Sistema') AS label, sum(amount_base) AS total, count(*) AS count
                     FROM ok GROUP BY user_name) x), '[]'::jsonb),
    'by_category', COALESCE((SELECT jsonb_agg(x ORDER BY x.total DESC) FROM (
                   SELECT COALESCE(category::text, 'MEMBERSHIP') AS label, sum(amount_base) AS total, count(*) AS count
                     FROM ok GROUP BY category) x), '[]'::jsonb),
    'voided',    COALESCE((SELECT jsonb_agg(x ORDER BY x.voided_at DESC) FROM (
                   SELECT id, COALESCE(client_name, 'Anónimo') AS client_name, amount_base AS total,
                          void_reason, COALESCE(voided_by_name, 'Sistema') AS voided_by, voided_at
                     FROM ps WHERE voided_at IS NOT NULL) x), '[]'::jsonb),
    'discounted', COALESCE((SELECT jsonb_agg(x ORDER BY x.transaction_date DESC) FROM (
                   SELECT id, COALESCE(client_name, 'Anónimo') AS client_name, amount_base AS total,
                          round(discount_amount * exchange_rate, 4) AS discount,
                          COALESCE(user_name, 'Sistema') AS user_name, transaction_date
                     FROM ok WHERE discount_amount > 0) x), '[]'::jsonb)
  )
$$;

-- ── Las vistas de ingresos dejan de contar lo anulado ───────────────────────
CREATE OR REPLACE VIEW public.vw_daily_revenue WITH (security_invoker = on) AS
SELECT date(p.transaction_date) AS payment_date,
       p.payment_method,
       u.full_name AS user_name,
       count(p.id) AS total_transactions,
       sum(p.total_amount) AS total_revenue
  FROM payments p
  LEFT JOIN users u ON p.user_id = u.id
 WHERE u.is_active = true AND p.voided_at IS NULL
 GROUP BY (date(p.transaction_date)), p.payment_method, u.full_name
 ORDER BY (date(p.transaction_date)) DESC;

CREATE OR REPLACE VIEW public.vw_dashboard_stats WITH (security_invoker = on) AS
SELECT (SELECT count(*) FROM vw_active_memberships) AS active_memberships_count,
       (SELECT count(*) FROM classes WHERE classes.is_active = true) AS total_classes_count,
       (SELECT count(*) FROM clients WHERE clients.is_active = true) AS total_clients_count,
       (SELECT COALESCE(sum(payments.total_amount), 0::numeric)
          FROM payments
         WHERE date(payments.transaction_date) = CURRENT_DATE AND payments.voided_at IS NULL) AS daily_revenue;

CREATE OR REPLACE VIEW public.vw_payments_extended WITH (security_invoker = on) AS
SELECT DISTINCT ON (c.id) p.id,
       p.client_id,
       c.full_name AS client_name,
       c.email AS client_email,
       p.user_id,
       u.full_name AS user_name,
       u.role AS user_role,
       p.total_amount,
       p.payment_method,
       p.transaction_date,
       m.class_plan_id
  FROM payments p
  JOIN clients c ON p.client_id = c.id
  JOIN memberships m ON p.id = m.payment_id
  LEFT JOIN users u ON p.user_id = u.id
 WHERE p.voided_at IS NULL;

-- ── Permisos: solo service_role ─────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.is_manager(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_membership_checkout(uuid, uuid, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_product_checkout(uuid, uuid, text, jsonb, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_payment(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cash_closing(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_membership_checkout(uuid, uuid, uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_product_checkout(uuid, uuid, text, jsonb, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_payment(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cash_closing(date, date) TO service_role;
