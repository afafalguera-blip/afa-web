-- =============================================
-- Migration: eventos de varios días (Semana Santa, colonias, festivos…)
-- Date: 2026-08-02
--
-- `events` solo tenía `event_date`, así que un evento que dura del 30/03 al
-- 06/04 había que crearlo como ocho eventos sueltos.
--
-- Se añade `end_date`, el ÚLTIMO día del evento (inclusivo):
--   * evento de un día  -> end_date = event_date
--   * evento de rango   -> end_date > event_date
--
-- `end_date` se rellena sola: un trigger la iguala a `event_date` cuando llega
-- NULL, de modo que el código antiguo que solo manda `event_date` sigue siendo
-- válido y toda fila tiene siempre un rango consultable. Eso permite que las
-- consultas por mes sean un simple solape de intervalos:
--     event_date <= fin_mes AND end_date >= inicio_mes
-- =============================================

-- ---------------------------------------------------------------
-- 1. Columna + backfill de las filas existentes.
-- ---------------------------------------------------------------
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS end_date date;

UPDATE public.events
SET end_date = event_date
WHERE end_date IS NULL;

-- ---------------------------------------------------------------
-- 2. Un rango invertido es siempre un error de datos.
--    NOT VALID para no fallar si quedara alguna fila histórica rara;
--    se valida acto seguido, que a este volumen es instantáneo.
-- ---------------------------------------------------------------
ALTER TABLE public.events
    DROP CONSTRAINT IF EXISTS events_end_date_after_start;

ALTER TABLE public.events
    ADD CONSTRAINT events_end_date_after_start
    CHECK (end_date IS NULL OR end_date >= event_date) NOT VALID;

ALTER TABLE public.events
    VALIDATE CONSTRAINT events_end_date_after_start;

-- ---------------------------------------------------------------
-- 3. end_date NULL -> event_date. Mantiene compatible al cliente viejo.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.events_fill_end_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF NEW.end_date IS NULL THEN
        NEW.end_date := NEW.event_date;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.events_fill_end_date() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS events_fill_end_date_trg ON public.events;
CREATE TRIGGER events_fill_end_date_trg
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.events_fill_end_date();

-- ---------------------------------------------------------------
-- 4. Índice para el solape de intervalos que usan las vistas de mes.
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS events_date_range_idx
    ON public.events (event_date, end_date);

COMMENT ON COLUMN public.events.end_date IS
    'Último día del evento, inclusivo. Igual a event_date en eventos de un solo día; lo rellena el trigger events_fill_end_date_trg cuando llega NULL.';
