-- =============================================
-- Migration: Payment concepts (extraescolar | acollida | soci | llibres)
-- Description: Generalises the `payments` table so a single admin panel can
--   manage the AFA's four billable concepts for a course. Adds a `concept`
--   column, widens the per-student/month unique key to include it (so an
--   extraescolar and an acollida receipt for the same pupil/month no longer
--   collide), and adds generators for member fees (one per family), for
--   socialization books (one per pupil, price by course) and an acollida
--   month roll-forward. Book prices live in site_config.book_prices so they
--   stay admin-editable without a migration. Member fee reuses fees.annual_fee_amount.
--
--   Follows the existing hardening: generators are callable by authenticated
--   admins (guarded by is_admin()); price helpers are internal-only (REVOKEd).
-- =============================================

-- ---------------------------------------------------------------
-- 1) concept column + check + index
-- ---------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS concept text NOT NULL DEFAULT 'extraescolar';

DO $$ BEGIN
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_concept_check
    CHECK (concept IN ('extraescolar','acollida','soci','llibres'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_payments_concept ON public.payments(concept);

-- ---------------------------------------------------------------
-- 2) Widen the per-student/month unique key to include concept.
--    Kept under the SAME name so the extraescolar generators, which use
--    `ON CONFLICT ON CONSTRAINT uq_payments_student_month`, keep working
--    untouched. Adding columns only ever makes a UNIQUE more permissive,
--    so existing rows (all concept='extraescolar') can't violate it.
-- ---------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS uq_payments_student_month;
EXCEPTION WHEN others THEN NULL; END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT uq_payments_student_month
  UNIQUE (student_name, student_surname, course, concept, payment_month, payment_year);

-- ---------------------------------------------------------------
-- 3) Book prices config (admin-editable) + resolver.
--    Course codes match the public inscription form values (I3..6PRI).
--    Infantil defaults to 0 (skipped by the generator).
-- ---------------------------------------------------------------
INSERT INTO public.site_config (key, value, updated_at)
SELECT 'book_prices',
       '{"default":30,"map":{"I3":0,"I4":0,"I5":0,"1PRI":30,"2PRI":30,"3PRI":30,"4PRI":30,"5PRI":30,"6PRI":30}}'::jsonb,
       now()
WHERE NOT EXISTS (SELECT 1 FROM public.site_config WHERE key = 'book_prices');

CREATE OR REPLACE FUNCTION public.book_price_for(p_course text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT (value->'map'->>p_course)::numeric FROM public.site_config WHERE key = 'book_prices'),
    (SELECT (value->>'default')::numeric      FROM public.site_config WHERE key = 'book_prices'),
    0
  );
$$;
REVOKE EXECUTE ON FUNCTION public.book_price_for(text) FROM PUBLIC, anon, authenticated;

-- Annual member fee resolver (reads the existing 'fees' config).
CREATE OR REPLACE FUNCTION public.afa_annual_fee()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT (value->>'annual_fee_amount')::numeric FROM public.site_config WHERE key = 'fees'),
    0
  );
$$;
REVOKE EXECUTE ON FUNCTION public.afa_annual_fee() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- 4) Member fee generator — ONE receipt per family (inscription),
--    regardless of how many children, for the given course start year.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_soci_payments(p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ins record; v_fee numeric; v_year_str text; v_due date; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN; END IF;
  v_fee := public.afa_annual_fee();
  IF coalesce(v_fee, 0) <= 0 THEN
    RETURN QUERY SELECT false, 'Quota de soci no configurada (Config > Quotes)', 0; RETURN;
  END IF;
  v_year_str := public.academic_year_for(9, p_year);
  v_due := make_date(p_year, 10, 1);
  FOR v_ins IN
    SELECT * FROM inscripcions
    WHERE afa_member = true
      AND coalesce(status, 'alta') = 'alta'
      AND coalesce(academic_year, v_year_str) = v_year_str
  LOOP
    INSERT INTO payments(student_name, student_surname, course, concept, activities, amount, due_date,
      parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year, bank_reference)
    VALUES (coalesce(NULLIF(v_ins.parent_name, ''), 'Família'), '', '', 'soci', ARRAY['Quota soci AFA'], v_fee, v_due,
      v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, true, 'pending', 9, p_year, 'INS-' || v_ins.id)
    ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
      amount = EXCLUDED.amount, due_date = EXCLUDED.due_date,
      parent_email = EXCLUDED.parent_email, parent_phone = EXCLUDED.parent_phone,
      bank_reference = EXCLUDED.bank_reference, updated_at = now()
    WHERE payments.status <> 'paid';
    v_count := v_count + 1;
  END LOOP;
  RETURN QUERY SELECT true, 'Quotes de soci generades/actualitzades', v_count;
END $function$;

-- ---------------------------------------------------------------
-- 5) Socialization-books generator — ONE receipt per pupil, priced by course.
--    Pupils whose course price is 0 (e.g. infantil) are skipped; the admin
--    prunes any non-participant afterwards.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_book_payments(p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ins record; v_student jsonb; v_course text; v_amount numeric;
  v_year_str text; v_due date; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN; END IF;
  v_year_str := public.academic_year_for(9, p_year);
  v_due := make_date(p_year, 9, 15);
  FOR v_ins IN
    SELECT * FROM inscripcions
    WHERE coalesce(status, 'alta') = 'alta'
      AND coalesce(academic_year, v_year_str) = v_year_str
  LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_course := v_student->>'course';
      v_amount := public.book_price_for(v_course);
      IF coalesce(v_amount, 0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, concept, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_course, 'llibres', ARRAY['Llibres socialització'], v_amount, v_due,
        v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, v_ins.afa_member, 'pending', 9, p_year)
      ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
        amount = EXCLUDED.amount, due_date = EXCLUDED.due_date, updated_at = now()
      WHERE payments.status <> 'paid';
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT true, 'Cobraments de llibres generats/actualitzats', v_count;
END $function$;

-- ---------------------------------------------------------------
-- 6) Acollida month roll-forward — duplicate a month's acollida receipts
--    into the next month (new due date, reset to pending), skipping any that
--    already exist. Month 1 is created manually / assisted.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rollover_acollida_payments(
  p_from_month integer, p_from_year integer, p_to_month integer, p_to_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_due date; v_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN; END IF;
  v_due := (date_trunc('month', make_date(p_to_year, p_to_month, 1)) + interval '9 days')::date;
  INSERT INTO payments(student_name, student_surname, course, concept, activities, amount, due_date,
    parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year, notes)
  SELECT student_name, student_surname, course, 'acollida', activities, amount, v_due,
    parent_name, parent_email, parent_phone, afa_member, 'pending', p_to_month, p_to_year, notes
  FROM payments
  WHERE concept = 'acollida' AND payment_month = p_from_month AND payment_year = p_from_year
  ON CONFLICT ON CONSTRAINT uq_payments_student_month DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT true, 'Rebuts d''acollida duplicats', v_count;
END $function$;

COMMENT ON COLUMN public.payments.concept IS 'Billing concept: extraescolar | acollida | soci | llibres.';
