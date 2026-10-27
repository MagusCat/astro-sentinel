-- ============================================================================
-- Moneda y tasas de cambio.
--
-- Modelo: precios (products/class_plans) en UNA moneda base. Cada pago registra
-- en qué moneda se cobró y a qué tasa (snapshot), y guarda el equivalente en
-- moneda base de forma auditable. Las tasas viven en una tabla con historial.
--
-- Moneda base: USD (confirmado). Los precios de products/class_plans están en USD
-- y la UI muestra USD por defecto. La moneda local (NIO) se siembra solo para la
-- visualización dual; su tasa vive en exchange_rates y la actualiza el operador.
--
-- ⚠️  La tasa sembrada abajo es un PLACEHOLDER. Actualízala al valor real antes
--     de mostrarla en producción (ver README: "Actualizar la tasa").
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

-- ── Catálogo de monedas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.currencies (
  code       text        PRIMARY KEY,               -- ISO 4217, p.ej. 'USD','MXN','EUR'
  name       text        NOT NULL,
  symbol     text,
  is_base    boolean     NOT NULL DEFAULT false,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Como mucho UNA moneda base.
CREATE UNIQUE INDEX IF NOT EXISTS uq_currencies_single_base
  ON public.currencies ((is_base)) WHERE is_base;

-- Moneda base (USD) y moneda local para visualización dual.
INSERT INTO public.currencies (code, name, symbol, is_base)
VALUES
  ('USD', 'US Dollar', '$',  true),
  ('NIO', 'Córdoba',   'C$', false)
ON CONFLICT (code) DO NOTHING;

-- ── Historial de tasas de cambio (tasa → moneda base) ───────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code  text        NOT NULL REFERENCES public.currencies(code),
  rate_to_base   numeric(18,8) NOT NULL CHECK (rate_to_base > 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON public.exchange_rates (currency_code, effective_from DESC);

-- Tasa inicial NIO → USD. PLACEHOLDER: 1 NIO = 0.02717391 USD (≈ 36.80 C$/US$).
-- Para actualizarla se INSERTA una fila nueva (nunca UPDATE): el historial importa.
INSERT INTO public.exchange_rates (currency_code, rate_to_base, effective_from)
VALUES ('NIO', 0.02717391, now())
ON CONFLICT DO NOTHING;

-- ── Snapshot de moneda/tasa en cada pago ────────────────────────────────────
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency      text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS exchange_rate numeric(18,8);

-- Backfill de pagos existentes: moneda base, tasa 1.
UPDATE public.payments
   SET currency = (SELECT code FROM public.currencies WHERE is_base LIMIT 1),
       exchange_rate = 1
 WHERE currency IS NULL;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(code);

ALTER TABLE public.payments ALTER COLUMN exchange_rate SET DEFAULT 1;
ALTER TABLE public.payments ALTER COLUMN currency      SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN exchange_rate SET NOT NULL;

-- Equivalente en moneda base, calculado y auditable.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS amount_base numeric(18,4)
  GENERATED ALWAYS AS (round(total_amount * exchange_rate, 4)) STORED;

-- ── Trigger: rellena moneda/tasa por defecto si el insert no las trae ───────
-- (Los RPC insertan sin moneda → base + tasa vigente. Para cobrar en otra
--  moneda, el insert debe pasar currency/exchange_rate explícitos.)
CREATE OR REPLACE FUNCTION public.payments_apply_currency_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base text;
  v_rate numeric(18,8);
BEGIN
  IF NEW.currency IS NULL THEN
    SELECT code INTO v_base FROM public.currencies WHERE is_base LIMIT 1;
    NEW.currency := v_base;
  END IF;

  IF NEW.exchange_rate IS NULL THEN
    SELECT rate_to_base INTO v_rate
      FROM public.exchange_rates
     WHERE currency_code = NEW.currency AND effective_from <= now()
     ORDER BY effective_from DESC
     LIMIT 1;
    NEW.exchange_rate := COALESCE(v_rate, 1);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_currency ON public.payments;
CREATE TRIGGER trg_payments_currency
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.payments_apply_currency_defaults();

-- ── RLS deny-all + acceso solo service role ─────────────────────────────────
ALTER TABLE public.currencies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.currencies, public.exchange_rates FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies, public.exchange_rates TO service_role;
REVOKE EXECUTE ON FUNCTION public.payments_apply_currency_defaults() FROM anon, authenticated;
