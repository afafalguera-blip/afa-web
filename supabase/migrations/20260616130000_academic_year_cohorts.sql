-- =============================================
-- Migration: Academic-year cohorts
-- Description: Adds an `academic_year` cohort tag (e.g. '2026-27') to the
--   accumulative tables (inscripcions, shop_orders, finance_transactions)
--   and to payments, so each course/accounting year can be filtered and
--   archived without deleting history.
--
--   Source of truth for the *current* season lives in site_config under the
--   key 'season': { active_year, inscriptions_open, open_at, close_at }.
--   BEFORE INSERT triggers stamp new rows with that active year (payments
--   derive their cohort from payment_month/payment_year instead).
--
--   Existing rows are backfilled to the previous course ('2025-26').
-- =============================================

-- ---------------------------------------------------------------
-- 1) Helper: map a (month, year) pair to its academic year string.
--    Spanish school year runs Sept..Aug, so Jan..Aug belongs to the
--    course that started the previous September.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.academic_year_for(p_month int, p_year int)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
    WHEN p_month >= 9
      THEN p_year::text || '-' || lpad(((p_year + 1) % 100)::text, 2, '0')
      ELSE (p_year - 1)::text || '-' || lpad((p_year % 100)::text, 2, '0')
  END;
$$;

-- ---------------------------------------------------------------
-- 2) Seed the 'season' config (only if absent).
--    inscriptions_open=false: the 2026-27 form opens explicitly from admin.
-- ---------------------------------------------------------------
INSERT INTO public.site_config (key, value, updated_at)
SELECT 'season',
       '{"active_year":"2026-27","inscriptions_open":false,"open_at":null,"close_at":null}'::jsonb,
       now()
WHERE NOT EXISTS (SELECT 1 FROM public.site_config WHERE key = 'season');

-- ---------------------------------------------------------------
-- 3) Resolver for the active academic year (used by insert triggers).
--    SECURITY DEFINER so anon inserts (public inscription/shop forms)
--    can read site_config through the trigger without a direct RLS grant.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_academic_year()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT value->>'active_year' FROM public.site_config WHERE key = 'season'),
    '2026-27'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.current_academic_year() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- 4) Add columns + backfill + indexes + insert triggers per table.
-- ---------------------------------------------------------------

-- 4a) inscripcions ------------------------------------------------
ALTER TABLE public.inscripcions
  ADD COLUMN IF NOT EXISTS academic_year text;
UPDATE public.inscripcions SET academic_year = '2025-26' WHERE academic_year IS NULL;
CREATE INDEX IF NOT EXISTS idx_inscripcions_academic_year ON public.inscripcions(academic_year);

CREATE OR REPLACE FUNCTION public.set_inscripcio_academic_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.current_academic_year();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_inscripcio_academic_year() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_inscripcio_academic_year ON public.inscripcions;
CREATE TRIGGER trg_inscripcio_academic_year
  BEFORE INSERT ON public.inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.set_inscripcio_academic_year();

-- 4b) shop_orders -------------------------------------------------
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS academic_year text;
UPDATE public.shop_orders SET academic_year = '2025-26' WHERE academic_year IS NULL;
CREATE INDEX IF NOT EXISTS idx_shop_orders_academic_year ON public.shop_orders(academic_year);

CREATE OR REPLACE FUNCTION public.set_shop_order_academic_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.current_academic_year();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_shop_order_academic_year() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_shop_order_academic_year ON public.shop_orders;
CREATE TRIGGER trg_shop_order_academic_year
  BEFORE INSERT ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_shop_order_academic_year();

-- 4c) finance_transactions ---------------------------------------
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS academic_year text;
-- Backfill from the transaction date (more accurate than a flat tag).
UPDATE public.finance_transactions
  SET academic_year = public.academic_year_for(
    EXTRACT(MONTH FROM date)::int,
    EXTRACT(YEAR FROM date)::int)
  WHERE academic_year IS NULL;
CREATE INDEX IF NOT EXISTS idx_finance_tx_academic_year ON public.finance_transactions(academic_year);

CREATE OR REPLACE FUNCTION public.set_finance_tx_academic_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.academic_year_for(
      EXTRACT(MONTH FROM NEW.date)::int,
      EXTRACT(YEAR FROM NEW.date)::int);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_finance_tx_academic_year() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_finance_tx_academic_year ON public.finance_transactions;
CREATE TRIGGER trg_finance_tx_academic_year
  BEFORE INSERT ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_tx_academic_year();

-- 4d) payments ----------------------------------------------------
--     Payments already carry payment_month/payment_year, so the cohort
--     is fully derivable — no dependency on the active-season config.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS academic_year text;
UPDATE public.payments
  SET academic_year = public.academic_year_for(payment_month, payment_year)
  WHERE academic_year IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_academic_year ON public.payments(academic_year);

CREATE OR REPLACE FUNCTION public.set_payment_academic_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.academic_year := public.academic_year_for(NEW.payment_month, NEW.payment_year);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_payment_academic_year() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_payment_academic_year ON public.payments;
CREATE TRIGGER trg_payment_academic_year
  BEFORE INSERT OR UPDATE OF payment_month, payment_year ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payment_academic_year();

COMMENT ON COLUMN public.inscripcions.academic_year IS 'Course cohort, e.g. 2026-27. Stamped from site_config.season on insert.';
COMMENT ON COLUMN public.shop_orders.academic_year IS 'Course cohort, e.g. 2026-27. Stamped from site_config.season on insert.';
COMMENT ON COLUMN public.finance_transactions.academic_year IS 'Accounting-year cohort derived from the transaction date.';
COMMENT ON COLUMN public.payments.academic_year IS 'Course cohort derived from payment_month/payment_year.';
