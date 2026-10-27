-- Pruebas de las RPC sobre el esquema real. Se ejecuta con supabase/tests/run.sh.
-- Cada bloque falla (RAISE) si una regla no se cumple; el script termina en el primer fallo.
\set ON_ERROR_STOP on
SET client_min_messages TO warning;

INSERT INTO users (id, full_name, role, username) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Admin', 'admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000b1', 'Recepción', 'reception', 'recep');
INSERT INTO clients (id, full_name, phone_number) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Ana Pérez', '8888-1234');
INSERT INTO classes (id, name) VALUES ('00000000-0000-0000-0000-0000000000d1', 'Pole');
INSERT INTO class_plans (id, class_id, plan_name, duration_days, price)
  VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Mensual', 30, 40);
SELECT create_product_with_inventory('Agua', '', 1.5, 'AGUA1', 'Bebidas', 10, '00000000-0000-0000-0000-0000000000a1') AS product_id \gset

-- Helper: espera que la sentencia falle con SN400 y un mensaje concreto.
CREATE FUNCTION pg_temp.expect_error(p_sql text, p_like text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'FALLO: se esperaba error "%" y no hubo', p_like;
EXCEPTION WHEN SQLSTATE 'SN400' THEN
  IF SQLERRM NOT ILIKE '%' || p_like || '%' THEN
    RAISE EXCEPTION 'FALLO: mensaje inesperado "%" (esperado "%")', SQLERRM, p_like;
  END IF;
END $$;

CREATE FUNCTION pg_temp.check(p_ok boolean, p_what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT p_ok THEN RAISE EXCEPTION 'FALLO: %', p_what; END IF;
  RAISE NOTICE 'ok  %', p_what;
END $$;
SET client_min_messages TO notice;

-- ── Descuentos ──────────────────────────────────────────────────────────────
SELECT pg_temp.expect_error($$SELECT process_membership_checkout('00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'efectivo', 5)$$, 'Solo un administrador');
SELECT pg_temp.expect_error($$SELECT process_membership_checkout('00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'efectivo', 41)$$, 'entre 0 y el precio');
SELECT process_membership_checkout('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1',
  '00000000-0000-0000-0000-0000000000a1', 'efectivo', 10) AS m \gset
SELECT pg_temp.check((:'m'::jsonb ->> 'amount_charged')::numeric = 30, 'membresía con descuento cobra 40 - 10');
SELECT pg_temp.check((SELECT discount_amount = 10 FROM payments WHERE id = (:'m'::jsonb ->> 'payment_id')::uuid), 'descuento asentado en el pago');
SELECT pg_temp.check((:'m'::jsonb ->> 'start_date')::date = CURRENT_DATE, 'la membresía empieza hoy (hora de Managua)');

-- ── POS ─────────────────────────────────────────────────────────────────────
SELECT pg_temp.expect_error(format($$SELECT process_product_checkout(NULL, '00000000-0000-0000-0000-0000000000b1',
  'Efectivo', '[{"product_id": "%s", "quantity": 1}]')$$, :'product_id'), 'método de pago');
SELECT pg_temp.expect_error(format($$SELECT process_product_checkout(NULL, '00000000-0000-0000-0000-0000000000b1',
  'efectivo', '[{"product_id": "%s", "quantity": 99}]')$$, :'product_id'), 'Stock insuficiente de "Agua"');
SELECT process_product_checkout(NULL, '00000000-0000-0000-0000-0000000000b1', 'efectivo',
  format('[{"product_id": "%s", "quantity": 4}]', :'product_id')::jsonb) AS sale \gset
SELECT pg_temp.check((SELECT current_stock = 6 FROM inventory WHERE product_id = :'product_id'), 'venta descuenta stock');
SELECT pg_temp.check((SELECT total_amount = 6 FROM payments WHERE id = :'sale'), 'venta cobra 4 x 1.5 desde la BD');

-- ── Anulación ───────────────────────────────────────────────────────────────
SELECT pg_temp.expect_error(format($$SELECT void_payment('%s', '00000000-0000-0000-0000-0000000000b1', 'cobro duplicado')$$, :'sale'), 'Solo un administrador');
SELECT pg_temp.expect_error(format($$SELECT void_payment('%s', '00000000-0000-0000-0000-0000000000a1', 'x')$$, :'sale'), 'motivo');
SELECT void_payment(:'sale', '00000000-0000-0000-0000-0000000000a1', 'Cobro duplicado');
SELECT pg_temp.check((SELECT current_stock = 10 FROM inventory WHERE product_id = :'product_id'), 'anular devuelve el stock');
SELECT pg_temp.check((SELECT count(*) = 1 FROM inventory_movements WHERE payment_id = :'sale' AND movement_type = 'RETURN'), 'movimiento RETURN ligado al pago');
SELECT pg_temp.expect_error(format($$SELECT void_payment('%s', '00000000-0000-0000-0000-0000000000a1', 'otra vez más')$$, :'sale'), 'ya fue anulado');
SELECT void_payment((:'m'::jsonb ->> 'payment_id')::uuid, '00000000-0000-0000-0000-0000000000a1', 'Devolución al cliente');
SELECT pg_temp.check((SELECT status = 'cancelled' FROM memberships WHERE id = (:'m'::jsonb ->> 'membership_id')::uuid), 'anular cancela la membresía');
SELECT pg_temp.check((SELECT daily_revenue = 0 FROM vw_dashboard_stats), 'lo anulado no cuenta como ingreso del día');
SELECT pg_temp.check((SELECT count(*) = 1 FROM payments WHERE id = :'sale'), 'anular no borra el pago');

-- ── Cierre de caja ──────────────────────────────────────────────────────────
SELECT process_membership_checkout('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1',
  '00000000-0000-0000-0000-0000000000b1', 'tarjeta') AS m2 \gset
SELECT cash_closing(CURRENT_DATE, CURRENT_DATE) AS cc \gset
SELECT pg_temp.check((:'cc'::jsonb ->> 'net')::numeric = 40 AND (:'cc'::jsonb ->> 'count')::int = 1, 'cierre: neto solo de lo no anulado');
SELECT pg_temp.check(jsonb_array_length(:'cc'::jsonb -> 'voided') = 2, 'cierre: lista las 2 anulaciones');
SELECT pg_temp.check((:'cc'::jsonb -> 'by_method' -> 0 ->> 'label') = 'tarjeta', 'cierre: desglose por método');

-- ── Asistencia ──────────────────────────────────────────────────────────────
INSERT INTO class_sessions (id, class_id, weekday, start_time, end_time, capacity)
VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', extract(dow FROM CURRENT_DATE), '18:00', '19:00', 1);
SELECT check_in('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1');
SELECT pg_temp.expect_error($$SELECT check_in('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', NULL, '00000000-0000-0000-0000-0000000000b1')$$, 'ya registró asistencia');
UPDATE class_sessions SET is_paused = true WHERE id = '00000000-0000-0000-0000-0000000000f1';
DELETE FROM attendance;
SELECT pg_temp.expect_error($$SELECT check_in('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1')$$, 'pausado');
UPDATE class_sessions SET is_paused = false, access_mode = 'roster' WHERE id = '00000000-0000-0000-0000-0000000000f1';
SELECT pg_temp.expect_error($$SELECT check_in('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1')$$, 'no está inscrito');
SELECT enroll_client('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1');
SELECT pg_temp.check(check_in('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1') IS NOT NULL, 'inscrito puede registrar');
UPDATE memberships SET status = 'frozen' WHERE client_id = '00000000-0000-0000-0000-0000000000c1' AND status = 'active';
DELETE FROM attendance;
SELECT pg_temp.expect_error($$SELECT check_in('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', NULL, '00000000-0000-0000-0000-0000000000b1')$$, 'congelada');

-- ── Seguridad (docs/security.md): nada expuesto a anon/authenticated ────────
SELECT pg_temp.check(NOT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname IN ('check_in', 'enroll_client', 'void_payment', 'cash_closing', 'is_manager',
                                                'process_membership_checkout', 'process_product_checkout')
     AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
), 'RPC nuevas no ejecutables por anon/authenticated');
SELECT pg_temp.check(NOT EXISTS (
  SELECT 1 FROM information_schema.role_table_grants
   WHERE grantee IN ('anon', 'authenticated')
     AND table_name IN ('teachers', 'class_sessions', 'session_enrollments', 'attendance')
), 'tablas nuevas sin grants para anon/authenticated');
SELECT pg_temp.check((SELECT bool_and(relrowsecurity) FROM pg_class
   WHERE relname IN ('teachers', 'class_sessions', 'session_enrollments', 'attendance')), 'RLS activo en tablas nuevas');
