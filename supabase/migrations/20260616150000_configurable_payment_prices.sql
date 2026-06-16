-- =============================================
-- Migration: Configurable monthly-fee prices
-- Description: Payment generation used hardcoded prices baked into the
--   generate_monthly_payments* functions (Timbals 14/18, Anglès 39/44,
--   default 20/25, Futbol-2x combo 36/40). Prices now come from the
--   `activities` table (price_member / price_non_member), which is editable
--   per activity from the admin Activities editor — so changing a fee no
--   longer requires a migration.
--
--   Matching: an inscription stores each activity as "Title (group)" or the
--   bare "Title", so we match the stored value against activities.title with
--   the longest matching title winning. Activities not found in the catalogue
--   (legacy names) fall back to a default tier so old data is never under-billed.
-- =============================================

-- ---------------------------------------------------------------
-- Helper: resolve the monthly price of one stored activity value.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activity_monthly_price(p_activity text, p_is_member boolean)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
               WHEN p_is_member THEN COALESCE(a.price_member, a.price)
               ELSE COALESCE(a.price_non_member, a.price_member, a.price)
             END
      FROM public.activities a
      WHERE a.title IS NOT NULL
        AND a.title <> ''
        AND p_activity ILIKE a.title || '%'
      ORDER BY length(a.title) DESC
      LIMIT 1
    ),
    -- Fallback for legacy / unmatched activity names.
    CASE WHEN p_is_member THEN 20.00 ELSE 25.00 END
  );
$$;
REVOKE EXECUTE ON FUNCTION public.activity_monthly_price(text, boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- Replace the active-only generator to use the table-driven price.
-- (CREATE OR REPLACE preserves the existing revoked privileges.)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_monthly_payments_only_active(p_month integer, p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ins record; v_student jsonb; v_activity text; v_activities text[];
  v_total numeric(10,2); v_due_date date; v_count int := 0;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN RETURN QUERY SELECT false, 'Mes inválido', 0; RETURN; END IF;
  v_due_date := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  FOR v_ins IN SELECT * FROM inscripcions WHERE coalesce(status,'alta') = 'alta' LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_activities := ARRAY(SELECT jsonb_array_elements_text(v_student->'activities'));
      IF coalesce(array_length(v_activities,1),0) = 0 THEN CONTINUE; END IF;
      v_total := 0;
      FOR v_activity IN SELECT unnest(v_activities) LOOP
        v_total := v_total + public.activity_monthly_price(v_activity, v_ins.afa_member);
      END LOOP;
      IF coalesce(v_total,0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_student->>'course', v_activities, v_total, v_due_date,
        v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, v_ins.afa_member, 'pending', p_month, p_year)
      ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
        activities = EXCLUDED.activities, amount = EXCLUDED.amount, due_date = EXCLUDED.due_date,
        parent_name = EXCLUDED.parent_name, parent_email = EXCLUDED.parent_email, parent_phone = EXCLUDED.parent_phone,
        afa_member = EXCLUDED.afa_member, updated_at = now()
      WHERE payments.status <> 'paid';
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT true, 'Pagos generados/actualizados', v_count;
END $function$;

-- ---------------------------------------------------------------
-- Keep the legacy (all inscriptions) generator in sync.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_monthly_payments(p_month integer, p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ins record; v_student jsonb; v_activity text; v_activities text[];
  v_total numeric(10,2); v_due_date date; v_count int := 0;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN RETURN QUERY SELECT false, 'Mes inválido', 0; RETURN; END IF;
  v_due_date := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  FOR v_ins IN SELECT * FROM inscripcions LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_activities := ARRAY(SELECT jsonb_array_elements_text(v_student->'activities'));
      IF coalesce(array_length(v_activities,1),0) = 0 THEN CONTINUE; END IF;
      v_total := 0;
      FOR v_activity IN SELECT unnest(v_activities) LOOP
        v_total := v_total + public.activity_monthly_price(v_activity, v_ins.afa_member);
      END LOOP;
      IF coalesce(v_total,0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_student->>'course', v_activities, v_total, v_due_date,
        v_ins.parent_name, v_ins.parent_email_1, v_ins.parent_phone_1, v_ins.afa_member, 'pending', p_month, p_year)
      ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
        activities = EXCLUDED.activities, amount = EXCLUDED.amount, due_date = EXCLUDED.due_date,
        parent_name = EXCLUDED.parent_name, parent_email = EXCLUDED.parent_email, parent_phone = EXCLUDED.parent_phone,
        afa_member = EXCLUDED.afa_member, updated_at = now()
      WHERE payments.status <> 'paid';
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT true, 'Pagos generados/actualizados', v_count;
END $function$;
