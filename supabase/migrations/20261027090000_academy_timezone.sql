-- ============================================================================
-- Zona horaria de la academia (Nicaragua, UTC-6 sin horario de verano).
--
-- Supabase arranca en UTC, así que CURRENT_DATE y date(timestamptz) cambiaban de
-- día a las 18:00 hora local: un cobro de la noche empezaba la membresía "mañana",
-- el ingreso del día y los informes se partían en dos días, y los crons de
-- vencimiento corrían con el calendario de otro país.
--
-- Fijarla a nivel de base de datos corrige de una vez CURRENT_DATE en todas las
-- RPC (checkout, congelar), las vistas vw_* y los crons, sin reescribirlos.
-- Los timestamptz no cambian (son instantes); solo cambia cómo se interpreta "hoy".
--
-- DESPLIEGUE: aplica a conexiones NUEVAS. Tras aplicarla, reinicia el pooler /
-- PostgREST (Dashboard → Settings → Restart server) para que lo tomen.
-- ============================================================================

DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Managua');
END $$;

-- La sesión que aplica la migración también, para lo que venga después en el mismo lote.
SET timezone TO 'America/Managua';
