-- ============================================================================
-- Precisión de dinero: NUMERIC(10,2) → NUMERIC(14,4).
--
-- Sigue siendo exacto (no float): amplía el rango (hasta ~10^10) y da 4 decimales
-- para conversiones de divisa sin redondeo prematuro. La app no cambia (se lee
-- con Number()).
--
-- Tres vistas dependen de payments.total_amount, así que hay que soltarlas y
-- recrearlas alrededor del ALTER. El resto de columnas de dinero (price,
-- amount_paid) no las usa ninguna vista.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

-- ── Soltar las vistas dependientes de payments.total_amount ─────────────────
DROP VIEW IF EXISTS public.vw_dashboard_stats;
DROP VIEW IF EXISTS public.vw_payments_extended;
DROP VIEW IF EXISTS public.vw_daily_revenue;

-- ── Ampliar las columnas de dinero ──────────────────────────────────────────
ALTER TABLE public.products    ALTER COLUMN price        TYPE numeric(14,4);
ALTER TABLE public.class_plans ALTER COLUMN price        TYPE numeric(14,4);
ALTER TABLE public.memberships ALTER COLUMN amount_paid  TYPE numeric(14,4);
ALTER TABLE public.payments    ALTER COLUMN total_amount TYPE numeric(14,4);

-- ── Recrear las vistas (definición idéntica, security_invoker) ──────────────
CREATE VIEW public.vw_daily_revenue WITH (security_invoker = on) AS
 SELECT date(p.transaction_date) AS payment_date,
    p.payment_method,
    u.full_name AS user_name,
    count(p.id) AS total_transactions,
    sum(p.total_amount) AS total_revenue
   FROM payments p
     LEFT JOIN users u ON p.user_id = u.id
  WHERE u.is_active = true
  GROUP BY (date(p.transaction_date)), p.payment_method, u.full_name
  ORDER BY (date(p.transaction_date)) DESC;

CREATE VIEW public.vw_payments_extended WITH (security_invoker = on) AS
 SELECT DISTINCT ON (c.id) p.id,
    p.client_id,
    c.full_name AS client_name,
    c.email AS client_email,
    p.user_id,
    u.full_name AS user_name,
    u.role AS user_role,
    p.total_amount,
    p.payment_method,
    p.transaction_date,
    m.class_plan_id
   FROM payments p
     JOIN clients c ON p.client_id = c.id
     JOIN memberships m ON p.id = m.payment_id
     LEFT JOIN users u ON p.user_id = u.id;

CREATE VIEW public.vw_dashboard_stats WITH (security_invoker = on) AS
 SELECT ( SELECT count(*) AS count FROM vw_active_memberships) AS active_memberships_count,
    ( SELECT count(*) AS count FROM classes WHERE classes.is_active = true) AS total_classes_count,
    ( SELECT count(*) AS count FROM clients WHERE clients.is_active = true) AS total_clients_count,
    ( SELECT COALESCE(sum(payments.total_amount), 0::numeric) AS "coalesce"
        FROM payments WHERE date(payments.transaction_date) = CURRENT_DATE) AS daily_revenue;

-- ── Acceso: solo el service role (modelo deny-all para anon/authenticated) ───
GRANT SELECT ON public.vw_daily_revenue     TO service_role;
GRANT SELECT ON public.vw_payments_extended TO service_role;
GRANT SELECT ON public.vw_dashboard_stats   TO service_role;
