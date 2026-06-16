-- =============================================
-- Migration: Configurable fee rules (exclusions + multiactivity)
-- Description: Adds two admin-configurable rules on top of the per-activity
--   prices (which already live in the activities table):
--     * exclude_titles  — activities NOT billed by the AFA (e.g. Anglès, paid
--                          directly to the external academy).
--     * multiactivity    — when a pupil takes >= min_activities billable
--                          activities, a single flat combined price applies
--                          (member / non-member), instead of summing each.
--   Rules live in site_config under key 'fee_rules' so they can be changed
--   from the admin panel without a migration.
-- =============================================

-- Seed default rules (only if absent).
INSERT INTO public.site_config (key, value, updated_at)
SELECT 'fee_rules',
       '{"exclude_titles":["Anglès"],"multiactivity":{"min_activities":2,"member_price":36,"non_member_price":40}}'::jsonb,
       now()
WHERE NOT EXISTS (SELECT 1 FROM public.site_config WHERE key = 'fee_rules');

-- Resolver for the rules JSON (with a safe default if the row is missing).
CREATE OR REPLACE FUNCTION public.get_fee_rules()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT value FROM public.site_config WHERE key = 'fee_rules'),
    '{"exclude_titles":["Anglès"],"multiactivity":{"min_activities":2,"member_price":36,"non_member_price":40}}'::jsonb
  );
$$;
REVOKE EXECUTE ON FUNCTION public.get_fee_rules() FROM PUBLIC, anon, authenticated;

-- True when an activity value is in the exclusion list (matched by title prefix).
CREATE OR REPLACE FUNCTION public.is_activity_excluded(p_activity text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(public.get_fee_rules()->'exclude_titles') AS t(title)
    WHERE t.title <> '' AND p_activity ILIKE t.title || '%'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_activity_excluded(text) FROM PUBLIC, anon, authenticated;

-- Total monthly fee for one pupil given their selected activities.
-- Applies exclusions first, then the multiactivity flat price or the sum.
CREATE OR REPLACE FUNCTION public.student_monthly_fee(p_activities text[], p_is_member boolean)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rules jsonb := public.get_fee_rules();
  v_min int := COALESCE((v_rules->'multiactivity'->>'min_activities')::int, 2);
  v_billable text[];
  v_n int;
  v_total numeric(10,2) := 0;
  v_activity text;
BEGIN
  v_billable := ARRAY(SELECT a FROM unnest(p_activities) a WHERE NOT public.is_activity_excluded(a));
  v_n := COALESCE(array_length(v_billable, 1), 0);
  IF v_n = 0 THEN
    RETURN 0;
  END IF;

  IF v_n >= v_min THEN
    RETURN CASE
      WHEN p_is_member THEN COALESCE((v_rules->'multiactivity'->>'member_price')::numeric, 0)
      ELSE COALESCE((v_rules->'multiactivity'->>'non_member_price')::numeric, 0)
    END;
  END IF;

  FOREACH v_activity IN ARRAY v_billable LOOP
    v_total := v_total + public.activity_monthly_price(v_activity, p_is_member);
  END LOOP;
  RETURN v_total;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.student_monthly_fee(text[], boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- Rewrite both generators to use student_monthly_fee + store the
-- billable activities (excluded ones don't appear on the AFA payment).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_monthly_payments_only_active(p_month integer, p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ins record; v_student jsonb; v_activities text[]; v_billable text[];
  v_total numeric(10,2); v_due_date date; v_count int := 0;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN RETURN QUERY SELECT false, 'Mes inválido', 0; RETURN; END IF;
  v_due_date := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  FOR v_ins IN SELECT * FROM inscripcions WHERE coalesce(status,'alta') = 'alta' LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_activities := ARRAY(SELECT jsonb_array_elements_text(v_student->'activities'));
      IF coalesce(array_length(v_activities,1),0) = 0 THEN CONTINUE; END IF;
      v_billable := ARRAY(SELECT a FROM unnest(v_activities) a WHERE NOT public.is_activity_excluded(a));
      v_total := public.student_monthly_fee(v_activities, v_ins.afa_member);
      IF coalesce(v_total,0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_student->>'course', v_billable, v_total, v_due_date,
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

CREATE OR REPLACE FUNCTION public.generate_monthly_payments(p_month integer, p_year integer)
 RETURNS TABLE(success boolean, message text, payments_generated integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_ins record; v_student jsonb; v_activities text[]; v_billable text[];
  v_total numeric(10,2); v_due_date date; v_count int := 0;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN RETURN QUERY SELECT false, 'Mes inválido', 0; RETURN; END IF;
  v_due_date := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  FOR v_ins IN SELECT * FROM inscripcions LOOP
    FOR v_student IN SELECT jsonb_array_elements(v_ins.students) LOOP
      v_activities := ARRAY(SELECT jsonb_array_elements_text(v_student->'activities'));
      IF coalesce(array_length(v_activities,1),0) = 0 THEN CONTINUE; END IF;
      v_billable := ARRAY(SELECT a FROM unnest(v_activities) a WHERE NOT public.is_activity_excluded(a));
      v_total := public.student_monthly_fee(v_activities, v_ins.afa_member);
      IF coalesce(v_total,0) <= 0 THEN CONTINUE; END IF;
      INSERT INTO payments(student_name, student_surname, course, activities, amount, due_date,
        parent_name, parent_email, parent_phone, afa_member, status, payment_month, payment_year)
      VALUES (v_student->>'name', v_student->>'surname', v_student->>'course', v_billable, v_total, v_due_date,
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
