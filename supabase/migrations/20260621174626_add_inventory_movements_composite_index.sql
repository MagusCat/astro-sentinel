-- QUERY-02: Add composite index for getProductMovements query performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements(product_id, created_at DESC);
