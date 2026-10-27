-- ============================================================================
-- FASE 1 — Cierre de urgencia de la API pública.
--
-- Cierra lo explotable SIN autenticar. Es compatible con el código en
-- producción actual (que llega como `authenticated`), así que puede aplicarse
-- ANTES del despliegue de código y NO requiere ventana de mantenimiento.
--
-- IDEMPOTENTE y auto-suficiente: define las funciones de ciclo de vida de
-- membresías (históricamente creadas a mano y nunca versionadas) en vez de
-- asumirlas, y usa guards `to_regprocedure` para no romperse ante estados
-- parciales o entornos donde algún objeto falte. Se puede re-aplicar sin daño.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- ── 0. Funciones de ciclo de vida de membresías (versionadas aquí) ──────────
-- Las cron viven en `private` (PostrREST no lo expone); freeze/unfreeze en
-- `public` (las invoca la app). Si una cron ya existía a mano en `public`, se
-- mueve a `private` antes de recrearla, para no dejar duplicados.
DO $$
BEGIN
  IF to_regprocedure('public.expire_active_memberships_cron()') IS NOT NULL THEN
    ALTER FUNCTION public.expire_active_memberships_cron() SET SCHEMA private;
  END IF;
  IF to_regprocedure('public.process_frozen_memberships_cron()') IS NOT NULL THEN
    ALTER FUNCTION public.process_frozen_memberships_cron() SET SCHEMA private;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private.expire_active_memberships_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE memberships
    SET status = 'expired'
    WHERE status = 'active'
      AND end_date::date < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION private.process_frozen_memberships_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    r RECORD;
BEGIN
    UPDATE memberships
    SET frozen_days = GREATEST(0, frozen_days - 1)
    WHERE status = 'frozen' AND frozen_days > 0;

    FOR r IN
        SELECT id
        FROM memberships
        WHERE status = 'frozen' AND frozen_days = 0
    LOOP
        PERFORM unfreeze_membership(r.id);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.freeze_membership(p_membership_id uuid, p_target_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_membership RECORD;
    v_class_id UUID;
    v_has_future BOOLEAN;
    v_freeze_days INTEGER;
    v_remaining_days INTEGER;
BEGIN
    IF p_target_date <= CURRENT_DATE THEN
        RAISE EXCEPTION 'La fecha de reactivación debe ser posterior a hoy.';
    END IF;

    v_freeze_days := p_target_date - CURRENT_DATE;

    SELECT id, end_date, status, client_id, class_plan_id INTO v_membership
    FROM memberships
    WHERE id = p_membership_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membresía no encontrada.';
    END IF;

    IF v_membership.status != 'active' THEN
        RAISE EXCEPTION 'Solo se pueden congelar membresías activas.';
    END IF;

    SELECT class_id INTO v_class_id
    FROM class_plans
    WHERE id = v_membership.class_plan_id;

    IF v_class_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM memberships m
            JOIN class_plans cp ON m.class_plan_id = cp.id
            WHERE m.client_id = v_membership.client_id
              AND m.status = 'active'
              AND cp.class_id = v_class_id
              AND m.start_date > CURRENT_DATE
              AND m.id != p_membership_id
        ) INTO v_has_future;

        IF v_has_future THEN
            RAISE EXCEPTION 'No se puede pausar si hay membresías en cola.';
        END IF;
    END IF;

    v_remaining_days := GREATEST(0, v_membership.end_date - CURRENT_DATE);

    UPDATE memberships
    SET status = 'frozen',
        remaining_days = v_remaining_days,
        frozen_days = v_freeze_days
    WHERE id = p_membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfreeze_membership(p_membership_id uuid)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old RECORD;
    v_new_end_date DATE;
    v_new_id UUID;
BEGIN
    SELECT * INTO v_old
    FROM memberships
    WHERE id = p_membership_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membresía no encontrada.';
    END IF;

    IF v_old.status != 'frozen' THEN
        RAISE EXCEPTION 'La membresía no está congelada.';
    END IF;

    v_new_end_date := CURRENT_DATE + COALESCE(v_old.remaining_days, 0);

    INSERT INTO memberships (
        payment_id, client_id, class_plan_id, amount_paid,
        start_date, end_date, status, remaining_days, frozen_days, created_at
    ) VALUES (
        v_old.payment_id, v_old.client_id, v_old.class_plan_id, v_old.amount_paid,
        CURRENT_DATE, v_new_end_date, 'active', 0, 0, NOW()
    ) RETURNING id INTO v_new_id;

    UPDATE memberships
    SET status = 'transferred',
        frozen_days = 0
    WHERE id = p_membership_id;

    RETURN v_new_end_date;
END;
$$;

-- ── 1. RPC ejecutables por `anon`: revocar. search_path fijo (advisor 0011) ─
REVOKE EXECUTE ON FUNCTION public.freeze_membership(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unfreeze_membership(uuid)     FROM anon;
REVOKE ALL    ON FUNCTION private.expire_active_memberships_cron()  FROM anon, authenticated;
REVOKE ALL    ON FUNCTION private.process_frozen_memberships_cron() FROM anon, authenticated;

-- Funciones de productos: pueden faltar en algún entorno → guard defensivo.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.adjust_product_stock(uuid,uuid,integer,text)',
    'public.create_product_with_inventory(text,text,numeric,text,text,integer,uuid)',
    'public.process_product_checkout(uuid,uuid,text,numeric,jsonb)'
  ] LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', fn);
    END IF;
  END LOOP;
END $$;

-- ── 2. authorized_devices: DELETE anónimo = DoS del sistema entero ──────────
DROP POLICY IF EXISTS "Permitir auto-revocación mediante DELETE" ON public.authorized_devices;
DROP POLICY IF EXISTS "Revocación de dispositivo propio" ON public.authorized_devices;
CREATE POLICY "Revocación de dispositivo propio" ON public.authorized_devices
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = authorized_by);

-- ── 3. "Eliminación prohibida" de payments como RESTRICTIVE ─────────────────
DROP POLICY IF EXISTS "Eliminación prohibida" ON public.payments;
CREATE POLICY "Eliminación prohibida" ON public.payments
  AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (false);

-- ── 4. Programar el ciclo de vida de membresías (idempotente) ───────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-memberships') THEN
    PERFORM cron.unschedule('expire-memberships');
  END IF;
  PERFORM cron.schedule('expire-memberships', '10 3 * * *',
    'SELECT private.expire_active_memberships_cron()');

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-frozen') THEN
    PERFORM cron.unschedule('process-frozen');
  END IF;
  PERFORM cron.schedule('process-frozen', '20 3 * * *',
    'SELECT private.process_frozen_memberships_cron()');
END $$;
