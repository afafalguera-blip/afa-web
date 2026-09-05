-- =============================================================
-- Migration: avisar la familia per correu, i un sol lloc per al preu
-- Date: 2026-09-05
--
-- Amb les places donades per ordre d'arribada i una cua que avanca sola, hi ha
-- un moment que abans no existia: una familia pot passar de la llista d'espera
-- a tenir placa sense que ningu escrigui res. Sense correu, se n'assabenta si
-- algu se'n recorda.
--
-- 1) `acollida_month_amount()` — l'import d'una sol·licitud en un mes. El
--    generador de rebuts passa a cridar-la en comptes de portar la seva copia
--    del sostre: dues copies de la mateixa regla son dues regles que un dia
--    diran coses diferents, i el correu tambe l'haura de fer servir.
-- 2) Els webhooks que criden `send-acollida-email`.
--
-- Les capceleres del webhook porten el service_role del projecte, que no es
-- pot commitejar. En comptes d'escriure-la, es copien del webhook que ja
-- existeix a `inscripcions`: aixi aquest fitxer es pot executar tal qual, aqui
-- i a la base que aixeca el CI, sense cap secret a dins.
--
-- Idempotent: safe to re-run.
-- =============================================================

-- ---------------------------------------------------------------
-- 1) L'import, en un sol lloc.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_month_amount(p_inscripcio_id uuid, p_month integer, p_year integer)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_ins record;
  v_amount numeric;
  v_month_price numeric;
  v_days int;
BEGIN
  SELECT * INTO v_ins FROM public.acollida_inscripcions WHERE id = p_inscripcio_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_ins.modality = 'mensual' THEN
    -- Encara no ha comencat: aquest mes no es cobra.
    IF v_ins.start_year IS NOT NULL AND v_ins.start_month IS NOT NULL
       AND (v_ins.start_year * 12 + v_ins.start_month) > (p_year * 12 + p_month) THEN
      RETURN 0;
    END IF;
    RETURN public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, false);
  END IF;

  SELECT count(*) INTO v_days
  FROM unnest(v_ins.occasional_dates) d
  WHERE extract(month FROM d)::int = p_month AND extract(year FROM d)::int = p_year;

  IF coalesce(v_days, 0) = 0 THEN RETURN 0; END IF;

  v_amount := coalesce(public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, true), 0) * v_days;

  -- El sostre: a partir d'aqui sortia mes barat el mes sencer.
  v_month_price := public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, false);
  IF v_month_price IS NOT NULL AND v_amount > v_month_price THEN
    v_amount := v_month_price;
  END IF;

  RETURN v_amount;
END;
$$;

COMMENT ON FUNCTION public.acollida_month_amount(uuid, integer, integer) IS
  'Import d''una sol·licitud en un mes, amb el sostre de la quota mensual. Únic lloc on es decideix: el generador de rebuts el crida.';

REVOKE EXECUTE ON FUNCTION public.acollida_month_amount(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acollida_month_amount(uuid, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_acollida_payments(p_month integer, p_year integer)
RETURNS TABLE(success boolean, message text, payments_generated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_ins record; v_due date; v_amount numeric; v_count int := 0; v_year_str text;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN;
  END IF;

  v_due := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  v_year_str := public.academic_year_for(p_month, p_year);

  FOR v_ins IN
    SELECT i.id, i.child_name, i.child_surname, i.course, i.parent_name, i.parent_email,
           i.parent_phone, i.afa_member, r.horari
    FROM public.acollida_inscripcions i
    JOIN public.acollida_rates r ON r.id = i.rate_id
    WHERE i.status = 'confirmada'
      AND i.academic_year = v_year_str
  LOOP
    v_amount := public.acollida_month_amount(v_ins.id, p_month, p_year);
    IF coalesce(v_amount, 0) <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.payments(
      student_name, student_surname, course, concept, activities, amount, due_date,
      parent_name, parent_email, parent_phone, afa_member, status,
      payment_month, payment_year, bank_reference)
    VALUES (
      v_ins.child_name, v_ins.child_surname, v_ins.course, 'acollida',
      ARRAY['Acollida ' || v_ins.horari], v_amount, v_due,
      v_ins.parent_name, v_ins.parent_email, v_ins.parent_phone, v_ins.afa_member, 'pending',
      p_month, p_year, 'ACO-' || v_ins.id)
    ON CONFLICT ON CONSTRAINT uq_payments_student_month DO UPDATE SET
      amount = EXCLUDED.amount,
      due_date = EXCLUDED.due_date,
      activities = EXCLUDED.activities,
      parent_email = EXCLUDED.parent_email,
      parent_phone = EXCLUDED.parent_phone,
      bank_reference = EXCLUDED.bank_reference,
      updated_at = now()
    WHERE payments.status <> 'paid';

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT true, 'Rebuts d''acollida generats', v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_acollida_payments(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_acollida_payments(integer, integer) TO authenticated;

-- ---------------------------------------------------------------
-- 2) Els avisos.
--
--    Dos triggers i no un: el de l'alta parla de tota sol·licitud nova, i el
--    de la promocio nomes del salt que importa —de la cua a tenir placa—, que
--    amb un WHEN no desperta la funcio a cada `updated_at`.
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_headers text;
  v_url text := 'https://zaxbtnjkidqwzqsehvld.supabase.co/functions/v1/send-acollida-email';
BEGIN
  SELECT substring(pg_get_triggerdef(oid) from '''(\{"Content-type.*?\})''')
  INTO v_headers
  FROM pg_trigger
  WHERE tgname = 'send-inscription-email-webhook' AND NOT tgisinternal;

  -- A una base acabada de crear encara no hi ha res d'on copiar: el fitxer
  -- s'ha d'aplicar igualment, i qui el desplegui de debò hi posarà la clau.
  IF v_headers IS NULL THEN
    v_headers := '{"Content-type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}';
  END IF;

  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON public.acollida_inscripcions',
    'send-acollida-email-webhook');
  EXECUTE format(
    'CREATE TRIGGER %I AFTER INSERT ON public.acollida_inscripcions '
    'FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    'send-acollida-email-webhook', v_url, 'POST', v_headers, '{}', '5000');

  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON public.acollida_inscripcions',
    'send-acollida-promoted-webhook');
  EXECUTE format(
    'CREATE TRIGGER %I AFTER UPDATE ON public.acollida_inscripcions '
    'FOR EACH ROW WHEN (OLD.status = ''llista_espera'' AND NEW.status = ''confirmada'') '
    'EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    'send-acollida-promoted-webhook', v_url, 'POST', v_headers, '{}', '5000');
END $$;
