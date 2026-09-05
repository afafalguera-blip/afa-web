-- =============================================================
-- Migration: los dias sueltos nunca cuestan mas que el mes
-- Date: 2026-09-05
--
-- `generate_acollida_payments()` cobraba dias x precio/dia sin techo. Con la
-- franja 7:30-9H de socio (10 EUR/dia contra 64 EUR/mes) una familia que
-- marcaba los 13 dias que de verdad necesitaba recibia un recibo de 130 EUR:
-- el doble de lo que le habria costado apuntarse al mes entero. La aritmetica
-- castigaba la respuesta sincera.
--
-- A partir de aqui el importe ocasional se topa en la cuota mensual, y el
-- formulario publico ensena ya ese mismo numero (src/logic/acollidaPricing.ts,
-- funcion `occasionalCharge`): lo que la familia lee al apuntarse es lo que
-- dira el recibo.
--
-- Idempotente: solo reemplaza la funcion.
-- =============================================================

CREATE OR REPLACE FUNCTION public.generate_acollida_payments(p_month integer, p_year integer)
RETURNS TABLE(success boolean, message text, payments_generated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_ins record; v_due date; v_amount numeric; v_month_price numeric;
  v_days int; v_count int := 0; v_year_str text;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'No autoritzat', 0; RETURN;
  END IF;

  v_due := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '9 days')::date;
  v_year_str := public.academic_year_for(p_month, p_year);

  FOR v_ins IN
    SELECT i.*, r.horari
    FROM public.acollida_inscripcions i
    JOIN public.acollida_rates r ON r.id = i.rate_id
    WHERE i.status = 'confirmada'
      AND i.academic_year = v_year_str
  LOOP
    IF v_ins.modality = 'mensual' THEN
      IF v_ins.start_year IS NOT NULL AND v_ins.start_month IS NOT NULL
         AND (v_ins.start_year * 12 + v_ins.start_month) > (p_year * 12 + p_month) THEN
        CONTINUE;
      END IF;
      v_amount := public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, false);
    ELSE
      SELECT count(*) INTO v_days
      FROM unnest(v_ins.occasional_dates) d
      WHERE extract(month FROM d)::int = p_month AND extract(year FROM d)::int = p_year;
      IF coalesce(v_days, 0) = 0 THEN CONTINUE; END IF;

      v_amount := coalesce(public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, true), 0) * v_days;

      -- El techo: a partir de aqui salia mas barato el mes entero.
      v_month_price := public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, false);
      IF v_month_price IS NOT NULL AND v_amount > v_month_price THEN
        v_amount := v_month_price;
      END IF;
    END IF;

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
