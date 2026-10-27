-- ============================================================================
-- payments.total_amount: `> 0` → `>= 0`.
--
-- La constraint estricta (090200) rechaza pagos de 0, pero un importe 0 es
-- legítimo (cortesía, beca, promoción 100%). Además, al ser NOT VALID, cualquier
-- UPDATE posterior sobre una fila histórica con total 0 la revalida y falla —
-- que es lo que rompía el backfill de moneda de 100100.
--
-- El vector que motivó la constraint (el cliente enviaba total_amount) ya está
-- cerrado: el importe lo recalcula el RPC en SQL. Un 0 solo ocurre si el plan
-- cuesta 0. Lo que nunca es válido es un importe negativo → `>= 0`.
--
-- Corre ANTES de 100100. Idempotente.
-- NO APLICADA — la aplica el humano.
-- ============================================================================

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_total_amount_positive;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_total_amount_nonnegative;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_total_amount_nonnegative CHECK (total_amount >= 0) NOT VALID;
