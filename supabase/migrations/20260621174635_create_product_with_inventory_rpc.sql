-- QUERY-04: Atomic createProduct via RPC
CREATE OR REPLACE FUNCTION public.create_product_with_inventory(
  p_name TEXT,
  p_description TEXT,
  p_price NUMERIC,
  p_sku TEXT,
  p_category TEXT,
  p_initial_stock INTEGER,
  p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1. Create the product
  INSERT INTO public.products (name, description, price, sku, category)
  VALUES (p_name, p_description, p_price, p_sku, p_category)
  RETURNING id INTO v_product_id;

  -- 2. Initialize inventory
  INSERT INTO public.inventory (product_id, current_stock)
  VALUES (v_product_id, p_initial_stock);

  -- 3. Record initial movement
  INSERT INTO public.inventory_movements (
    product_id, user_id, movement_type, quantity, previous_stock, new_stock
  ) VALUES (
    v_product_id, p_user_id, 'INITIAL', p_initial_stock, 0, p_initial_stock
  );

  RETURN v_product_id;
END;
$$;

-- Only authenticated users can call this
REVOKE EXECUTE ON FUNCTION public.create_product_with_inventory FROM anon;
