DROP POLICY IF EXISTS "Escritura solo para administradores" ON products;
CREATE POLICY "Escritura solo para administradores" ON products FOR ALL TO public
USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY (ARRAY['admin'::user_role, 'maintainer'::user_role])))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY (ARRAY['admin'::user_role, 'maintainer'::user_role])));

DROP POLICY IF EXISTS "Ajuste manual solo para administradores" ON inventory;
CREATE POLICY "Ajuste manual solo para administradores" ON inventory FOR ALL TO public
USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY (ARRAY['admin'::user_role, 'maintainer'::user_role])))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY (ARRAY['admin'::user_role, 'maintainer'::user_role])));

DROP POLICY IF EXISTS "Modificación restringida a administradores" ON payments;
CREATE POLICY "Modificación restringida a administradores" ON payments FOR ALL TO public
USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY (ARRAY['admin'::user_role, 'maintainer'::user_role])))
WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = ANY (ARRAY['admin'::user_role, 'maintainer'::user_role])));
