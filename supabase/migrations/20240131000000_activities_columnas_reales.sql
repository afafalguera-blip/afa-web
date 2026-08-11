-- Columnas reales de `activities` en producción.
--
-- 20240130_create_activities.sql crea la tabla con 18 columnas, pero producción
-- tiene 43: el resto se añadieron a mano por el panel y nunca se capturaron.
-- 20260616120000_update_activities_2026_27.sql escribe en title_ca, y desde el
-- repositorio esa columna no existía.
--
-- Todo va con IF NOT EXISTS: contra producción, donde ya están, no hace nada.
--
-- La versión es 20240131 y no 20240130000001 porque la CLI ordena por nombre de
-- fichero: '0' va antes que '_', así que 20240130000001_... se habría aplicado
-- ANTES de 20240130_create_activities.sql, cuando la tabla aún no existe.

ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS id bigint;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS price_info text DEFAULT '/mes'::text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS grades text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS schedule_summary text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS schedule_details jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS place text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS spots integer DEFAULT 0;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS color text DEFAULT 'bg-primary'::text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category_icon text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_stem_approved boolean DEFAULT false;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS important_note text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS price_member numeric;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS price_non_member numeric;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS title_es text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS title_ca text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description_es text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description_ca text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS grades_es text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS grades_ca text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS grades_en text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS schedule_summary_es text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS schedule_summary_ca text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS schedule_summary_en text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS important_note_es text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS important_note_ca text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS important_note_en text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category_ca text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category_es text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category_en text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS place_ca text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS place_es text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS place_en text;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS inscription_course_types text[] DEFAULT '{}'::text[];
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS inscription_enabled boolean DEFAULT false;
