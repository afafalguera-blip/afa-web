-- =============================================================
-- Migration: importar el llistat del centre com una operació repetible
-- Date: 2026-09-10
--
-- PER QUÈ
-- L'importador d'abans feia `upsert` des del navegador amb la fila sencera, i
-- això tenia dos problemes que només es veuen amb dades reals:
--
--   1. Enviava `family_email: null` i `family_phone: null` a totes les files,
--      perquè el llistat del centre no en porta. En un upsert això no és "no ho
--      sé": és "posa-ho a NULL". Els 66 infants que ja tenien contacte se'l
--      haurien menjat.
--   2. No sabia de quin curs escolar era el llistat, així que no podia deixar
--      matrícula enlloc.
--
-- Passa a RPC per una raó de fons: importar el padró no és escriure files, són
-- quatre coses alhora (crear qui no hi és, respectar el contacte de qui sí,
-- matricular-los tots a l'any que toca i, si és el llistat sencer, donar de
-- baixa qui ja no hi surt). Això és una transacció, i una transacció no es fa
-- des del client.
--
-- QUI MANA SOBRE QUÈ
-- El llistat del centre mana sobre el nom i el curs: si allà diu «García» i a
-- la base hi ha «Garcia», guanya el llistat. No mana sobre el contacte: allà no
-- n'hi ha, i el que no es diu no esborra res.
--
-- Aditiva: crea una funció. Es revierte amb un DROP FUNCTION.
-- =============================================================

CREATE OR REPLACE FUNCTION public.import_children_roster(
  p_academic_year text,
  p_rows jsonb,
  p_deactivate_missing boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  v_total       int := 0;
  v_unics       int := 0;
  v_created     int := 0;
  v_updated     int := 0;
  v_enrolled    int := 0;
  v_deactivated int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Només un administrador pot importar el padró';
  END IF;

  IF p_academic_year IS NULL OR btrim(p_academic_year) = '' THEN
    RAISE EXCEPTION 'Cal dir de quin curs escolar és el llistat';
  END IF;

  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'El llistat és buit';
  END IF;

  CREATE TEMP TABLE _roster ON COMMIT DROP AS
  SELECT btrim(coalesce(r->>'name', ''))    AS name,
         btrim(coalesce(r->>'surname', '')) AS surname,
         btrim(coalesce(r->>'course', ''))  AS course,
         nullif(btrim(coalesce(r->>'list_number', '')), '')::smallint AS list_number,
         nullif(btrim(coalesce(r->>'family_email', '')), '')          AS family_email,
         nullif(btrim(coalesce(r->>'family_phone', '')), '')          AS family_phone
  FROM jsonb_array_elements(p_rows) r;

  DELETE FROM _roster WHERE name = '' OR surname = '' OR course = '';
  SELECT count(*) INTO v_total FROM _roster;

  -- Dos alumnes amb el mateix nom i cognoms col·lapsarien en un de sol, i
  -- ningú se n'adonaria mirant 186 línies. Es queda un i el recompte ho diu.
  CREATE TEMP TABLE _roster_unic ON COMMIT DROP AS
  SELECT DISTINCT ON (public.child_match_key(name, surname)) *
  FROM _roster
  ORDER BY public.child_match_key(name, surname), list_number NULLS LAST;

  SELECT count(*) INTO v_unics FROM _roster_unic;

  WITH ins AS (
    INSERT INTO public.children (name, surname, course, family_email, family_phone, source)
    SELECT name, surname, course, family_email, family_phone, 'import' FROM _roster_unic
    ON CONFLICT (match_key) DO UPDATE SET
      name         = EXCLUDED.name,
      surname      = EXCLUDED.surname,
      -- El llistat no porta contacte: el que no es diu no esborra res.
      family_email = COALESCE(children.family_email, EXCLUDED.family_email),
      family_phone = COALESCE(children.family_phone, EXCLUDED.family_phone),
      active       = true,
      updated_at   = now()
    RETURNING (xmax = 0) AS inserted
  )
  SELECT count(*) FILTER (WHERE inserted),
         count(*) FILTER (WHERE NOT inserted)
    INTO v_created, v_updated
  FROM ins;

  WITH enr AS (
    INSERT INTO public.child_enrollments (child_id, academic_year, course, list_number, source)
    SELECT c.id, btrim(p_academic_year), r.course, r.list_number, 'import'
    FROM _roster_unic r
    JOIN public.children c ON c.match_key = public.child_match_key(r.name, r.surname)
    ON CONFLICT (child_id, academic_year) DO UPDATE SET
      course      = EXCLUDED.course,
      list_number = COALESCE(EXCLUDED.list_number, child_enrollments.list_number),
      source      = 'import',
      updated_at  = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_enrolled FROM enr;

  -- Només quan qui importa diu que és el llistat sencer del centre. Amb un
  -- llistat d'un sol curs, això donaria de baixa tota l'escola.
  IF p_deactivate_missing THEN
    UPDATE public.children c
    SET active = false, updated_at = now()
    WHERE c.active
      AND NOT EXISTS (
        SELECT 1 FROM public.child_enrollments e
        WHERE e.child_id = c.id AND e.academic_year = btrim(p_academic_year)
      );
    GET DIAGNOSTICS v_deactivated = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'academic_year', btrim(p_academic_year),
    'llegides',      v_total,
    'homonims',      v_total - v_unics,
    'nous',          v_created,
    'actualitzats',  v_updated,
    'matriculats',   v_enrolled,
    'donats_baixa',  v_deactivated
  );
END;
$fn$;

COMMENT ON FUNCTION public.import_children_roster(text, jsonb, boolean) IS
  'Importa el llistat d''alumnes del centre per a un curs escolar: crea els infants que falten, respecta el contacte dels que ja hi són, els matricula a l''any indicat i (només si p_deactivate_missing) dona de baixa els que ja no surten al llistat. Retorna el recompte del que ha fet.';

REVOKE ALL ON FUNCTION public.import_children_roster(text, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_children_roster(text, jsonb, boolean) TO authenticated;
