-- =============================================================
-- Migration: la placa es del primer que arriba, i s'aprova sola
-- Date: 2026-09-05
--
-- Fins ara una sol·licitud entrava com a `pendent` i no reservava res: la
-- placa nomes s'ocupava quan algu de l'AFA la confirmava. La junta ha decidit
-- el contrari: ordre d'arribada i aprovacio automatica. Qui envia el formulari
-- i troba lloc te la placa a l'instant; qui no en troba, entra a la cua.
--
-- Aixo obliga a dues coses que abans no calien:
--
-- 1) SERIALITZAR. Amb aprovacio manual, dues families no podien endur-se la
--    mateixa placa: confirmava una persona, d'una en una. Ara dues families
--    poden prémer «enviar» al mateix segon, i sense un pany totes dues
--    llegirien «queden 1» i totes dues entrarien. Un advisory lock per sala
--    posa les insercions en fila; nomes dura el que dura la transaccio.
--
-- 2) PROMOURE LA CUA. Si la placa s'ocupa sola, quan es buida tambe s'ha
--    d'omplir sola, o la cua nomes avancaria si algu se'n recorda. En donar-se
--    una baixa —o en pujar les places d'una sala— el primer de la llista
--    d'espera que hi capiga passa a confirmada, per ordre d'arribada.
--
-- Idempotent: safe to re-run.
-- =============================================================

-- ---------------------------------------------------------------
-- 1) L'estat inicial: confirmada si hi ha lloc, llista d'espera si no.
--
--    El pany es demana aqui, al primer trigger que corre, i val per a tota la
--    transaccio: el fre de l'aforament que ve despres ja el troba agafat.
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

    -- Una sala, una fila. Dues sol·licituds de la mateixa sala no es compten
    -- l'una a l'altra si arriben alhora; les de sales diferents no s'esperen.
    PERFORM pg_advisory_xact_lock(hashtext('acollida_capacity:' || coalesce(v_group, '')));

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

    NEW.status := CASE WHEN v_full THEN 'llista_espera' ELSE 'confirmada' END;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- 2) La cua avança sola.
--
--    Es recorre per `created_at`: l'ordre d'arribada, que es el criteri que va
--    decidir la junta. Cada fila s'intenta confirmar per separat i, si el fre
--    de l'aforament la rebutja, es queda a la cua i es passa a la seguent —una
--    sol·licitud de dos dies pot no cabre mentre la de darrere, d'un sol dia,
--    si que hi cap.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_promote_waitlist(p_group text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_row record;
  v_promoted int := 0;
BEGIN
  FOR v_row IN
    SELECT i.id
    FROM public.acollida_inscripcions i
    JOIN public.acollida_rates r ON r.id = i.rate_id
    WHERE i.status = 'llista_espera'
      AND r.capacity_group = p_group
    ORDER BY i.created_at
  LOOP
    BEGIN
      UPDATE public.acollida_inscripcions SET status = 'confirmada' WHERE id = v_row.id;
      v_promoted := v_promoted + 1;
    EXCEPTION WHEN OTHERS THEN
      -- No hi cabia: es queda a la cua, sense el seu lloc.
      CONTINUE;
    END;
  END LOOP;

  RETURN v_promoted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acollida_promote_waitlist(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acollida_promote_waitlist(text) TO authenticated;

-- Una plaça que es buida crida la cua. Nomes quan una confirmada deixa de
-- ser-ho: confirmar-ne una altra no buida res, i sense aquesta condicio la
-- promocio es cridaria a si mateixa.
CREATE OR REPLACE FUNCTION public.acollida_on_place_freed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_group text;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT (OLD.status = 'confirmada' AND NEW.status <> 'confirmada') THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.status <> 'confirmada' THEN
    RETURN NULL;
  END IF;

  SELECT r.capacity_group INTO v_group FROM public.acollida_rates r WHERE r.id = OLD.rate_id;
  IF v_group IS NOT NULL THEN
    PERFORM public.acollida_promote_waitlist(v_group);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_acollida_place_freed ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_place_freed
  AFTER UPDATE OR DELETE ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.acollida_on_place_freed();

-- Pujar les places d'una sala tambe obre lloc, i ha de moure la cua igual.
CREATE OR REPLACE FUNCTION public.acollida_on_seats_raised()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  IF NEW.seats > OLD.seats THEN
    PERFORM public.acollida_promote_waitlist(NEW.capacity_group);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_acollida_seats_raised ON public.acollida_capacity;
CREATE TRIGGER trg_acollida_seats_raised
  AFTER UPDATE ON public.acollida_capacity
  FOR EACH ROW EXECUTE FUNCTION public.acollida_on_seats_raised();

-- ---------------------------------------------------------------
-- 3) El fre de l'aforament, amb el mateix pany.
--
--    Cal tambe aqui: una confirmacio feta a ma des del panell no passa pels
--    defaults, i sense el pany dues persones confirmant alhora podrien
--    passar-se de l'aforament exactament igual que dues families.
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
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('acollida_capacity:' || coalesce(v_group, '')));

  IF NEW.modality = 'ocasional' THEN
    SELECT d INTO v_full_day
    FROM unnest(NEW.occasional_dates) d
    WHERE d >= current_date
      AND (
        SELECT o.free FROM public.acollida_occupancy(d, d) o WHERE o.capacity_group = v_group
      ) <= 0
    ORDER BY d
    LIMIT 1;
  ELSE
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

COMMENT ON COLUMN public.acollida_inscripcions.status IS
  'confirmada (té plaça; s''aprova sola per ordre d''arribada) | llista_espera (el dia era ple) | pendent (l''AFA l''ha tornada a obrir a mà) | baixa.';
