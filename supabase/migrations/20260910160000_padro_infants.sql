-- =============================================================
-- Migration: el padró d'infants deixa de ser el seu curs
-- Date: 2026-09-10
--
-- PER QUÈ
-- `children` identifica l'infant per (nom, curs). Funcionava mentre el cens
-- s'omplia sol des dels formularis d'un any, però el curs canvia cada setembre:
-- el mateix infant que el juny era 2PRI al setembre és 3PRI, i com que el curs
-- forma part de la clau, entra com una fila nova. Ja ha passat: 83 files per a
-- 76 infants, set d'ells duplicats per la promoció. I la fila vella se'n duu el
-- correu i el telèfon de la família, que la nova no té.
--
-- La solució no és una clau més llarga: és separar qui és l'infant de què fa
-- aquest any. `children` passa a ser la persona i `child_enrollments` la
-- matrícula d'un any. Importar el llistat del centre cada setembre deixa de
-- duplicar ningú i passa a ser una operació repetible.
--
-- LA CLAU DE COMPARACIÓ, TAMBÉ
-- `match_key` no treia accents: «García» i «Garcia» eren dos infants. El
-- llistat del centre ve accentuat i els formularis els omplen les famílies, així
-- que la barreja és garantida. Passa a una funció, `child_match_key()`, perquè
-- el trigger de l'acollida i l'importador facin servir la mateixa (fins ara cada
-- un duia la fórmula copiada a dins).
--
-- Toca dades: hi ha snapshot a `children_backup_20260910`.
-- Idempotent: safe to re-run.
-- =============================================================

-- ---------------------------------------------------------------
-- 0) Xarxa de seguretat. El pla de Supabase no té restauració.
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS public.children_backup_20260910;
CREATE TABLE public.children_backup_20260910 AS SELECT * FROM public.children;

-- `CREATE TABLE ... AS SELECT` no hereta la RLS de l'origen: la còpia neix
-- oberta. I amb els GRANT per defecte (20260810000000_grants_por_defecto.sql
-- dona SELECT a `anon` sobre tot public), aquesta còpia —noms, cursos, correus
-- i telèfons de menors— seria llegible amb la clau anon, que viatja dins del
-- bundle de la web. Sense cap política: aquí no hi ha d'entrar ningú excepte
-- service_role. Ho va aturar scripts/check-rls.sql abans d'arribar a producció.
ALTER TABLE public.children_backup_20260910 ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.children_backup_20260910 IS
  'Còpia de `children` del 2026-09-10, just abans de partir la taula en persona (children) i matrícula (child_enrollments) i de deduplicar per la clau nova sense accents. Es pot esborrar quan el padró del curs 26-27 estigui importat i revisat, i com a molt tard el 2026-12-31.';

-- ---------------------------------------------------------------
-- 1) Una sola definició de "el mateix infant".
--    Sense accents, en minúscules i sense espais de sobra: el llistat del
--    centre ve accentuat i els formularis els omplen les famílies.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.child_match_key(p_name text, p_surname text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $fn$
  SELECT regexp_replace(
    translate(
      lower(btrim(coalesce(p_name, '') || ' ' || coalesce(p_surname, ''))),
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
    ),
    '\s+', ' ', 'g'
  );
$fn$;

COMMENT ON FUNCTION public.child_match_key(text, text) IS
  'Clau de comparació d''un infant: nom i cognoms sense accents, en minúscules i amb un sol espai. La fan servir la columna generada de children, el trigger de l''acollida i l''importador del padró.';

-- ---------------------------------------------------------------
-- 2) La matrícula d'un any.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.child_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  course text NOT NULL,

  -- El número de llista del centre. Serveix per ordenar la llista igual que
  -- l'ordena l'escola, que és com la llegeix qui passa llista.
  list_number smallint,

  source text NOT NULL DEFAULT 'manual',

  CONSTRAINT child_enrollments_source_check CHECK (source IN ('manual', 'import', 'acollida', 'inscripcions', 'backfill'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_child_enrollment_year
  ON public.child_enrollments(child_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_child_enrollments_year_course
  ON public.child_enrollments(academic_year, course);

COMMENT ON TABLE public.child_enrollments IS
  'Què fa cada infant cada curs: any acadèmic, curs i número de llista. Abans el curs vivia dins de `children` i la promoció de setembre duplicava l''infant.';
COMMENT ON COLUMN public.child_enrollments.list_number IS
  'Número de llista al llistat del centre. Pot ser NULL: només el porten les files importades del llistat oficial.';

CREATE OR REPLACE FUNCTION public.child_enrollments_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_catalog' AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$fn$;

DROP TRIGGER IF EXISTS trg_child_enrollments_touch ON public.child_enrollments;
CREATE TRIGGER trg_child_enrollments_touch BEFORE UPDATE ON public.child_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.child_enrollments_touch();

ALTER TABLE public.child_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage enrollments" ON public.child_enrollments;
CREATE POLICY "Admins manage enrollments" ON public.child_enrollments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_enrollments TO authenticated;

-- ---------------------------------------------------------------
-- 3) Backfill: cada fila de `children` era, de fet, una matrícula.
--    L'any surt d'on va sortir la fila (l'acollida i les inscripcions el
--    guarden); per a les tres que no es poden derivar, del mes en què es va
--    crear la fila.
-- ---------------------------------------------------------------
INSERT INTO public.child_enrollments (child_id, academic_year, course, source)
SELECT c.id,
       COALESCE(
         (SELECT max(a.academic_year) FROM public.acollida_inscripcions a WHERE a.child_id = c.id),
         (SELECT max(i.academic_year)
            FROM public.inscripcions i
            CROSS JOIN LATERAL jsonb_array_elements(coalesce(i.students, '[]'::jsonb)) s
           WHERE public.child_match_key(s->>'name', s->>'surname') = public.child_match_key(c.name, c.surname)
             AND s->>'course' = c.course),
         public.academic_year_for(
           EXTRACT(MONTH FROM c.created_at)::int,
           EXTRACT(YEAR FROM c.created_at)::int
         )
       ),
       c.course,
       'backfill'
FROM public.children c
ON CONFLICT (child_id, academic_year) DO NOTHING;

-- ---------------------------------------------------------------
-- 4) Fusionar els duplicats.
--    Sobreviu la fila amb contacte (i, si empaten, la més recent). El contacte
--    de la que marxa no es perd: s'hi aboca amb COALESCE.
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS _child_merge;
CREATE TEMP TABLE _child_merge AS
WITH ranked AS (
  SELECT id,
         public.child_match_key(name, surname) AS mk,
         row_number() OVER (
           PARTITION BY public.child_match_key(name, surname)
           ORDER BY (family_email IS NOT NULL) DESC,
                    (family_phone IS NOT NULL) DESC,
                    created_at DESC
         ) AS rn
  FROM public.children
)
SELECT r.id AS loser_id, k.id AS keeper_id
FROM ranked r
JOIN ranked k ON k.mk = r.mk AND k.rn = 1
WHERE r.rn > 1;

UPDATE public.children c
SET family_email = COALESCE(c.family_email, l.family_email),
    family_phone = COALESCE(c.family_phone, l.family_phone),
    afa_member   = COALESCE(c.afa_member, l.afa_member),
    notes        = COALESCE(c.notes, l.notes)
FROM _child_merge m
JOIN public.children l ON l.id = m.loser_id
WHERE c.id = m.keeper_id;

UPDATE public.child_enrollments e SET child_id = m.keeper_id
FROM _child_merge m
WHERE e.child_id = m.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM public.child_enrollments k
    WHERE k.child_id = m.keeper_id AND k.academic_year = e.academic_year
  );

UPDATE public.acollida_inscripcions a SET child_id = m.keeper_id
FROM _child_merge m WHERE a.child_id = m.loser_id;

UPDATE public.acollida_attendance t SET child_id = m.keeper_id
FROM _child_merge m
WHERE t.child_id = m.loser_id
  AND NOT EXISTS (
    SELECT 1 FROM public.acollida_attendance k
    WHERE k.child_id = m.keeper_id AND k.day = t.day
  );

DELETE FROM public.children c USING _child_merge m WHERE c.id = m.loser_id;

DROP TABLE IF EXISTS _child_merge;

-- ---------------------------------------------------------------
-- 5) La clau nova. `match_key` es redefineix (sense accents) i deixa de
--    dur el curs al costat: dos homònims de cursos diferents eren el truc per
--    conviure, i ara conviuen per matrícules.
-- ---------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_children_match;
ALTER TABLE public.children DROP COLUMN IF EXISTS match_key;
ALTER TABLE public.children
  ADD COLUMN match_key text GENERATED ALWAYS AS (public.child_match_key(name, surname)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS uq_children_match ON public.children(match_key);

COMMENT ON COLUMN public.children.match_key IS
  'Nom i cognoms normalitzats per public.child_match_key(): sense accents, minúscules, un sol espai. És la identitat de l''infant; el curs viu a child_enrollments.';

-- ---------------------------------------------------------------
-- 6) `children.course` passa a ser derivada.
--    No s'esborra perquè mig panell la llegeix (passar llista, filtres, tarifes)
--    i trencar-ho no aporta res: el que canvia és qui mana. La veritat és la
--    matrícula; aquesta columna és la còpia del curs de la matrícula més recent,
--    mantinguda per trigger. No l'escriguis a mà.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.children_sync_course()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $fn$
DECLARE v_child uuid;
BEGIN
  -- En un trigger DELETE, NEW no existeix: llegir-lo peta.
  IF TG_OP = 'DELETE' THEN
    v_child := OLD.child_id;
  ELSE
    v_child := NEW.child_id;
  END IF;

  UPDATE public.children c
  SET course = COALESCE(
        (SELECT e.course FROM public.child_enrollments e
          WHERE e.child_id = v_child
          ORDER BY e.academic_year DESC LIMIT 1),
        c.course
      )
  WHERE c.id = v_child;

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_children_sync_course ON public.child_enrollments;
CREATE TRIGGER trg_children_sync_course
  AFTER INSERT OR DELETE OR UPDATE OF course, academic_year, child_id ON public.child_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.children_sync_course();

COMMENT ON COLUMN public.children.course IS
  'DERIVADA: curs de la matrícula més recent (child_enrollments), mantinguda per trigger. Es conserva perquè el panell la llegeix; la font de veritat és child_enrollments.';

UPDATE public.children c
SET course = e.course
FROM (
  SELECT DISTINCT ON (child_id) child_id, course
  FROM public.child_enrollments
  ORDER BY child_id, academic_year DESC
) e
WHERE e.child_id = c.id AND c.course IS DISTINCT FROM e.course;

-- ---------------------------------------------------------------
-- 7) El trigger de l'acollida, amb la clau nova i sense la fórmula copiada.
--    També hi deixa matrícula: una sol·licitud d'acollida diu de quin curs és
--    l'infant aquell any, i abans això només vivia dins de `children.course`.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_link_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $fn$
DECLARE v_id uuid;
BEGIN
  IF NEW.child_id IS NULL THEN
    SELECT id INTO v_id FROM public.children
    WHERE match_key = public.child_match_key(NEW.child_name, NEW.child_surname);

    IF v_id IS NULL THEN
      INSERT INTO public.children (name, surname, course, family_email, family_phone, afa_member, source)
      VALUES (btrim(NEW.child_name), btrim(NEW.child_surname), NEW.course,
              NEW.parent_email, NEW.parent_phone, NEW.afa_member, 'acollida')
      ON CONFLICT (match_key) DO UPDATE SET
        family_email = COALESCE(children.family_email, EXCLUDED.family_email),
        family_phone = COALESCE(children.family_phone, EXCLUDED.family_phone),
        updated_at = now()
      RETURNING id INTO v_id;
    END IF;

    NEW.child_id := v_id;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_acollida_link_child ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_link_child
  BEFORE INSERT OR UPDATE OF child_name, child_surname, course ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.acollida_link_child();

-- La matrícula que deixa una sol·licitud d'acollida s'escriu després, quan la
-- fila ja existeix: en un BEFORE INSERT encara no hi ha `id` a què lligar-la
-- i el child_id que acabem d'assignar no és visible per a cap altra sentència.
CREATE OR REPLACE FUNCTION public.acollida_enroll_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $fn$
BEGIN
  IF NEW.child_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.child_enrollments (child_id, academic_year, course, source)
  VALUES (NEW.child_id, NEW.academic_year, NEW.course, 'acollida')
  ON CONFLICT (child_id, academic_year) DO UPDATE
    SET course = EXCLUDED.course, updated_at = now();

  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_acollida_enroll_child ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_enroll_child
  AFTER INSERT OR UPDATE OF child_id, course, academic_year ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.acollida_enroll_child();
