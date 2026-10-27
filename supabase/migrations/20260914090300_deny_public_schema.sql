-- ============================================================================
-- FASE 2 (corte de fondo) — El navegador deja de hablar con la BD.
--
-- Tras esta migración, `anon` y `authenticated` no tienen NINGÚN acceso al
-- esquema public. La app opera exclusivamente con el service role (que ignora
-- RLS y conserva sus GRANT), y la autorización vive en requireRole() del
-- servidor. Ninguna tabla ni función queda alcanzable desde un navegador.
--
-- ⚠️  SE APLICA JUNTO CON EL DESPLIEGUE DE CÓDIGO DE LA FASE 2. El código nuevo
--     (service role) funciona con esto; el código viejo (sesión Supabase en el
--     navegador) dejaría de leer/escribir. Son inseparables.
-- ============================================================================

-- ── 1. Eliminar todas las políticas permisivas basadas en la sesión del navegador
DROP POLICY IF EXISTS "Acceso total a Terminales Conectadas" ON public.class_plans;
DROP POLICY IF EXISTS "Acceso total a Terminales Conectadas" ON public.classes;
DROP POLICY IF EXISTS "Acceso total a Terminales Conectadas" ON public.clients;
DROP POLICY IF EXISTS "Acceso total a Terminales Conectadas" ON public.memberships;
DROP POLICY IF EXISTS "Acceso total a Terminales Conectadas" ON public.users;

DROP POLICY IF EXISTS "Modificación restringida a administradores" ON public.payments;
DROP POLICY IF EXISTS "Inserción de pagos para todos" ON public.payments;
DROP POLICY IF EXISTS "Lectura de pagos para todos" ON public.payments;
-- Se conserva "Eliminación prohibida" (RESTRICTIVE, USING false) como refuerzo.

DROP POLICY IF EXISTS "Escritura solo para administradores" ON public.products;
DROP POLICY IF EXISTS "Lectura para todos los usuarios autenticados" ON public.products;

DROP POLICY IF EXISTS "Ajuste manual solo para administradores" ON public.inventory;
DROP POLICY IF EXISTS "Lectura de stock para todos" ON public.inventory;

DROP POLICY IF EXISTS "inventory_movements_insert_via_rpc_only" ON public.inventory_movements;
DROP POLICY IF EXISTS "Permitir lectura de movimientos a usuarios autenticados" ON public.inventory_movements;

DROP POLICY IF EXISTS "Revocación de dispositivo propio" ON public.authorized_devices;
DROP POLICY IF EXISTS "Usuarios pueden registrar sus propios dispositivos" ON public.authorized_devices;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios dispositivos" ON public.authorized_devices;

DROP POLICY IF EXISTS "_status" ON public._status;

-- ── 2. RLS habilitada en todas las tablas (deny-all sin políticas) ──────────
ALTER TABLE public._status             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_devices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;

-- ── 3. Revocar TODO grant a anon/authenticated (tablas, vistas, secuencias, funciones)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- ── 4. Cortar los defaults que regalaban GRANT ALL a anon/authenticated ─────
-- (venían del bootstrap de Supabase; toda tabla/función nueva nacía abierta).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Nota: service_role conserva sus privilegios (no se revoca) y sigue operando
-- con normalidad. Las vistas vw_* mantienen security_invoker=on: como el único
-- rol que las consulta es service_role, se resuelven con privilegios plenos.
