-- ============================================================
-- Migration: Add inscription_course_types to activities
-- Date: 2026-03-27
-- Purpose: Allow activities to be dynamically linked to
--          inscription course groups (infantil, primaria1, primaria2)
--          so the inscription form reads from the DB instead of
--          hardcoded values.
-- ============================================================

-- 1. Add the column
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS inscription_course_types text[] DEFAULT '{}';

-- 2. Add enabled flag for inscription form visibility
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS inscription_enabled boolean DEFAULT false;

-- 3. Seed existing activities with their course type mappings
-- "Teatre Musical en Anglès" → infantil
UPDATE public.activities
  SET inscription_course_types = ARRAY['infantil'], inscription_enabled = true
  WHERE title = 'Teatre Musical en Anglès';

-- "Marxa-Marxa en Anglès" → infantil
UPDATE public.activities
  SET inscription_course_types = ARRAY['infantil'], inscription_enabled = true
  WHERE title = 'Marxa-Marxa en Anglès';

-- "Futbol" → primaria1 + primaria2
UPDATE public.activities
  SET inscription_course_types = ARRAY['primaria1', 'primaria2'], inscription_enabled = true
  WHERE title = 'Futbol';

-- "Anglès" → primaria1 + primaria2
UPDATE public.activities
  SET inscription_course_types = ARRAY['primaria1', 'primaria2'], inscription_enabled = true
  WHERE title = 'Anglès';

-- "Patinatge" → primaria1 + primaria2
UPDATE public.activities
  SET inscription_course_types = ARRAY['primaria1', 'primaria2'], inscription_enabled = true
  WHERE title = 'Patinatge';

-- ============================================================
-- ROLLBACK
-- ============================================================
-- ALTER TABLE public.activities DROP COLUMN IF EXISTS inscription_course_types;
-- ALTER TABLE public.activities DROP COLUMN IF EXISTS inscription_enabled;
