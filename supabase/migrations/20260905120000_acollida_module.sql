-- =============================================================
-- Migration: Acollida as a first-class module
-- Date: 2026-09-05
--
-- Until now the acollida sign-up lived in the generic forms engine: answers
-- were free text stored in the visitor's own language (production already has
-- "Tot el període" and "Todo el periodo " as two different answers to the same
-- question), with no course code, no contact details and no link to `payments`
-- — the table has zero rows with concept='acollida'.
--
-- This migration gives the service its own model:
--   1. `acollida_rates` prices become numeric (they were text: '64€', '4.5€'),
--      so a receipt can be computed instead of typed.
--   2. `acollida_inscripcions` stores one row per child, with canonical values
--      (course codes I3..6PRI, weekdays as 1..5, modality as an enum-ish check)
--      so a listing can be filtered, grouped and counted regardless of the
--      language the family used.
--   3. `generate_acollida_payments()` turns the confirmed sign-ups of a month
--      into receipts, the same way the extraescolar generators already do.
--
-- Idempotent: safe to re-run.
-- =============================================================

-- ---------------------------------------------------------------
-- 1) acollida_rates: text prices -> numeric, plus `active`.
--    The € sign and the thousands/decimal comma are stripped; a value that
--    parses to nothing becomes 0 for the NOT NULL columns and NULL for the
--    optional ones (an occasional price that was never set stays unset).
-- ---------------------------------------------------------------
DO $$
DECLARE v_type text;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'acollida_rates' AND column_name = 'preu_soci_mes';

  IF v_type = 'text' THEN
    ALTER TABLE public.acollida_rates
      ALTER COLUMN preu_soci_mes TYPE numeric
        USING coalesce(nullif(regexp_replace(replace(preu_soci_mes, ',', '.'), '[^0-9.]', '', 'g'), '')::numeric, 0),
      ALTER COLUMN preu_no_soci_mes TYPE numeric
        USING coalesce(nullif(regexp_replace(replace(preu_no_soci_mes, ',', '.'), '[^0-9.]', '', 'g'), '')::numeric, 0),
      ALTER COLUMN preu_soci_ocasional TYPE numeric
        USING nullif(regexp_replace(replace(coalesce(preu_soci_ocasional, ''), ',', '.'), '[^0-9.]', '', 'g'), '')::numeric,
      ALTER COLUMN preu_no_soci_ocasional TYPE numeric
        USING nullif(regexp_replace(replace(coalesce(preu_no_soci_ocasional, ''), ',', '.'), '[^0-9.]', '', 'g'), '')::numeric;
  END IF;
END $$;

ALTER TABLE public.acollida_rates
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.acollida_rates.active IS
  'Franja oferta al formulari públic. Una tarifa amb sol·licituds no es pot esborrar: es desactiva.';
COMMENT ON COLUMN public.acollida_rates.preu_soci_mes IS
  'Preu mensual per a famílies sòcies, en euros. Numèric des de 2026-09-05 (abans text: «64€»).';

-- ---------------------------------------------------------------
-- 2) acollida_inscripcions — una fila per infant.
--
--    `weekdays` va en enters 1..5 (dilluns..divendres) i no en etiquetes: és
--    l'única forma que «qui ve dimarts» funcioni igual tant si la família va
--    omplir el formulari en català, castellà o anglès.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.acollida_inscripcions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  academic_year text NOT NULL,

  child_name text NOT NULL,
  child_surname text NOT NULL,
  course text NOT NULL,

  rate_id uuid NOT NULL REFERENCES public.acollida_rates(id) ON DELETE RESTRICT,
  modality text NOT NULL DEFAULT 'mensual',
  weekdays smallint[] NOT NULL DEFAULT '{}',
  occasional_dates date[] NOT NULL DEFAULT '{}',
  start_month smallint,
  start_year smallint,

  parent_name text NOT NULL,
  parent_email text NOT NULL,
  parent_phone text NOT NULL,
  afa_member boolean NOT NULL DEFAULT false,

  notes text,
  status text NOT NULL DEFAULT 'pendent',
  form_language text NOT NULL DEFAULT 'ca',

  CONSTRAINT acollida_inscripcions_modality_check CHECK (modality IN ('mensual', 'ocasional')),
  CONSTRAINT acollida_inscripcions_status_check CHECK (status IN ('pendent', 'confirmada', 'baixa')),
  CONSTRAINT acollida_inscripcions_weekdays_check CHECK (
    weekdays <@ ARRAY[1, 2, 3, 4, 5]::smallint[]
  ),
  CONSTRAINT acollida_inscripcions_month_check CHECK (
    start_month IS NULL OR (start_month BETWEEN 1 AND 12)
  )
);

COMMENT ON TABLE public.acollida_inscripcions IS
  'Sol·licituds del servei d''acollida, una fila per infant. Substitueix el formulari genèric /f/acollida des del 2026-09-05.';
COMMENT ON COLUMN public.acollida_inscripcions.weekdays IS
  'Dies de la setmana en enters 1..5 (dilluns..divendres), no en etiquetes: els llistats per dia han de funcionar sigui quin sigui l''idioma del formulari.';
COMMENT ON COLUMN public.acollida_inscripcions.occasional_dates IS
  'Dates concretes quan modality = ocasional. El generador de rebuts cobra les que cauen dins del mes.';
COMMENT ON COLUMN public.acollida_inscripcions.status IS
  'pendent (rebuda) | confirmada (plaça donada, entra als rebuts) | baixa.';

CREATE INDEX IF NOT EXISTS idx_acollida_ins_year_status
  ON public.acollida_inscripcions(academic_year, status);
CREATE INDEX IF NOT EXISTS idx_acollida_ins_course
  ON public.acollida_inscripcions(course);
CREATE INDEX IF NOT EXISTS idx_acollida_ins_rate
  ON public.acollida_inscripcions(rate_id);
CREATE INDEX IF NOT EXISTS idx_acollida_ins_weekdays
  ON public.acollida_inscripcions USING gin(weekdays);
CREATE INDEX IF NOT EXISTS idx_acollida_ins_created
  ON public.acollida_inscripcions(created_at DESC);

-- academic_year i updated_at es posen sols: el formulari públic no els envia.
CREATE OR REPLACE FUNCTION public.acollida_inscripcio_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.academic_year, '') = '' THEN
      NEW.academic_year := public.academic_year_for(
        extract(month FROM now())::int, extract(year FROM now())::int);
    END IF;
    IF NEW.modality = 'mensual' AND (NEW.start_month IS NULL OR NEW.start_year IS NULL) THEN
      NEW.start_month := extract(month FROM now())::int;
      NEW.start_year := extract(year FROM now())::int;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acollida_inscripcio_defaults ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_inscripcio_defaults
  BEFORE INSERT OR UPDATE ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.acollida_inscripcio_defaults();

-- Mateix fre que a `inscripcions`: el formulari és anònim i escriu directament.
CREATE OR REPLACE FUNCTION public.check_acollida_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE recent_same_email int; recent_total int;
BEGIN
  SELECT count(*) INTO recent_same_email
  FROM public.acollida_inscripcions
  WHERE created_at > (now() - interval '60 seconds')
    AND parent_email IS NOT DISTINCT FROM NEW.parent_email;

  -- 3 germans en un minut són normals; el quart ja és un enviament repetit.
  IF recent_same_email >= 4 THEN
    RAISE EXCEPTION 'Rate limit exceeded: massa sol·licituds en poc temps'
      USING ERRCODE = 'P0429';
  END IF;

  SELECT count(*) INTO recent_total
  FROM public.acollida_inscripcions
  WHERE created_at > (now() - interval '60 seconds');

  IF recent_total >= 40 THEN
    RAISE EXCEPTION 'Rate limit exceeded: massa sol·licituds en poc temps'
      USING ERRCODE = 'P0429';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acollida_rate_limit ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_rate_limit
  BEFORE INSERT ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.check_acollida_rate_limit();

-- ---------------------------------------------------------------
-- 3) RLS: qualsevol pot demanar plaça; només l'admin llegeix i gestiona.
-- ---------------------------------------------------------------
ALTER TABLE public.acollida_inscripcions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can request acollida" ON public.acollida_inscripcions;
CREATE POLICY "Public can request acollida" ON public.acollida_inscripcions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can select acollida" ON public.acollida_inscripcions;
CREATE POLICY "Admins can select acollida" ON public.acollida_inscripcions
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update acollida" ON public.acollida_inscripcions;
CREATE POLICY "Admins can update acollida" ON public.acollida_inscripcions
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete acollida" ON public.acollida_inscripcions;
CREATE POLICY "Admins can delete acollida" ON public.acollida_inscripcions
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Els permisos de taula, explícits. La RLS de dalt no serveix de res si el rol
-- no té el GRANT: l'enviament del formulari fallaria amb «permission denied»
-- i no amb una política, que és molt més difícil de diagnosticar.
-- El formulari públic insereix sense `select()`, per això anon no llegeix mai.
GRANT INSERT ON public.acollida_inscripcions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.acollida_inscripcions TO authenticated;

-- ---------------------------------------------------------------
-- 4) Preu d'una sol·licitud i generador de rebuts.
--    Intern: el preu no s'ha de poder consultar per soci/no soci des del
--    navegador, igual que `activity_monthly_price`.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_price_for(p_rate_id uuid, p_is_member boolean, p_occasional boolean)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT CASE
    WHEN p_occasional AND p_is_member     THEN r.preu_soci_ocasional
    WHEN p_occasional AND NOT p_is_member THEN r.preu_no_soci_ocasional
    WHEN p_is_member                      THEN r.preu_soci_mes
    ELSE                                       r.preu_no_soci_mes
  END
  FROM public.acollida_rates r
  WHERE r.id = p_rate_id;
$$;
REVOKE EXECUTE ON FUNCTION public.acollida_price_for(uuid, boolean, boolean) FROM PUBLIC, anon, authenticated;

/*
 * Rebuts d'acollida d'un mes, a partir de les sol·licituds confirmades.
 *
 * Mensual: es cobra el preu del mes si la sol·licitud ja havia començat.
 * Ocasional: es cobra el preu per dia × dies demanats dins d'aquell mes; si no
 * n'hi ha cap, no es genera cap rebut (i per això el comptador no els inclou).
 *
 * Un rebut ja pagat no es toca mai: l'ON CONFLICT només actualitza els altres.
 */
CREATE OR REPLACE FUNCTION public.generate_acollida_payments(p_month integer, p_year integer)
RETURNS TABLE(success boolean, message text, payments_generated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_ins record; v_due date; v_amount numeric; v_days int; v_count int := 0; v_year_str text;
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

-- ---------------------------------------------------------------
-- 5) Un sol camí d'inscripció.
--    El formulari genèric seed (0 respostes) es tanca: la pàgina pública passa
--    a apuntar a /acollida/inscripcio. El de final de curs 25-26 es queda com
--    està, amb les seves 9 respostes, com a històric.
-- ---------------------------------------------------------------
UPDATE public.forms SET is_active = false WHERE slug = 'acollida';
