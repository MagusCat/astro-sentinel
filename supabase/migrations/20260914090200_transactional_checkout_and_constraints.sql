-- ============================================================================
-- FASE 3 — Integridad del dinero.
--
-- • process_membership_checkout: cobro de membresía atómico; precio y duración
--   se leen de class_plans (el cliente ya no dicta el importe).
-- • process_product_checkout: total calculado desde products.price.
-- • Se retira el guard `auth.uid() IS NULL` de las RPC de productos, porque a
--   partir de la Fase 2 la app llama con el service role (auth.uid() = NULL).
--   La autorización pasa a los GRANT (solo service_role) + el guard del server
--   action. POR ELLO ESTA MIGRACIÓN SE APLICA JUNTO CON EL DESPLIEGUE DE CÓDIGO.
-- • CHECK constraints de integridad (NOT VALID: aplican a filas nuevas; hay
--   datos de prueba con importe 0 que habría que limpiar antes de VALIDATE).
-- ============================================================================

-- ── Cobro de membresía transaccional ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_membership_checkout(
  p_client_id uuid,
  p_class_plan_id uuid,
  p_user_id uuid,
  p_payment_method text
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
  v_payment_id uuid;
  v_membership_id uuid;
BEGIN
  IF p_payment_method NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'El método de pago seleccionado no es válido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND is_active) THEN
    RAISE EXCEPTION 'Operador no válido.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND is_active) THEN
    RAISE EXCEPTION 'El cliente seleccionado no existe en el sistema.';
  END IF;

  -- Precio y duración SIEMPRE desde la base de datos.
  SELECT id, class_id, price, duration_days
  INTO v_plan
  FROM class_plans
  WHERE id = p_class_plan_id AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El plan seleccionado no está disponible.';
  END IF;

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

  INSERT INTO payments (client_id, user_id, processed_by, total_amount, payment_method, category)
  VALUES (p_client_id, p_user_id, p_user_id, v_plan.price, p_payment_method, 'MEMBERSHIP')
  RETURNING id INTO v_payment_id;

  INSERT INTO memberships (payment_id, client_id, class_plan_id, amount_paid, start_date, end_date, status)
  VALUES (v_payment_id, p_client_id, p_class_plan_id, v_plan.price, v_start_date, v_end_date, 'active')
  RETURNING id INTO v_membership_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'membership_id', v_membership_id,
    'start_date', v_start_date,
    'end_date', v_end_date,
    'amount_charged', v_plan.price
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_membership_checkout(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_membership_checkout(uuid, uuid, uuid, text) TO service_role;

-- ── Venta de productos: total desde products.price ──────────────────────────
-- Cambia la firma (se elimina p_total_amount y el price por ítem), por eso se
-- hace DROP + CREATE en vez de CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.process_product_checkout(uuid, uuid, text, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.process_product_checkout(
  p_client_id uuid,
  p_user_id uuid,
  p_payment_method text,
  p_items jsonb
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
  v_meta jsonb := '[]'::jsonb;
BEGIN
  IF p_payment_method NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'El método de pago seleccionado no es válido.';
  END IF;

  IF p_client_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id AND is_active) THEN
    RAISE EXCEPTION 'El cliente seleccionado no existe en el sistema.';
  END IF;

  -- Primera pasada: precio real desde products, bloqueo de stock y validación.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida para el producto %', v_item.product_id;
    END IF;

    SELECT p.name, p.price, i.current_stock
    INTO v_product
    FROM products p
    JOIN inventory i ON i.product_id = p.id
    WHERE p.id = v_item.product_id AND p.is_active
    FOR UPDATE OF i;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no disponible: %', v_item.product_id;
    END IF;

    IF v_product.current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %', v_item.product_id;
    END IF;

    v_total := v_total + (v_product.price * v_item.quantity);
    v_meta := v_meta || jsonb_build_object(
      'product_id', v_item.product_id,
      'product_name', v_product.name,
      'quantity', v_item.quantity,
      'price', v_product.price
    );
  END LOOP;

  IF jsonb_array_length(v_meta) = 0 THEN
    RAISE EXCEPTION 'La venta no incluye productos.';
  END IF;

  INSERT INTO payments (client_id, user_id, total_amount, payment_method, category, metadata, processed_by)
  VALUES (p_client_id, p_user_id, v_total, p_payment_method, 'PRODUCT', v_meta, p_user_id)
  RETURNING id INTO v_payment_id;

  -- Segunda pasada: descuenta stock y registra el movimiento.
  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
  LOOP
    UPDATE inventory
    SET current_stock = current_stock - v_item.quantity,
        last_updated = now()
    WHERE product_id = v_item.product_id
    RETURNING current_stock INTO v_product;

    INSERT INTO inventory_movements (product_id, user_id, movement_type, quantity, previous_stock, new_stock)
    VALUES (
      v_item.product_id, p_user_id, 'SALE', -v_item.quantity,
      v_product.current_stock + v_item.quantity, v_product.current_stock
    );
  END LOOP;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.process_product_checkout(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_product_checkout(uuid, uuid, text, jsonb) TO service_role;

-- ── Retirar el guard auth.uid() de las otras dos RPC de productos ────────────
-- (se ejecutan ahora con el service role → auth.uid() es NULL).
CREATE OR REPLACE FUNCTION public.adjust_product_stock(p_product_id uuid, p_user_id uuid, p_quantity integer, p_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous_stock INTEGER;
  v_new_stock INTEGER;
  v_movement_qty INTEGER;
BEGIN
  SELECT current_stock INTO v_previous_stock
  FROM public.inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF p_type = 'ADD' THEN
    v_new_stock := v_previous_stock + p_quantity;
    v_movement_qty := p_quantity;
  ELSIF p_type = 'SET' THEN
    v_new_stock := p_quantity;
    v_movement_qty := v_new_stock - v_previous_stock;
  ELSE
    RAISE EXCEPTION 'Tipo de ajuste no soportado';
  END IF;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'El stock no puede quedar negativo.';
  END IF;

  UPDATE public.inventory
  SET current_stock = v_new_stock, last_updated = NOW()
  WHERE product_id = p_product_id;

  INSERT INTO public.inventory_movements (product_id, user_id, movement_type, quantity, previous_stock, new_stock)
  VALUES (p_product_id, p_user_id, p_type, v_movement_qty, v_previous_stock, v_new_stock);

  RETURN v_new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_product_with_inventory(p_name text, p_description text, p_price numeric, p_sku text, p_category text, p_initial_stock integer, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  INSERT INTO public.products (name, description, price, sku, category)
  VALUES (p_name, p_description, p_price, p_sku, p_category)
  RETURNING id INTO v_product_id;

  INSERT INTO public.inventory (product_id, current_stock)
  VALUES (v_product_id, p_initial_stock);

  INSERT INTO public.inventory_movements (product_id, user_id, movement_type, quantity, previous_stock, new_stock)
  VALUES (v_product_id, p_user_id, 'INITIAL', p_initial_stock, 0, p_initial_stock);

  RETURN v_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_product_stock(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_product_with_inventory(text, text, numeric, text, text, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.freeze_membership(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unfreeze_membership(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_product_with_inventory(text, text, numeric, text, text, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.freeze_membership(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.unfreeze_membership(uuid) TO service_role;

-- ── Restricciones de integridad ─────────────────────────────────────────────
-- NOT VALID: se aplican a filas nuevas. Un importe 0 es legítimo (cortesía,
-- beca, promoción 100%) — lo que nunca es válido es un importe negativo, de ahí
-- `>= 0` en vez de `> 0`. (Si un entorno ya tiene la constraint vieja `> 0` con
-- el nombre `payments_total_amount_positive`, ver 100050_relax_payment_amount_check.)
-- `VALIDATE CONSTRAINT` para exigirlas también a las filas existentes queda
-- pendiente de limpiar datos de prueba primero (ver docs/migrations.md).
ALTER TABLE public.payments    ADD CONSTRAINT payments_total_amount_nonnegative CHECK (total_amount >= 0) NOT VALID;
ALTER TABLE public.inventory   ADD CONSTRAINT inventory_stock_nonnegative      CHECK (current_stock >= 0) NOT VALID;
ALTER TABLE public.memberships ADD CONSTRAINT memberships_dates_ordered        CHECK (end_date >= start_date) NOT VALID;
