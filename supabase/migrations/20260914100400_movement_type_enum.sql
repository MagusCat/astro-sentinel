-- ============================================================================
-- inventory_movements.movement_type: text + CHECK → enum.
--
-- Crea el tipo enum, retira el CHECK equivalente y convierte la columna. Solo
-- adjust_product_stock inserta el tipo desde una VARIABLE (p_type), así que hay
-- que castearla al enum; el resto de RPC insertan literales ('SALE','INITIAL')
-- que Postgres coacciona solo.
--
-- Se aplica DESPUÉS de 20260914090200 (que dejó adjust_product_stock en su
-- versión service-role); aquí se re-crea con el cast al enum.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
    CREATE TYPE public.inventory_movement_type AS ENUM ('ADD', 'SET', 'SALE', 'INITIAL', 'RETURN');
  END IF;
END $$;

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE public.inventory_movements
  ALTER COLUMN movement_type TYPE public.inventory_movement_type
  USING movement_type::public.inventory_movement_type;

-- Recrear adjust_product_stock con el cast de p_type al enum.
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
  VALUES (p_product_id, p_user_id, p_type::public.inventory_movement_type, v_movement_qty, v_previous_stock, v_new_stock);

  RETURN v_new_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_product_stock(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, uuid, integer, text) TO service_role;
