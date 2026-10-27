-- ============================================================================
-- Moneda por operación + tasa vigente única + vista de tasas actuales.
--
-- Motivo: el histórico no debe depender de cuál sea la moneda base HOY. Cada
-- operación pasa a registrar (snapshot inmutable):
--   · en qué moneda se cobró            → currency
--   · con qué tasa se convirtió         → exchange_rate
--   · contra qué base se expresó        → base_currency
-- Así una fila vieja sigue significando lo mismo aunque la base cambie después.
--
-- Además: exchange_rates marca una sola tasa vigente por moneda (la última por
-- fecha) y se expone una vista con la tasa actual, con la base a 1 = 1.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

-- ── 1. payments: contra qué base se expresó amount_base ─────────────────────
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS base_currency text;

UPDATE public.payments
   SET base_currency = (SELECT code FROM public.currencies WHERE is_base LIMIT 1)
 WHERE base_currency IS NULL;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_base_currency_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_base_currency_fkey
  FOREIGN KEY (base_currency) REFERENCES public.currencies(code);

ALTER TABLE public.payments ALTER COLUMN base_currency SET NOT NULL;

COMMENT ON COLUMN public.payments.currency      IS 'Moneda en que se cobró (snapshot inmutable).';
COMMENT ON COLUMN public.payments.exchange_rate IS 'Tasa aplicada en el momento del cobro (snapshot inmutable).';
COMMENT ON COLUMN public.payments.base_currency IS 'Moneda base en que está expresado amount_base (snapshot inmutable).';

-- ── 2. memberships: misma trazabilidad para amount_paid ─────────────────────
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS currency      text;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS exchange_rate numeric(18,8);
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS base_currency text;

UPDATE public.memberships
   SET currency      = COALESCE(currency,      (SELECT code FROM public.currencies WHERE is_base LIMIT 1)),
       exchange_rate = COALESCE(exchange_rate, 1),
       base_currency = COALESCE(base_currency, (SELECT code FROM public.currencies WHERE is_base LIMIT 1));

ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS memberships_currency_fkey;
ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_currency_fkey
  FOREIGN KEY (currency) REFERENCES public.currencies(code);

ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS memberships_base_currency_fkey;
ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_base_currency_fkey
  FOREIGN KEY (base_currency) REFERENCES public.currencies(code);

ALTER TABLE public.memberships ALTER COLUMN exchange_rate SET DEFAULT 1;
ALTER TABLE public.memberships ALTER COLUMN currency      SET NOT NULL;
ALTER TABLE public.memberships ALTER COLUMN exchange_rate SET NOT NULL;
ALTER TABLE public.memberships ALTER COLUMN base_currency SET NOT NULL;

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS amount_base numeric(18,4)
  GENERATED ALWAYS AS (round(amount_paid * exchange_rate, 4)) STORED;

-- ── 3. Trigger común de snapshot de moneda ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_currency_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base text;
  v_rate numeric(18,8);
BEGIN
  SELECT code INTO v_base FROM public.currencies WHERE is_base LIMIT 1;

  IF NEW.currency IS NULL THEN
    NEW.currency := v_base;
  END IF;

  IF NEW.base_currency IS NULL THEN
    NEW.base_currency := v_base;
  END IF;

  IF NEW.exchange_rate IS NULL THEN
    IF NEW.currency = NEW.base_currency THEN
      NEW.exchange_rate := 1;
    ELSE
      SELECT rate_to_base INTO v_rate
        FROM public.exchange_rates
       WHERE currency_code = NEW.currency AND is_active
       LIMIT 1;
      NEW.exchange_rate := COALESCE(v_rate, 1);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_currency ON public.payments;
DROP TRIGGER IF EXISTS trg_payments_currency_snapshot ON public.payments;
CREATE TRIGGER trg_payments_currency_snapshot
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_currency_snapshot();

DROP TRIGGER IF EXISTS trg_memberships_currency_snapshot ON public.memberships;
CREATE TRIGGER trg_memberships_currency_snapshot
  BEFORE INSERT ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.apply_currency_snapshot();

DROP FUNCTION IF EXISTS public.payments_apply_currency_defaults();

-- ── 4. Tasa vigente única por moneda ────────────────────────────────────────
-- units_per_base es la dirección "humana" (cuántas unidades locales por 1 base)
-- y se deriva sola: nadie tiene que recordar en qué sentido va la tasa.
ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS units_per_base numeric(18,8)
  GENERATED ALWAYS AS (round(1 / rate_to_base, 8)) STORED;

ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill: solo la más reciente de cada moneda queda activa.
UPDATE public.exchange_rates r
   SET is_active = false
 WHERE EXISTS (
   SELECT 1 FROM public.exchange_rates n
    WHERE n.currency_code = r.currency_code
      AND (n.effective_from, n.id) > (r.effective_from, r.id)
 );

-- Una sola tasa activa por moneda.
CREATE UNIQUE INDEX IF NOT EXISTS uq_exchange_rates_active
  ON public.exchange_rates (currency_code) WHERE is_active;

-- Al insertar una tasa nueva, la anterior de esa moneda se desactiva sola.
CREATE OR REPLACE FUNCTION public.exchange_rates_activate_latest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.exchange_rates
       SET is_active = false
     WHERE currency_code = NEW.currency_code AND is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exchange_rates_activate ON public.exchange_rates;
CREATE TRIGGER trg_exchange_rates_activate
  BEFORE INSERT ON public.exchange_rates
  FOR EACH ROW EXECUTE FUNCTION public.exchange_rates_activate_latest();

-- ── 5. Vista de tasas actuales, con la base a 1 = 1 ─────────────────────────
-- Incluye SIEMPRE la moneda base con tasa 1, para que quien consulte no tenga
-- que tratarla como caso especial.
CREATE OR REPLACE VIEW public.vw_current_exchange_rates
WITH (security_invoker = on) AS
  SELECT
    c.code            AS currency_code,
    c.name,
    c.symbol,
    c.locale,
    c.is_base,
    c.is_secondary,
    CASE WHEN c.is_base THEN 1::numeric ELSE r.rate_to_base   END AS rate_to_base,
    CASE WHEN c.is_base THEN 1::numeric ELSE r.units_per_base END AS units_per_base,
    CASE WHEN c.is_base THEN true       ELSE r.id IS NOT NULL END AS has_rate,
    r.effective_from
  FROM public.currencies c
  LEFT JOIN public.exchange_rates r
    ON r.currency_code = c.code AND r.is_active
  WHERE c.is_active;

REVOKE ALL ON public.vw_current_exchange_rates FROM anon, authenticated;
GRANT SELECT ON public.vw_current_exchange_rates TO service_role;

REVOKE EXECUTE ON FUNCTION public.apply_currency_snapshot() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.exchange_rates_activate_latest() FROM anon, authenticated;

-- ── 6. set_base_currency: el motivo del bloqueo cambia ──────────────────────
-- Con el snapshot por operación, cambiar la base ya NO corrompe el histórico:
-- cada fila dice en qué moneda se cobró y contra qué base se expresó. Lo que
-- sigue sin ser seguro es AGREGAR: sumar amount_base a través de un cambio de
-- base mezclaría monedas distintas y daría totales silenciosamente erróneos.
-- Por eso se mantiene el bloqueo hasta que los informes sean conscientes de la
-- base; el mensaje ahora explica eso y no "se pierde el histórico".
CREATE OR REPLACE FUNCTION public.set_base_currency(p_code text, p_conversion_rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_base text;
  v_payments bigint;
  v_memberships bigint;
BEGIN
  IF p_conversion_rate IS NULL OR p_conversion_rate <= 0 THEN
    RAISE EXCEPTION 'La tasa de conversión debe ser mayor que cero.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM currencies WHERE code = p_code AND is_active) THEN
    RAISE EXCEPTION 'La moneda % no existe o está inactiva.', p_code;
  END IF;

  SELECT code INTO v_current_base FROM currencies WHERE is_base LIMIT 1;
  IF v_current_base = p_code THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_payments FROM payments;
  SELECT count(*) INTO v_memberships FROM memberships;
  IF v_payments > 0 OR v_memberships > 0 THEN
    RAISE EXCEPTION
      'No se puede cambiar la moneda base: hay % pagos y % membresías en %. El histórico se conserva intacto (cada operación guarda su moneda), pero los informes sumarían monedas distintas.',
      v_payments, v_memberships, v_current_base;
  END IF;

  UPDATE products    SET price = round(price * p_conversion_rate, 4);
  UPDATE class_plans SET price = round(price * p_conversion_rate, 4);

  UPDATE exchange_rates SET rate_to_base = rate_to_base * p_conversion_rate;
  DELETE FROM exchange_rates WHERE currency_code = p_code;

  UPDATE currencies SET is_base = false WHERE is_base;
  UPDATE currencies SET is_base = true, is_secondary = false WHERE code = p_code;
END;
$$;

REVOKE ALL ON FUNCTION public.set_base_currency(text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_base_currency(text, numeric) TO service_role;
