-- ============================================================================
-- Configuración de moneda administrable desde la app (sin redeploy).
--
-- `currencies` pasa a ser la fuente de verdad: qué moneda es la base (dominante),
-- cuál se muestra como secundaria en la visualización dual, y con qué locale se
-- formatea cada una. La config en TS (APP_CONFIG.currency) queda solo como
-- fallback si la tabla no está disponible.
--
-- Cambiar la moneda BASE convierte los precios del catálogo y solo se permite
-- mientras no haya histórico financiero — ver set_base_currency() más abajo.
--
-- NO APLICADA — la aplica el humano.
-- ============================================================================

ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS locale text;
ALTER TABLE public.currencies ADD COLUMN IF NOT EXISTS is_secondary boolean NOT NULL DEFAULT false;

UPDATE public.currencies SET locale = 'en-US' WHERE code = 'USD' AND locale IS NULL;
UPDATE public.currencies SET locale = 'es-NI' WHERE code = 'NIO' AND locale IS NULL;
UPDATE public.currencies SET is_secondary = true WHERE code = 'NIO';

ALTER TABLE public.currencies ALTER COLUMN locale SET NOT NULL;

-- Como mucho UNA moneda secundaria (puede no haber ninguna).
CREATE UNIQUE INDEX IF NOT EXISTS uq_currencies_single_secondary
  ON public.currencies ((is_secondary)) WHERE is_secondary;

-- La base nunca puede ser a la vez la secundaria.
ALTER TABLE public.currencies
  DROP CONSTRAINT IF EXISTS currencies_base_not_secondary;
ALTER TABLE public.currencies
  ADD CONSTRAINT currencies_base_not_secondary CHECK (NOT (is_base AND is_secondary));

-- ── Cambio de moneda base ───────────────────────────────────────────────────
-- p_conversion_rate = cuántas unidades de la NUEVA base vale 1 unidad de la
-- base ACTUAL (ej.: pasar de USD a NIO con 36.80 → p_conversion_rate = 36.80).
--
-- Se rechaza si ya existe histórico financiero: `payments` guarda su moneda y su
-- tasa del momento, y `amount_base` es una columna generada relativa a la base;
-- si la base cambiara, todo ese histórico pasaría a significar otra cosa. Cambiar
-- la moneda funcional con operaciones registradas es un evento contable, no un
-- ajuste de configuración.
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
      'No se puede cambiar la moneda base: ya hay % pagos y % membresías registrados. El histórico quedaría inconsistente.',
      v_payments, v_memberships;
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
