-- SEC-01: Revoke anonymous access to critical RPCs
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(UUID, UUID, INTEGER, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_product_checkout(UUID, UUID, TEXT, NUMERIC, JSONB) FROM anon;

-- SEC-01: Rebuild adjust_product_stock with auth guard
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id UUID,
  p_user_id UUID,
  p_quantity INTEGER,
  p_type TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_stock INTEGER;
  v_new_stock INTEGER;
  v_movement_qty INTEGER;
BEGIN
  -- Auth guard: reject unauthenticated callers
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock the inventory row to serialize concurrent access
  SELECT current_stock INTO v_previous_stock
  FROM public.inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  -- Calculate new stock based on adjustment type
  IF p_type = 'ADD' THEN
    v_new_stock := v_previous_stock + p_quantity;
    v_movement_qty := p_quantity;
  ELSIF p_type = 'SET' THEN
    v_new_stock := p_quantity;
    v_movement_qty := v_new_stock - v_previous_stock;
  ELSE
    RAISE EXCEPTION 'Tipo de ajuste no soportado';
  END IF;

  -- 1. Update the actual inventory
  UPDATE public.inventory
  SET current_stock = v_new_stock,
      last_updated = NOW()
  WHERE product_id = p_product_id;

  -- 2. Record the movement for audit
  INSERT INTO public.inventory_movements (
    product_id,
    user_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock
  ) VALUES (
    p_product_id,
    p_user_id,
    p_type,
    v_movement_qty,
    v_previous_stock,
    v_new_stock
  );

  RETURN v_new_stock;
END;
$$;

-- SEC-01: Rebuild process_product_checkout with auth guard
CREATE OR REPLACE FUNCTION public.process_product_checkout(
  p_client_id UUID,
  p_user_id UUID,
  p_payment_method TEXT,
  p_total_amount NUMERIC,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_item RECORD;
  v_current_stock INTEGER;
BEGIN
  -- Auth guard: reject unauthenticated callers
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. Create Payment record
  INSERT INTO public.payments (client_id, user_id, total_amount, payment_method, category, metadata, processed_by)
  VALUES (p_client_id, p_user_id, p_total_amount, p_payment_method, 'PRODUCT', p_items, p_user_id)
  RETURNING id INTO v_payment_id;

  -- 2. Update Inventory for each item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER)
  LOOP
    -- Lock row + verify stock
    SELECT current_stock INTO v_current_stock
    FROM public.inventory
    WHERE product_id = v_item.product_id
    FOR UPDATE;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %', v_item.product_id;
    END IF;

    UPDATE public.inventory
    SET current_stock = current_stock - v_item.quantity,
        last_updated = NOW()
    WHERE product_id = v_item.product_id;

    -- Record inventory movement
    INSERT INTO public.inventory_movements (
        product_id,
        user_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock
    ) VALUES (
        v_item.product_id,
        p_user_id,
        'SALE',
        -v_item.quantity,
        v_current_stock,
        v_current_stock - v_item.quantity
    );
  END LOOP;

  RETURN v_payment_id;
END;
$$;

-- SEC-02: Lock down inventory_movements INSERT to SECURITY DEFINER RPCs only
-- Drop the overly permissive existing policy
DROP POLICY IF EXISTS "Permitir insertar movimientos a administradores" ON public.inventory_movements;

-- Create restrictive replacement: direct inserts blocked for all roles.
-- Inserts only happen via SECURITY DEFINER functions which run as postgres.
CREATE POLICY "inventory_movements_insert_via_rpc_only"
ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (false);
