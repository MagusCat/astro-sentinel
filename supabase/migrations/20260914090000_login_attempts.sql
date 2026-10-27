-- ============================================================================
-- Registro de intentos de login FALLIDOS (throttle antifuerza-bruta).
--
-- Solo se insertan fallos; un login correcto borra las filas de esa clave, así
-- que un operador legítimo no se autobloquea. Persistente en la BD porque un Map
-- en memoria no sobrevive al reciclaje de isolates en Cloudflare Workers.
-- Escrito y leído solo por el service role; nunca expuesto a anon/authenticated.
-- Sirve además como rastro de auditoría de intentos fallidos.
--
-- SAFE TO APPLY ANY TIME — additive, does not affect existing behaviour.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_key text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_key_time
  ON public.login_attempts (attempt_key, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- No policies: deny-all for anon/authenticated. Only the service role (which
-- bypasses RLS) may read/write it.
REVOKE ALL ON public.login_attempts FROM anon, authenticated;

-- Optional housekeeping: purge attempts older than a day so the table stays
-- small. Requires pg_cron (already installed on this project).
SELECT cron.schedule(
  'purge-login-attempts',
  '30 4 * * *',
  $$DELETE FROM public.login_attempts WHERE created_at < now() - interval '1 day'$$
);
