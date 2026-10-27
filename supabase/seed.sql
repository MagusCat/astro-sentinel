-- ============================================================================
-- SEED — datos de prueba para un entorno VACÍO (Testing, local).
--
-- Todo pasa por los RPC reales (checkout, productos, compras), así que pagos,
-- snapshot de moneda, líneas de venta y libro de inventario quedan igual que
-- en uso real.
--
-- Credenciales (contraseña de todas: sentinel123):
--   · Autorizar terminal (Supabase Auth): terminal@sentinel.test
--   · Login de operador:  maintainer · admin · recepcion
--
-- Se niega a correr si la BD ya tiene usuarios o pagos que no son del seed
-- (protege producción). Si el seed ya se aplicó, no hace nada.
-- ============================================================================

DO $$
DECLARE
  v_auth_email text := 'terminal@sentinel.test';
  v_password   text := 'sentinel123';
  v_auth_id    uuid;
  v_maint      uuid := '5eed0000-0000-0000-0000-000000000001';
  v_admin      uuid := '5eed0000-0000-0000-0000-000000000002';
  v_recep      uuid := '5eed0000-0000-0000-0000-000000000003';
  v_class      uuid;
  v_client     uuid;
  v_plan       uuid;
  v_product    uuid;
  v_result     jsonb;
  i            integer := 0;
  r            record;
BEGIN
  -- ── Guardas ───────────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_maint) THEN
    RAISE NOTICE 'seed: ya aplicado, no se hace nada.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users) OR EXISTS (SELECT 1 FROM public.payments) THEN
    RAISE EXCEPTION 'seed: la BD ya tiene usuarios o pagos. El seed es solo para entornos vacíos.';
  END IF;

  -- ── Supabase Auth: cuenta que autoriza terminales ─────────────────────────
  -- Si ya existía (el reset no toca auth), se reutiliza con su contraseña.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_auth_email, extensions.crypt(v_password, extensions.gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ) ON CONFLICT DO NOTHING;

  SELECT id INTO v_auth_id FROM auth.users WHERE email = v_auth_email;

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_auth_id, v_auth_id::text, 'email',
    jsonb_build_object('sub', v_auth_id::text, 'email', v_auth_email, 'email_verified', true),
    now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  -- ── Operadores (login local con bcrypt) ───────────────────────────────────
  INSERT INTO public.users (id, auth_user_id, full_name, role, username, password_hash) VALUES
    (v_maint, v_auth_id, 'Mantenimiento',   'maintainer', 'maintainer', extensions.crypt(v_password, extensions.gen_salt('bf', 10))),
    (v_admin, NULL,      'Andrea Morales',  'admin',      'admin',      extensions.crypt(v_password, extensions.gen_salt('bf', 10))),
    (v_recep, NULL,      'Luis Recepción',  'reception',  'recepcion',  extensions.crypt(v_password, extensions.gen_salt('bf', 10)));

  -- ── Clases y planes ───────────────────────────────────────────────────────
  FOR r IN SELECT * FROM (VALUES
    ('Pole Dance',           'Técnica, giros y fuerza en barra'),
    ('Danza Contemporánea',  'Movimiento, suelo y expresión'),
    ('Heels',                'Coreografía en tacones'),
    ('Flexibilidad',         'Estiramiento activo y movilidad')
  ) AS t(name, description) LOOP
    INSERT INTO public.classes (name, description) VALUES (r.name, r.description) RETURNING id INTO v_class;
    INSERT INTO public.class_plans (class_id, plan_name, duration_days, price) VALUES
      (v_class, 'Clase suelta',  1,  8),
      (v_class, 'Mensual',      30, 45),
      (v_class, 'Trimestral',   90, 120);
  END LOOP;

  -- ── Clientes + membresías (vía checkout real) ─────────────────────────────
  FOR r IN SELECT * FROM (VALUES
    ('María José Pérez',   '+505 8812 3401', 'mariajose@example.com', 'Pole Dance',          'Mensual',    'efectivo'),
    ('Valeria Castillo',   '+505 8823 4512', 'valeria@example.com',   'Pole Dance',          'Trimestral', 'tarjeta'),
    ('Camila Rodríguez',   '+505 8834 5623', 'camila@example.com',    'Heels',               'Mensual',    'transferencia'),
    ('Daniela López',      '+505 8845 6734', 'daniela@example.com',   'Danza Contemporánea', 'Mensual',    'efectivo'),
    ('Sofía Hernández',    '+505 8856 7845', NULL,                    'Flexibilidad',        'Mensual',    'efectivo'),
    ('Gabriela Martínez',  '+505 8867 8956', 'gabriela@example.com',  'Pole Dance',          'Mensual',    'tarjeta'),
    ('Ana Lucía Gómez',    '+505 8878 9067', 'analucia@example.com',  'Heels',               'Trimestral', 'transferencia'),
    ('Fernanda Ruiz',      NULL,             'fernanda@example.com',  'Danza Contemporánea', 'Clase suelta','efectivo'),
    ('Isabella Torres',    '+505 8890 1289', NULL,                    NULL,                  NULL,         NULL),
    ('Paola Mendoza',      '+505 8801 2390', 'paola@example.com',     'Flexibilidad',        'Trimestral', 'tarjeta')
  ) AS t(full_name, phone, email, class_name, plan_name, method) LOOP
    i := i + 1;
    INSERT INTO public.clients (full_name, phone_number, email)
    VALUES (r.full_name, r.phone, r.email) RETURNING id INTO v_client;

    CONTINUE WHEN r.class_name IS NULL; -- cliente sin membresía

    SELECT cp.id INTO v_plan
      FROM public.class_plans cp JOIN public.classes c ON c.id = cp.class_id
     WHERE c.name = r.class_name AND cp.plan_name = r.plan_name;

    v_result := public.process_membership_checkout(v_client, v_plan, v_recep, r.method);

    -- Repartir los cobros en el último mes para que los reportes tengan forma.
    UPDATE public.payments
       SET transaction_date = now() - make_interval(days => i * 3)
     WHERE id = (v_result->>'payment_id')::uuid;
  END LOOP;

  -- Una membresía vencida (histórico) y una congelada.
  UPDATE public.memberships m
     SET start_date = CURRENT_DATE - 45, end_date = CURRENT_DATE - 15, status = 'expired'
    FROM public.clients c
   WHERE c.id = m.client_id AND c.full_name = 'Fernanda Ruiz';

  PERFORM public.freeze_membership(m.id, CURRENT_DATE + 10)
     FROM public.memberships m JOIN public.clients c ON c.id = m.client_id
    WHERE c.full_name = 'Daniela López' AND m.status = 'active';

  -- ── Productos, compras y ventas ───────────────────────────────────────────
  FOR r IN SELECT * FROM (VALUES
    ('Agua 600ml',          'Agua purificada',             1.00, 'BEB-AGUA',  'Bebidas',     24, 10, 48, 0.40),
    ('Bebida isotónica',    'Sabor limón',                 2.50, 'BEB-ISO',   'Bebidas',     12,  6, 24, 1.30),
    ('Grip líquido',        'Antideslizante para barra',  12.00, 'ACC-GRIP',  'Accesorios',   3,  4, 12, 6.50),
    ('Rodilleras',          'Par, talla única',           18.00, 'ACC-ROD',   'Accesorios',   6,  2,  8, 9.00),
    ('Top deportivo',       'Tela de agarre',             22.00, 'ROP-TOP',   'Ropa',         8,  3, 12, 11.00),
    ('Short de pole',       'Tiro alto',                  20.00, 'ROP-SHORT', 'Ropa',         0,  3, 10, 10.00)
  ) AS t(name, description, price, sku, category, stock, min_stock, max_stock, cost) LOOP
    v_product := public.create_product_with_inventory(r.name, r.description, r.price, r.sku, r.category, r.stock, v_maint);
    UPDATE public.products SET min_stock = r.min_stock, max_stock = r.max_stock WHERE id = v_product;

    -- Compra de reposición con costo (entrada en el libro). Los que ya están
    -- bajo mínimo se dejan así para que se vea la alerta.
    IF r.stock >= r.min_stock THEN
      PERFORM public.register_stock_purchase(v_product, v_admin, r.max_stock / 2, r.cost);
    END IF;
  END LOOP;

  -- Producto temporal: agotado pero sin alerta de reposición.
  UPDATE public.products SET is_temporary = true WHERE sku = 'ROP-SHORT';

  -- Ventas en mostrador (una con cliente, otra anónima).
  PERFORM public.process_product_checkout(
    (SELECT id FROM public.clients WHERE full_name = 'Valeria Castillo'), v_recep, 'efectivo',
    jsonb_build_array(
      jsonb_build_object('product_id', (SELECT id FROM public.products WHERE sku = 'BEB-AGUA'), 'quantity', 2),
      jsonb_build_object('product_id', (SELECT id FROM public.products WHERE sku = 'ACC-GRIP'), 'quantity', 1)
    ));

  PERFORM public.process_product_checkout(
    NULL, v_recep, 'tarjeta',
    jsonb_build_array(
      jsonb_build_object('product_id', (SELECT id FROM public.products WHERE sku = 'BEB-ISO'), 'quantity', 3)
    ));

  RAISE NOTICE 'seed: listo. Terminal: % / % — operadores: maintainer, admin, recepcion.', v_auth_email, v_password;
END $$;
