-- =============================================================
-- Migration: el rebut surt del que la monitora va marcar
-- Date: 2026-09-06
--
-- La junta ho ha decidit aixi: quota fixa per a qui ve sempre els mateixos
-- dies, i dies solts pels que de debo s'han fet servir. Aixo canvia
-- `acollida_month_amount()`, que fins ara comptava les dates DEMANADES.
--
-- Les regles, i el perque de cadascuna:
--
--   Mensual  -> la quota, sencera. No la mou l'assistencia: es el que es va
--               dir a la familia («la quota es la mateixa tant si en marqueu
--               dos com si en marqueu cinc») i es el que fa previsible el
--               servei, que te un cost fix cada mes vingui qui vingui.
--
--   Mensual  + dies que no eren seus -> es cobren com a dies solts. Venir un
--               dimecres quan tens dimarts i dijous ocupa una placa que algu
--               altre no va poder demanar.
--
--   Ocasional -> els dies MARCATS del mes, no els demanats. Qui demana cinc
--               dies i en fa servir tres, en paga tres.
--
--   El total d'un infant no passa mai de la quota mensual de la seva franja.
--   Sense aixo, un mensual amb sis extres pagaria mes que dos mesos.
--
-- Xarxa de seguretat: si en tot el mes no hi ha CAP assistencia registrada
-- d'aquell infant, es cobra el que va demanar. Un mes sense passar llista no
-- pot convertir-se en un mes sense cobrar; la sospita ha de ser que la llista
-- no es va passar, no que ningu va venir.
--
-- Idempotent: safe to re-run.
-- =============================================================

CREATE OR REPLACE FUNCTION public.acollida_month_amount(p_inscripcio_id uuid, p_month integer, p_year integer)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_ins record;
  v_amount numeric := 0;
  v_month_price numeric;
  v_day_price numeric;
  v_days int;
  v_extra int;
  v_has_attendance boolean;
BEGIN
  SELECT * INTO v_ins FROM public.acollida_inscripcions WHERE id = p_inscripcio_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_month_price := public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, false);
  v_day_price := coalesce(public.acollida_price_for(v_ins.rate_id, v_ins.afa_member, true), 0);

  SELECT EXISTS (
    SELECT 1 FROM public.acollida_attendance a
    WHERE a.child_id = v_ins.child_id
      AND extract(month FROM a.day)::int = p_month
      AND extract(year FROM a.day)::int = p_year
  ) INTO v_has_attendance;

  IF v_ins.modality = 'mensual' THEN
    -- Encara no ha començat: aquest mes no es cobra.
    IF v_ins.start_year IS NOT NULL AND v_ins.start_month IS NOT NULL
       AND (v_ins.start_year * 12 + v_ins.start_month) > (p_year * 12 + p_month) THEN
      RETURN 0;
    END IF;

    v_amount := coalesce(v_month_price, 0);

    -- Dies marcats que cauen fora dels seus dies de la setmana.
    IF v_has_attendance AND v_ins.child_id IS NOT NULL THEN
      SELECT count(*) INTO v_extra
      FROM public.acollida_attendance a
      WHERE a.child_id = v_ins.child_id
        AND extract(month FROM a.day)::int = p_month
        AND extract(year FROM a.day)::int = p_year
        AND NOT (extract(isodow FROM a.day)::smallint = ANY (v_ins.weekdays));

      v_amount := v_amount + coalesce(v_extra, 0) * v_day_price;
    END IF;

  ELSE
    IF v_has_attendance AND v_ins.child_id IS NOT NULL THEN
      SELECT count(*) INTO v_days
      FROM public.acollida_attendance a
      WHERE a.child_id = v_ins.child_id
        AND extract(month FROM a.day)::int = p_month
        AND extract(year FROM a.day)::int = p_year;
    ELSE
      -- Ningú va passar llista: es cobra el que la família va demanar.
      SELECT count(*) INTO v_days
      FROM unnest(v_ins.occasional_dates) d
      WHERE extract(month FROM d)::int = p_month AND extract(year FROM d)::int = p_year;
    END IF;

    IF coalesce(v_days, 0) = 0 THEN RETURN 0; END IF;
    v_amount := v_days * v_day_price;
  END IF;

  -- El sostre, sempre l'últim: ni la suma d'extres pot passar de la quota.
  IF v_month_price IS NOT NULL AND v_amount > v_month_price THEN
    v_amount := v_month_price;
  END IF;

  RETURN v_amount;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acollida_month_amount(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acollida_month_amount(uuid, integer, integer) TO authenticated;

-- ---------------------------------------------------------------
-- Qui va venir sense tenir-ho demanat.
--
-- No es genera cap rebut sol: d'un infant que no s'ha inscrit no en sabem ni
-- la franja ni si la família és sòcia, i endevinar-ho és posar un import
-- inventat a nom d'algú. Surten en una llista perquè l'AFA decideixi.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_unbilled_attendance(p_month integer, p_year integer)
RETURNS TABLE(child_id uuid, name text, surname text, course text, days integer, first_day date, last_day date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT c.id, c.name, c.surname, c.course,
         count(*)::int AS days, min(a.day) AS first_day, max(a.day) AS last_day
  FROM public.acollida_attendance a
  JOIN public.children c ON c.id = a.child_id
  WHERE extract(month FROM a.day)::int = p_month
    AND extract(year FROM a.day)::int = p_year
    AND NOT EXISTS (
      SELECT 1 FROM public.acollida_inscripcions i
      WHERE i.child_id = a.child_id
        AND i.status = 'confirmada'
        AND i.academic_year = public.academic_year_for(p_month, p_year)
    )
  GROUP BY c.id, c.name, c.surname, c.course
  ORDER BY c.surname, c.name;
$$;

REVOKE EXECUTE ON FUNCTION public.acollida_unbilled_attendance(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acollida_unbilled_attendance(integer, integer) TO authenticated;
