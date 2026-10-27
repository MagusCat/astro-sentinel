-- ============================================================================
-- Ventas y compras: detalle comercial sobre el libro de movimientos.
--
-- `inventory_movements` YA es el libro de entradas y salidas (un asiento por
-- movimiento, con stock anterior y posterior). Lo que le faltaba era el detalle
-- económico de cada lado:
--
--   SALIDAS (ventas)  → el detalle vivía en `payments.metadata` (JSONB): no es
--                       consultable con garantías, no tiene integridad
--                       referencial y no sirve para reportes. Pasa a la tabla
--                       `payment_lines`.
--   ENTRADAS (compras) → no había dónde anotar a cuánto se compró. Se añade
--                       `unit_cost` al movimiento.
--
-- Además se liga cada salida con el pago que la originó (`payment_id`), para
-- poder ir del movimiento de stock a la venta y viceversa.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

-- ── 1. Líneas de venta ──────────────────────────────────────────────────────
-- product_name y unit_price son SNAPSHOT: el catálogo puede cambiar después y
-- un recibo histórico debe seguir diciendo lo que decía el día de la venta.
CREATE TABLE IF NOT EXISTS public.payment_lines (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   uuid          NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  product_id   uuid          NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text          NOT NULL,
  quantity     integer       NOT NULL CHECK (quantity > 0),
  unit_price   numeric(14,4) NOT NULL CHECK (unit_price >= 0),
  line_total   numeric(14,4) GENERATED ALWAYS AS (round(unit_price * quantity, 4)) STORED,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_lines_payment ON public.payment_lines (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_lines_product ON public.payment_lines (product_id, created_at DESC);

ALTER TABLE public.payment_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_lines FROM anon, authenticated;
GRANT SELECT, INSERT ON public.payment_lines TO service_role;

COMMENT ON TABLE  public.payment_lines            IS 'Detalle de productos vendidos en un pago. Reemplaza payments.metadata.';
COMMENT ON COLUMN public.payment_lines.unit_price IS 'Precio unitario al momento de la venta (snapshot inmutable).';

-- ── 2. Backfill desde payments.metadata ─────────────────────────────────────
-- Solo ventas de producto con metadata en forma de array y cuyo producto aún
-- existe (la FK es RESTRICT; una línea huérfana no podría insertarse).
INSERT INTO public.payment_lines (payment_id, product_id, product_name, quantity, unit_price)
SELECT p.id,
       x.product_id,
       COALESCE(NULLIF(trim(x.product_name), ''), 'Producto'),
       x.quantity,
       COALESCE(x.price, 0)
  FROM public.payments p
  CROSS JOIN LATERAL jsonb_to_recordset(p.metadata)
       AS x(product_id uuid, product_name text, quantity integer, price numeric)
 WHERE p.category = 'PRODUCT'
   AND jsonb_typeof(p.metadata) = 'array'
   AND x.product_id IS NOT NULL
   AND x.quantity IS NOT NULL
   AND x.quantity > 0
   AND EXISTS (SELECT 1 FROM public.products pr WHERE pr.id = x.product_id)
   AND NOT EXISTS (SELECT 1 FROM public.payment_lines pl WHERE pl.payment_id = p.id);

-- ── 3. Detalle económico en el libro de movimientos ─────────────────────────
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS unit_cost numeric(14,4);

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS payment_id uuid;

ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_unit_cost_nonnegative;
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_unit_cost_nonnegative
  CHECK (unit_cost IS NULL OR unit_cost >= 0);

ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_payment_id_fkey;
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_payment_id_fkey
  FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_payment
  ON public.inventory_movements (payment_id) WHERE payment_id IS NOT NULL;

COMMENT ON COLUMN public.inventory_movements.unit_cost  IS 'Costo unitario de compra (solo entradas). NULL en salidas.';
COMMENT ON COLUMN public.inventory_movements.payment_id IS 'Venta que originó la salida (solo SALE). NULL en entradas y ajustes.';

-- ── 4. Ligar movimientos de venta existentes con su pago ────────────────────
-- Hace la vinculación solo cuando no hay ambigüedad: un único movimiento SALE
-- de ese producto y esa cantidad en el mismo minuto que el pago.
UPDATE public.inventory_movements m
   SET payment_id = pl.payment_id
  FROM public.payment_lines pl
  JOIN public.payments pay ON pay.id = pl.payment_id
 WHERE m.payment_id IS NULL
   AND m.movement_type = 'SALE'
   AND m.product_id = pl.product_id
   AND abs(m.quantity) = pl.quantity
   AND m.created_at BETWEEN pay.transaction_date - interval '1 minute'
                        AND pay.transaction_date + interval '1 minute';

-- ── 5. Checkout de productos: escribe las líneas de venta ───────────────────
-- Mantiene metadata por compatibilidad con el recibo actual (payments-log lo
-- lee); se retira cuando el código pase a leer payment_lines.
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

  -- Precio real desde products, bloqueo de stock y validación.
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
      'product_id',   v_item.product_id,
      'product_name', v_product.name,
      'quantity',     v_item.quantity,
      'price',        v_product.price
    );
  END LOOP;

  IF jsonb_array_length(v_meta) = 0 THEN
    RAISE EXCEPTION 'La venta no incluye productos.';
  END IF;

  INSERT INTO payments (client_id, user_id, total_amount, payment_method, category, metadata, processed_by)
  VALUES (p_client_id, p_user_id, v_total, p_payment_method, 'PRODUCT', v_meta, p_user_id)
  RETURNING id INTO v_payment_id;

  -- Detalle de la venta como filas reales.
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

REVOKE ALL ON FUNCTION public.process_product_checkout(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_product_checkout(uuid, uuid, text, jsonb) TO service_role;

-- ── 6. Registrar una compra (entrada con costo) ─────────────────────────────
-- Atómica: sube el stock y asienta la entrada con su costo en una transacción.
CREATE OR REPLACE FUNCTION public.register_stock_purchase(
  p_product_id uuid,
  p_user_id uuid,
  p_quantity integer,
  p_unit_cost numeric
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous_stock integer;
  v_new_stock integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad comprada debe ser mayor que cero.';
  END IF;

  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN
    RAISE EXCEPTION 'El costo unitario no puede ser negativo.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND is_active) THEN
    RAISE EXCEPTION 'Producto no disponible: %', p_product_id;
  END IF;

  SELECT current_stock INTO v_previous_stock
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto no tiene inventario inicializado: %', p_product_id;
  END IF;

  v_new_stock := v_previous_stock + p_quantity;

  UPDATE inventory
  SET current_stock = v_new_stock, last_updated = now()
  WHERE product_id = p_product_id;

  INSERT INTO inventory_movements (
    product_id, user_id, movement_type, quantity, previous_stock, new_stock, unit_cost
  ) VALUES (
    p_product_id, p_user_id, 'ADD', p_quantity, v_previous_stock, v_new_stock, p_unit_cost
  );

  RETURN v_new_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.register_stock_purchase(uuid, uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_stock_purchase(uuid, uuid, integer, numeric) TO service_role;

-- ── 7. Libro unificado de entradas y salidas ────────────────────────────────
-- La dirección sale del signo de la cantidad, que es como ya se escribe: las
-- salidas se asientan en negativo y las entradas en positivo.
CREATE OR REPLACE VIEW public.vw_inventory_ledger
WITH (security_invoker = on) AS
  SELECT
    m.id,
    m.created_at,
    m.product_id,
    p.name AS product_name,
    p.sku,
    m.movement_type,
    CASE WHEN m.quantity >= 0 THEN 'IN' ELSE 'OUT' END AS direction,
    abs(m.quantity) AS quantity,
    m.previous_stock,
    m.new_stock,
    m.unit_cost,
    CASE WHEN m.unit_cost IS NOT NULL
         THEN round(m.unit_cost * abs(m.quantity), 4) END AS total_cost,
    m.payment_id,
    pl.unit_price,
    pl.line_total AS total_revenue,
    m.user_id,
    u.full_name AS user_name
  FROM public.inventory_movements m
  JOIN public.products p ON p.id = m.product_id
  LEFT JOIN public.users u ON u.id = m.user_id
  LEFT JOIN public.payment_lines pl
    ON pl.payment_id = m.payment_id AND pl.product_id = m.product_id;

REVOKE ALL ON public.vw_inventory_ledger FROM anon, authenticated;
GRANT SELECT ON public.vw_inventory_ledger TO service_role;
