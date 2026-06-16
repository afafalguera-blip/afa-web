-- =============================================
-- Migration: Enable 2026-27 activities in the inscription form
-- Description: The 2026-27 catalogue migration inserted the new activities
--   with inscription_course_types = '{}' and inscription_enabled = false,
--   so they never appear in the public form (it groups options by course
--   type). This sets their audience and turns them on, and confirms the
--   updated English/Skating mappings.
--
-- Course types: 'infantil' (I3-I5) · 'primaria1' (1r-3r) · 'primaria2' (4t-6è)
-- =============================================

-- Multi-esport: infantil + 1r-3r + 4t-6è
UPDATE public.activities
  SET inscription_course_types = ARRAY['infantil','primaria1','primaria2'],
      inscription_enabled = true
  WHERE title = 'Multi-esport';

-- Petits artistes: infantil + 1r-3r
UPDATE public.activities
  SET inscription_course_types = ARRAY['infantil','primaria1'],
      inscription_enabled = true
  WHERE title = 'Petits artistes';

-- Danza urbana: only 4t-6è
UPDATE public.activities
  SET inscription_course_types = ARRAY['primaria2'],
      inscription_enabled = true
  WHERE title = 'Danza urbana';

-- Anglès (id 6): all stages (Wed infantil · Tue 1r-3r · Thu 4t-6è)
UPDATE public.activities
  SET inscription_course_types = ARRAY['infantil','primaria1','primaria2'],
      inscription_enabled = true
  WHERE id = 6;

-- Patinatge (id 7): primary only (1r-6è)
UPDATE public.activities
  SET inscription_course_types = ARRAY['primaria1','primaria2'],
      inscription_enabled = true
  WHERE id = 7;

-- Safety: make sure the removed football row is not enabled anywhere.
UPDATE public.activities
  SET inscription_enabled = false
  WHERE lower(title) IN ('futbol','fútbol','football');
