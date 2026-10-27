ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Drop the old foreign key (assuming its name is inventory_movements_user_id_fkey, which was verified earlier)
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_user_id_fkey;

-- Add the new foreign key pointing to public.users(id)
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Fix RLS policy on inventory_movements
DROP POLICY IF EXISTS "Permitir insertar movimientos a usuarios autenticados" ON inventory_movements;
CREATE POLICY "Permitir insertar movimientos a administradores" ON inventory_movements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE users.id = user_id AND users.auth_user_id = auth.uid()
    )
  );
