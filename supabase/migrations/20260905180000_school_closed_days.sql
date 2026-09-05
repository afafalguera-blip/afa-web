-- =============================================================
-- Migration: dies sense escola (calendari del curs)
-- Date: 2026-09-05
--
-- El calendari escolar no vivia enlloc: la graella d'ocupacio de l'acollida
-- comptava el 25 de desembre com un dia normal i el formulari public deixava
-- demanar placa per a un dia sense servei. Cap sistema ho podia saber, perque
-- el calendari nomes existia en un PDF penjat a la web.
--
-- La taula es del CENTRE i no de l'acollida: el mateix dia sense escola val per
-- al menjador, per les extraescolars i per a qualsevol cosa que es programi per
-- dies. Per aixo es diu `school_closed_days` i no `acollida_*`.
--
-- Idempotent: safe to re-run.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.school_closed_days (
  day date PRIMARY KEY,
  kind text NOT NULL DEFAULT 'festiu',
  label text,
  academic_year text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_closed_days_kind_check
    CHECK (kind IN ('festiu', 'lliure_disposicio', 'vacances', 'altres'))
);

COMMENT ON TABLE public.school_closed_days IS
  'Dies sense escola. Un dia que hi és aquí no té acollida: ni es pot demanar al formulari ni compta a la graella d''ocupació.';
COMMENT ON COLUMN public.school_closed_days.kind IS
  'festiu (oficial o local) | lliure_disposicio (les 4 del centre) | vacances | altres.';

CREATE INDEX IF NOT EXISTS idx_school_closed_days_year
  ON public.school_closed_days(academic_year);

ALTER TABLE public.school_closed_days ENABLE ROW LEVEL SECURITY;

-- Pública de llegir a propòsit: el calendari del formulari l'ha de pintar algú
-- que encara no s'ha identificat, i un dia sense escola no és cap secret.
DROP POLICY IF EXISTS "Anyone can read closed days" ON public.school_closed_days;
CREATE POLICY "Anyone can read closed days" ON public.school_closed_days
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can write closed days" ON public.school_closed_days;
CREATE POLICY "Admins can write closed days" ON public.school_closed_days
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.school_closed_days TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.school_closed_days TO authenticated;

-- ---------------------------------------------------------------
-- Les sis dates que el calendari 2026/27 de l'Escola Falguera diu amb totes
-- les lletres. La resta (Nadal, Setmana Santa, inici i fi de curs) va pintada
-- a la graella del PDF i no es pot llegir sense endevinar: es marca a mà des
-- de /admin/acollida, que per això té la pestanya.
-- ---------------------------------------------------------------
INSERT INTO public.school_closed_days(day, kind, label, academic_year) VALUES
  ('2026-10-09', 'festiu',            'Festa local',                '2026-27'),
  ('2026-11-02', 'lliure_disposicio', 'Festa de lliure disposició', '2026-27'),
  ('2026-12-07', 'lliure_disposicio', 'Festa de lliure disposició', '2026-27'),
  ('2027-02-08', 'lliure_disposicio', 'Festa de lliure disposició', '2026-27'),
  ('2027-04-30', 'lliure_disposicio', 'Festa de lliure disposició', '2026-27'),
  ('2027-05-17', 'festiu',            'Festa local',                '2026-27')
ON CONFLICT (day) DO NOTHING;

-- ---------------------------------------------------------------
-- L'ocupació deixa de comptar els dies sense escola.
--
-- Un dia tancat simplement no surt: no és que tingui zero places, és que no hi
-- ha servei, i una graella que ensenyés «0/10» el dia de Nadal convidaria a
-- pensar que hi cabia tothom.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_occupancy(p_from date, p_to date)
RETURNS TABLE(day date, capacity_group text, monthly integer, occasional integer, total integer, seats integer, free integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  WITH days AS (
    SELECT d::date AS day
    FROM generate_series(p_from, p_to, interval '1 day') d
    WHERE extract(isodow FROM d) BETWEEN 1 AND 5
      AND NOT EXISTS (SELECT 1 FROM public.school_closed_days c WHERE c.day = d::date)
  ),
  groups AS (
    SELECT capacity_group, seats FROM public.acollida_capacity
  ),
  grid AS (
    SELECT days.day, groups.capacity_group, groups.seats FROM days CROSS JOIN groups
  ),
  counts AS (
    SELECT
      grid.day,
      grid.capacity_group,
      grid.seats,
      count(*) FILTER (
        WHERE i.modality = 'mensual'
          AND extract(isodow FROM grid.day)::smallint = ANY (i.weekdays)
          AND (i.start_year IS NULL OR i.start_month IS NULL
               OR (i.start_year * 12 + i.start_month)
                  <= (extract(year FROM grid.day)::int * 12 + extract(month FROM grid.day)::int))
      )::int AS monthly,
      count(*) FILTER (
        WHERE i.modality = 'ocasional' AND grid.day = ANY (i.occasional_dates)
      )::int AS occasional
    FROM grid
    LEFT JOIN public.acollida_rates r ON r.capacity_group = grid.capacity_group
    LEFT JOIN public.acollida_inscripcions i
      ON i.rate_id = r.id AND i.status = 'confirmada'
    GROUP BY grid.day, grid.capacity_group, grid.seats
  )
  SELECT
    day, capacity_group, monthly, occasional,
    monthly + occasional AS total,
    seats,
    greatest(seats - (monthly + occasional), 0) AS free
  FROM counts
  ORDER BY day, capacity_group;
$$;

-- ---------------------------------------------------------------
-- I ningú es pot apuntar a un dia sense escola.
--
-- El formulari ja no els ofereix, però la comprovació viu aquí perquè el
-- formulari és anònim i escriu directe contra PostgREST: una data enviada a mà
-- entraria igual, i el dia del servei hi hauria una família a la porta.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_acollida_closed_days()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_day date;
BEGIN
  IF NEW.modality <> 'ocasional' OR coalesce(array_length(NEW.occasional_dates, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT c.day INTO v_day
  FROM public.school_closed_days c
  WHERE c.day = ANY (NEW.occasional_dates)
  ORDER BY c.day
  LIMIT 1;

  IF v_day IS NOT NULL THEN
    RAISE EXCEPTION 'No hi ha escola el %', to_char(v_day, 'DD/MM/YYYY')
      USING ERRCODE = 'P0101';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acollida_closed_days ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_closed_days
  BEFORE INSERT OR UPDATE ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.check_acollida_closed_days();
