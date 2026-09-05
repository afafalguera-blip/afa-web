-- =============================================================
-- Migration: cens d'infants, passar llista i l'enllac de la monitora
-- Date: 2026-09-06
--
-- Fins ara els infants no existien enlloc: vivien dins de cada inscripcio
-- —`inscripcions` els guarda en un JSONB, `acollida_inscripcions` una fila per
-- infant— i a `payments` nomes hi ha el nom escrit a ma. El mateix infant es
-- tres textos diferents que ningu pot creuar, i per passar llista cal una
-- llista, no tres.
--
-- Tres peces:
--   1. `children`, el cens. S'omple sol amb el que ja hi ha i s'hi poden
--      afegir els altres (importacio o a ma des del panell).
--   2. `acollida_attendance`, qui va venir cada dia. Una fila per infant i dia.
--   3. `acollida_monitor_links`, l'enllac secret que obre la llista del dia
--      sense contrasenya.
--
-- Sobre l'enllac: dona acces a noms d'infants, que son dades de menors. Per
-- aixo no obre cap taula —tot passa per funcions que reben el token—, nomes
-- ensenya els infants del dia, la cerca demana tres lletres, no retorna mai
-- cap dada de contacte i es pot revocar en un clic.
--
-- Idempotent: safe to re-run.
-- =============================================================

-- ---------------------------------------------------------------
-- 1) El cens.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  name text NOT NULL,
  surname text NOT NULL,
  course text NOT NULL,

  family_email text,
  family_phone text,
  afa_member boolean,

  active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual',
  notes text,

  -- Clau de comparacio: el mateix infant escrit amb mes o menys espais i
  -- majuscules ha de ser el mateix infant. Amb el curs al costat perque dos
  -- homonims de cursos diferents puguin conviure.
  match_key text GENERATED ALWAYS AS (lower(btrim(name)) || ' ' || lower(btrim(surname))) STORED,

  CONSTRAINT children_source_check CHECK (source IN ('manual', 'import', 'acollida', 'inscripcions'))
);

COMMENT ON TABLE public.children IS
  'Cens d''infants del centre. És l''única llista que existeix: fins ara cada inscripció es guardava els seus noms i ningú els podia creuar.';
COMMENT ON COLUMN public.children.match_key IS
  'nom i cognoms en minúscules i sense espais de sobra, per no duplicar el mateix infant escrit de dues maneres.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_children_match ON public.children(match_key, course);
CREATE INDEX IF NOT EXISTS idx_children_course ON public.children(course);
CREATE INDEX IF NOT EXISTS idx_children_active ON public.children(active);

CREATE OR REPLACE FUNCTION public.children_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_catalog' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_children_touch ON public.children;
CREATE TRIGGER trg_children_touch BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.children_touch();

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage children" ON public.children;
CREATE POLICY "Admins manage children" ON public.children
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;

-- El cens arrenca amb el que ja hi ha escrit: primer l'acollida, que es qui
-- el fara servir demà, i despres els germans de les extraescolars.
INSERT INTO public.children (name, surname, course, family_email, family_phone, afa_member, source)
SELECT DISTINCT ON (lower(btrim(child_name)) || ' ' || lower(btrim(child_surname)), course)
  btrim(child_name), btrim(child_surname), course, parent_email, parent_phone, afa_member, 'acollida'
FROM public.acollida_inscripcions
WHERE btrim(child_name) <> '' AND btrim(child_surname) <> ''
ORDER BY lower(btrim(child_name)) || ' ' || lower(btrim(child_surname)), course, created_at DESC
ON CONFLICT (match_key, course) DO NOTHING;

INSERT INTO public.children (name, surname, course, family_email, family_phone, source)
SELECT DISTINCT ON (lower(btrim(s->>'name')) || ' ' || lower(btrim(s->>'surname')), s->>'course')
  btrim(s->>'name'), btrim(s->>'surname'), s->>'course', i.parent_email_1, i.parent_phone_1, 'inscripcions'
FROM public.inscripcions i
CROSS JOIN LATERAL jsonb_array_elements(coalesce(i.students, '[]'::jsonb)) s
WHERE btrim(coalesce(s->>'name', '')) <> ''
  AND btrim(coalesce(s->>'surname', '')) <> ''
  AND coalesce(s->>'course', '') <> ''
ORDER BY lower(btrim(s->>'name')) || ' ' || lower(btrim(s->>'surname')), s->>'course', i.created_at DESC
ON CONFLICT (match_key, course) DO NOTHING;

-- ---------------------------------------------------------------
-- 2) Lligar les sol·licituds d'acollida al cens.
--    Es busca per nom i curs, i si l'infant no hi es, s'hi apunta: una
--    sol·licitud nova no pot quedar fora de la llista que fa servir la monitora.
-- ---------------------------------------------------------------
ALTER TABLE public.acollida_inscripcions
  ADD COLUMN IF NOT EXISTS child_id uuid REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_acollida_ins_child ON public.acollida_inscripcions(child_id);

CREATE OR REPLACE FUNCTION public.acollida_link_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_id uuid;
BEGIN
  IF NEW.child_id IS NOT NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_id FROM public.children
  WHERE match_key = lower(btrim(NEW.child_name)) || ' ' || lower(btrim(NEW.child_surname))
    AND course = NEW.course;

  IF v_id IS NULL THEN
    INSERT INTO public.children (name, surname, course, family_email, family_phone, afa_member, source)
    VALUES (btrim(NEW.child_name), btrim(NEW.child_surname), NEW.course,
            NEW.parent_email, NEW.parent_phone, NEW.afa_member, 'acollida')
    ON CONFLICT (match_key, course) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_id;
  END IF;

  NEW.child_id := v_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_acollida_link_child ON public.acollida_inscripcions;
CREATE TRIGGER trg_acollida_link_child
  BEFORE INSERT OR UPDATE OF child_name, child_surname, course ON public.acollida_inscripcions
  FOR EACH ROW EXECUTE FUNCTION public.acollida_link_child();

UPDATE public.acollida_inscripcions i
SET child_id = c.id
FROM public.children c
WHERE i.child_id IS NULL
  AND c.match_key = lower(btrim(i.child_name)) || ' ' || lower(btrim(i.child_surname))
  AND c.course = i.course;

-- ---------------------------------------------------------------
-- 3) Qui va venir cada dia.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.acollida_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  day date NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  rate_id uuid REFERENCES public.acollida_rates(id) ON DELETE SET NULL,

  -- Qui ho ha marcat: la monitora amb el seu enllaç, o algú del panell.
  source text NOT NULL DEFAULT 'monitor',
  link_id uuid,

  CONSTRAINT acollida_attendance_source_check CHECK (source IN ('monitor', 'admin')),
  CONSTRAINT uq_acollida_attendance UNIQUE (day, child_id)
);

COMMENT ON TABLE public.acollida_attendance IS
  'Assistència real a l''acollida, una fila per infant i dia. El rebut de final de mes en surt: la quota mensual no la mou, però els dies solts es cobren pels que va marcar la monitora.';

CREATE INDEX IF NOT EXISTS idx_acollida_attendance_day ON public.acollida_attendance(day);
CREATE INDEX IF NOT EXISTS idx_acollida_attendance_child ON public.acollida_attendance(child_id, day);

ALTER TABLE public.acollida_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage attendance" ON public.acollida_attendance;
CREATE POLICY "Admins manage attendance" ON public.acollida_attendance
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acollida_attendance TO authenticated;

-- ---------------------------------------------------------------
-- 4) L'enllaç de la monitora.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.acollida_monitor_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'Monitoratge',
  capacity_group text NOT NULL DEFAULT 'mati',
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  CONSTRAINT acollida_monitor_links_group_check CHECK (capacity_group IN ('mati', 'tarda'))
);

COMMENT ON TABLE public.acollida_monitor_links IS
  'Enllaços sense contrasenya per passar llista. Donen accés a noms de menors: es revoquen desmarcant «actiu», i el token no es reutilitza mai.';

ALTER TABLE public.acollida_monitor_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage monitor links" ON public.acollida_monitor_links;
CREATE POLICY "Admins manage monitor links" ON public.acollida_monitor_links
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acollida_monitor_links TO authenticated;

-- Comprova el token i deixa constància de l'ús. Cap funció de la monitora fa
-- res abans de passar per aquí.
CREATE OR REPLACE FUNCTION public.acollida_monitor_link_id(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(length(p_token), 0) < 20 THEN
    RAISE EXCEPTION 'Enllaç no vàlid' USING ERRCODE = 'P0102';
  END IF;

  SELECT id INTO v_id FROM public.acollida_monitor_links
  WHERE token = p_token AND active;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Enllaç no vàlid' USING ERRCODE = 'P0102';
  END IF;

  UPDATE public.acollida_monitor_links SET last_used_at = now() WHERE id = v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acollida_monitor_link_id(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------
-- 5) La llista del dia.
--
--    Retorna els infants que s'esperen —els que tenen plaça confirmada per a
--    aquell dia— i si ja s'han marcat. Cap telèfon, cap correu, cap adreça:
--    la monitora necessita noms i prou.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acollida_monitor_roster(p_token text, p_day date)
RETURNS TABLE(
  child_id uuid,
  name text,
  surname text,
  course text,
  expected boolean,
  present boolean,
  rate_id uuid,
  slot text,
  modality text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_group text;
BEGIN
  SELECT l.capacity_group INTO v_group
  FROM public.acollida_monitor_links l
  WHERE l.id = public.acollida_monitor_link_id(p_token);

  RETURN QUERY
  WITH expected AS (
    SELECT DISTINCT ON (c.id)
      c.id AS child_id, i.rate_id, r.horari, i.modality
    FROM public.acollida_inscripcions i
    JOIN public.children c ON c.id = i.child_id
    JOIN public.acollida_rates r ON r.id = i.rate_id
    WHERE i.status = 'confirmada'
      AND r.capacity_group = v_group
      AND (
        (i.modality = 'mensual'
          AND extract(isodow FROM p_day)::smallint = ANY (i.weekdays)
          AND (i.start_year IS NULL OR i.start_month IS NULL
               OR (i.start_year * 12 + i.start_month)
                  <= (extract(year FROM p_day)::int * 12 + extract(month FROM p_day)::int)))
        OR (i.modality = 'ocasional' AND p_day = ANY (i.occasional_dates))
      )
    ORDER BY c.id, i.created_at
  ),
  marked AS (
    SELECT a.child_id, a.rate_id FROM public.acollida_attendance a WHERE a.day = p_day
  )
  SELECT
    c.id, c.name, c.surname, c.course,
    (e.child_id IS NOT NULL) AS expected,
    (m.child_id IS NOT NULL) AS present,
    coalesce(m.rate_id, e.rate_id) AS rate_id,
    e.horari AS slot,
    e.modality
  FROM public.children c
  LEFT JOIN expected e ON e.child_id = c.id
  LEFT JOIN marked m ON m.child_id = c.id
  WHERE e.child_id IS NOT NULL OR m.child_id IS NOT NULL
  ORDER BY c.surname, c.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acollida_monitor_roster(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acollida_monitor_roster(text, date) TO anon, authenticated;

-- Cercar un infant que no s'esperava. Tres lletres com a mínim: sense això
-- l'enllaç seria una manera de baixar-se el cens sencer.
CREATE OR REPLACE FUNCTION public.acollida_monitor_search(p_token text, p_query text)
RETURNS TABLE(child_id uuid, name text, surname text, course text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
BEGIN
  PERFORM public.acollida_monitor_link_id(p_token);

  IF coalesce(length(btrim(p_query)), 0) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.surname, c.course
  FROM public.children c
  WHERE c.active
    AND (c.name ILIKE '%' || btrim(p_query) || '%' OR c.surname ILIKE '%' || btrim(p_query) || '%')
  ORDER BY c.surname, c.name
  LIMIT 25;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acollida_monitor_search(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acollida_monitor_search(text, text) TO anon, authenticated;

-- Marcar i desmarcar. Només del dia d'avui i d'ahir: la llista es passa al
-- moment, i un enllaç que deixés tocar qualsevol data deixaria reescriure un
-- mes ja cobrat.
CREATE OR REPLACE FUNCTION public.acollida_monitor_mark(
  p_token text, p_day date, p_child_id uuid, p_present boolean, p_rate_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v_link uuid;
BEGIN
  v_link := public.acollida_monitor_link_id(p_token);

  IF p_day > current_date OR p_day < current_date - 1 THEN
    RAISE EXCEPTION 'Només es pot passar llista d''avui o d''ahir' USING ERRCODE = 'P0103';
  END IF;

  IF p_present THEN
    INSERT INTO public.acollida_attendance (day, child_id, rate_id, source, link_id)
    VALUES (p_day, p_child_id, p_rate_id, 'monitor', v_link)
    ON CONFLICT ON CONSTRAINT uq_acollida_attendance
    DO UPDATE SET rate_id = coalesce(EXCLUDED.rate_id, public.acollida_attendance.rate_id);
  ELSE
    DELETE FROM public.acollida_attendance WHERE day = p_day AND child_id = p_child_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acollida_monitor_mark(text, date, uuid, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acollida_monitor_mark(text, date, uuid, boolean, uuid) TO anon, authenticated;
