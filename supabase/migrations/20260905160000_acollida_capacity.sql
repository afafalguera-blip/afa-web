-- =============================================================
-- Migration: aforo de la acollida (10 plazas por sala, no por franja)
-- Date: 2026-09-05
--
-- La acollida tiene 10 plazas, y hasta ahora nada las contaba: el formulario
-- aceptaba solicitudes sin mirar cuanta gente hay ya ese dia.
--
-- El aforo NO es por franja. Las tres franjas de manana acaban todas a las 9H,
-- asi que entre las 8:30 y las 9 estan dentro las tres a la vez: contar 10 por
-- franja dejaria entrar a 30 ninos en la misma sala. Por eso las tarifas se
-- agrupan (`capacity_group`) y las plazas son del grupo, no de la franja.
--
-- Quien ocupa plaza: SOLO las solicitudes confirmadas. Una solicitud pendiente
-- no reserva nada, de modo que dos familias no pueden llevarse la ultima plaza
-- por enviar el formulario a la vez; quien reparte es la AFA al confirmar, y
-- ahi si hay un freno que impide pasarse del aforo.
--
-- Idempotente: safe to re-run.
-- =============================================================

-- ---------------------------------------------------------------
-- 1) Grupos de aforo y sus plazas.
-- ---------------------------------------------------------------
ALTER TABLE public.acollida_rates
  ADD COLUMN IF NOT EXISTS capacity_group text NOT NULL DEFAULT 'mati';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acollida_rates_capacity_group_check'
  ) THEN
    ALTER TABLE public.acollida_rates
      ADD CONSTRAINT acollida_rates_capacity_group_check
      CHECK (capacity_group IN ('mati', 'tarda'));
  END IF;
END $$;

COMMENT ON COLUMN public.acollida_rates.capacity_group IS
  'Sala que comparteix la franja. Les de matí acaben totes a les 9H i coincideixen, així que les places són del grup i no de la franja.';

-- Las franjas que empiezan a partir de las 15H son las de tarde.
UPDATE public.acollida_rates
SET capacity_group = 'tarda'
WHERE capacity_group = 'mati'
  AND substring(horari from '^([0-9]{1,2})')::int >= 15;

CREATE TABLE IF NOT EXISTS public.acollida_capacity (
  capacity_group text PRIMARY KEY,
  seats integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acollida_capacity_group_check CHECK (capacity_group IN ('mati', 'tarda')),
  CONSTRAINT acollida_capacity_seats_check CHECK (seats >= 0)
);

COMMENT ON TABLE public.acollida_capacity IS
  'Places de cada sala. Editable des de /admin/acollida: pujar-la un dia puntual és la manera de deixar entrar una excepció, no saltar-se el límit.';

INSERT INTO public.acollida_capacity(capacity_group, seats) VALUES ('mati', 10), ('tarda', 10)
ON CONFLICT (capacity_group) DO NOTHING;

ALTER TABLE public.acollida_capacity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read acollida capacity" ON public.acollida_capacity;
CREATE POLICY "Anyone can read acollida capacity" ON public.acollida_capacity
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can write acollida capacity" ON public.acollida_capacity;
CREATE POLICY "Admins can write acollida capacity" ON public.acollida_capacity
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.acollida_capacity TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.acollida_capacity TO authenticated;

-- ---------------------------------------------------------------
-- 2) Lista de espera: un estado más.
--    La familia que pide un día lleno no se pierde; entra en cola y la AFA la
--    confirma cuando hay baja, que es justo lo que el estado dice.
-- ---------------------------------------------------------------
ALTER TABLE public.acollida_inscripcions
  DROP CONSTRAINT IF EXISTS acollida_inscripcions_status_check;
ALTER TABLE public.acollida_inscripcions
  ADD CONSTRAINT acollida_inscripcions_status_check
  CHECK (status IN ('pendent', 'confirmada', 'baixa', 'llista_espera'));

COMMENT ON COLUMN public.acollida_inscripcions.status IS
  'pendent (rebuda) | confirmada (ocupa plaça i entra als rebuts) | llista_espera (el dia era ple) | baixa.';

-- ---------------------------------------------------------------
-- 3) Ocupación día a día.
--
--    Un alta mensual ocupa cada día de la semana que marcó, desde el mes en que
--    empieza. Una ocasional ocupa sus fechas. Ambas cuentan solo si están
--    confirmadas. Devuelve una fila por día y grupo, festivos incluidos: el
--    calendario escolar no vive en esta base, así que un día sin cole aparece
--    con su ocupación teórica y no engaña a nadie que sepa que no hay servicio.
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

COMMENT ON FUNCTION public.acollida_occupancy(date, date) IS
  'Ocupació per dia i sala. Només compten les sol·licituds confirmades: una pendent no reserva res.';

REVOKE EXECUTE ON FUNCTION public.acollida_occupancy(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acollida_occupancy(date, date) TO authenticated;

-- ---------------------------------------------------------------
-- 4) Lo único que el formulario público necesita saber: qué días están llenos.
--    Devuelve fechas, nunca filas de nadie, así que puede ser anónimo.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_full_days(p_rate_id uuid, p_from date, p_to date)
RETURNS SETOF date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT o.day
  FROM public.acollida_occupancy(p_from, p_to) o
  JOIN public.acollida_rates r ON r.id = p_rate_id
  WHERE o.capacity_group = r.capacity_group
    AND o.free <= 0;
$$;

COMMENT ON FUNCTION public.acollida_full_days(uuid, date, date) IS
  'Dies sense plaça per a la sala d''aquesta tarifa. Només dates: cap dada de cap família surt d''aquí.';

REVOKE EXECUTE ON FUNCTION public.acollida_full_days(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acollida_full_days(uuid, date, date) TO anon, authenticated;

-- ---------------------------------------------------------------
-- 5) El freno: confirmar no puede pasarse del aforo.
--
--    Se comprueba al confirmar y no al recibir la solicitud, porque es al
--    confirmar cuando la plaza se ocupa de verdad. Para dejar entrar una
--    excepción se sube el aforo del grupo en /admin/acollida; así queda escrito
--    que ese día hubo 11 y no un caso especial invisible.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_acollida_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_group text;
  v_seats int;
  v_full_day date;
  v_horizon_from date;
  v_horizon_to date;
BEGIN
  IF NEW.status <> 'confirmada' OR (TG_OP = 'UPDATE' AND OLD.status = 'confirmada') THEN
    RETURN NEW;
  END IF;

  SELECT r.capacity_group INTO v_group FROM public.acollida_rates r WHERE r.id = NEW.rate_id;
  SELECT c.seats INTO v_seats FROM public.acollida_capacity c WHERE c.capacity_group = v_group;
  IF v_seats IS NULL THEN
    RETURN NEW; -- Grupo sin aforo declarado: nada que hacer cumplir.
  END IF;

  IF NEW.modality = 'ocasional' THEN
    -- Solo los días que esta solicitud pide.
    SELECT d INTO v_full_day
    FROM unnest(NEW.occasional_dates) d
    WHERE d >= current_date
      AND (
        SELECT o.free FROM public.acollida_occupancy(d, d) o WHERE o.capacity_group = v_group
      ) <= 0
    ORDER BY d
    LIMIT 1;
  ELSE
    -- Un alta mensual se repite cada semana: basta con que un día del próximo
    -- mes esté lleno para que no quepa.
    v_horizon_from := greatest(current_date, make_date(
      coalesce(NEW.start_year, extract(year FROM current_date)::int),
      coalesce(NEW.start_month, extract(month FROM current_date)::int), 1));
    v_horizon_to := v_horizon_from + 30;

    SELECT o.day INTO v_full_day
    FROM public.acollida_occupancy(v_horizon_from, v_horizon_to) o
    WHERE o.capacity_group = v_group
      AND extract(isodow FROM o.day)::smallint = ANY (NEW.weekdays)
      AND o.free <= 0
    ORDER BY o.day
    LIMIT 1;
  END IF;

  IF v_full_day IS NOT NULL THEN
    RAISE EXCEPTION 'Acollida completa el % (% places)', to_char(v_full_day, 'DD/MM/YYYY'), v_seats
      USING ERRCODE = 'P0100';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acollida_capacity ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_capacity
  BEFORE INSERT OR UPDATE ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.check_acollida_capacity();

-- ---------------------------------------------------------------
-- 6) El estado inicial lo decide la base, nunca el navegador.
--
--    Si algun dia de los que pide ya esta lleno, la solicitud nace en lista de
--    espera; si no, pendiente. Se calcula aqui y no en el cliente por dos
--    razones: el formulario es anonimo y escribe directo contra PostgREST, asi
--    que un `status` enviado a mano se colaria tal cual (incluido
--    'confirmada', que es una plaza dada sin que la AFA la de); y el aforo
--    puede llenarse entre que la familia abre el formulario y le da a enviar.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_inscripcio_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_group text;
  v_full boolean := false;
  v_from date;
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

    SELECT r.capacity_group INTO v_group FROM public.acollida_rates r WHERE r.id = NEW.rate_id;

    IF NEW.modality = 'ocasional' THEN
      SELECT EXISTS (
        SELECT 1 FROM unnest(NEW.occasional_dates) d
        WHERE d >= current_date
          AND (SELECT o.free FROM public.acollida_occupancy(d, d) o
               WHERE o.capacity_group = v_group) <= 0
      ) INTO v_full;
    ELSE
      v_from := greatest(current_date, make_date(NEW.start_year, NEW.start_month, 1));
      SELECT EXISTS (
        SELECT 1 FROM public.acollida_occupancy(v_from, v_from + 30) o
        WHERE o.capacity_group = v_group
          AND extract(isodow FROM o.day)::smallint = ANY (NEW.weekdays)
          AND o.free <= 0
      ) INTO v_full;
    END IF;

    NEW.status := CASE WHEN v_full THEN 'llista_espera' ELSE 'pendent' END;
  END IF;

  RETURN NEW;
END;
$$;

-- El orden importa: los defaults van antes que el freno del aforo, porque el
-- freno mira `NEW.status` y ese lo acaba de decidir esta funcion. Los triggers
-- BEFORE de una tabla corren por orden alfabetico de nombre, y
-- «trg_acollida_capacity» < «trg_acollida_inscripcio_defaults», asi que el
-- freno se recrea aqui con un nombre que va detras.
DROP TRIGGER IF EXISTS trg_acollida_capacity ON public.acollida_inscripcions;
DROP TRIGGER IF EXISTS trg_acollida_zz_capacity ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_zz_capacity
  BEFORE INSERT OR UPDATE ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.check_acollida_capacity();
