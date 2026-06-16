-- =============================================
-- Migration: Update activities catalogue for course 2026-27
-- Source: AFA Falguera Extraescolars 2026-27 flyer.
--   - Football no longer exists -> removed.
--   - English (Anglès) and Skating (Patinatge) updated.
--   - New activities added: Multi-esport, Petits artistes, Danza urbana.
-- Model: one row per activity type; audience groups live in schedule_details.
-- Day codes: 1=Mon 2=Tue 3=Wed 4=Thu. Slot 16:30-18:00.
-- NOTE: image_url left empty for new rows; upload images from the admin panel.
-- =============================================

-- 1) Remove football (no longer offered)
DELETE FROM public.activities
WHERE id = 5 OR lower(title) IN ('futbol', 'fútbol', 'football');

-- 2) Update English (id 6)
UPDATE public.activities SET
  title = 'Anglès',
  title_ca = 'Anglès',
  title_es = 'Inglés',
  title_en = 'English',
  category = 'languages',
  category_ca = 'Idiomes',
  category_es = 'Idiomas',
  category_en = 'Languages',
  category_icon = 'translate',
  color = 'bg-blue-500',
  description_ca = 'Anglès en grups reduïts a càrrec d''una acadèmia externa. Aprenentatge comunicatiu i dinàmic adaptat a cada cicle.',
  description_es = 'Inglés en grupos reducidos a cargo de una academia externa. Aprendizaje comunicativo y dinámico adaptado a cada ciclo.',
  description_en = 'English in small groups run by an external academy. Communicative, dynamic learning adapted to each stage.',
  description = 'Inglés en grupos reducidos a cargo de una academia externa. Aprendizaje comunicativo y dinámico adaptado a cada ciclo.',
  grades = 'Infantil y Primaria',
  grades_ca = 'Infantil i Primària',
  grades_es = 'Infantil y Primaria',
  grades_en = 'Pre-school and Primary',
  schedule_summary = 'Miércoles (infantil) · Martes (1º-3º) · Jueves (4º-6º), 16:30-18:00h',
  schedule_summary_ca = 'Dimecres (infantil) · Dimarts (1r-3r) · Dijous (4t-6è), 16:30-18:00h',
  schedule_summary_es = 'Miércoles (infantil) · Martes (1º-3º) · Jueves (4º-6º), 16:30-18:00h',
  schedule_summary_en = 'Wed (pre-school) · Tue (Y1-Y3) · Thu (Y4-Y6), 4:30-6:00pm',
  schedule_details = '[
    {"group": "Ed. infantil", "sessions": [{"day": 3, "startTime": "16:30", "endTime": "18:00"}]},
    {"group": "1r-3r", "sessions": [{"day": 2, "startTime": "16:30", "endTime": "18:00"}]},
    {"group": "4t-6è", "sessions": [{"day": 4, "startTime": "16:30", "endTime": "18:00"}]}
  ]'::jsonb,
  price = 39,
  price_member = 39,
  price_non_member = NULL,
  price_info = '/mes (1 dia)',
  important_note = 'L''imparteix una acadèmia externa: els pagaments i el material (65€/any) es gestionen directament amb l''acadèmia. Tarifes: 39€/mes (1 dia) o 56€/mes (2 dies). El segon dia només per a 4t, 5è i 6è, pendent de sol·licitud.',
  important_note_ca = 'L''imparteix una acadèmia externa: els pagaments i el material (65€/any) es gestionen directament amb l''acadèmia. Tarifes: 39€/mes (1 dia) o 56€/mes (2 dies). El segon dia només per a 4t, 5è i 6è, pendent de sol·licitud.',
  important_note_es = 'La imparte una academia externa: los pagos y el material (65€/año) se gestionan directamente con la academia. Tarifas: 39€/mes (1 día) o 56€/mes (2 días). El segundo día solo para 4º, 5º y 6º, pendiente de solicitud.',
  important_note_en = 'Taught by an external academy: payments and materials (€65/year) are handled directly with the academy. Fees: €39/month (1 day) or €56/month (2 days). The second day is only for Years 4-6, subject to request.'
WHERE id = 6;

-- 3) Update Skating (id 7)
UPDATE public.activities SET
  title = 'Patinatge',
  title_ca = 'Patinatge',
  title_es = 'Patinaje',
  title_en = 'Skating',
  category = 'sports',
  category_ca = 'Esports',
  category_es = 'Deportes',
  category_en = 'Sports',
  category_icon = 'sports_skating',
  color = 'bg-cyan-500',
  grades = 'Primaria (1º-6º)',
  grades_ca = 'Primària (1r-6è)',
  grades_es = 'Primaria (1º-6º)',
  grades_en = 'Primary (Y1-Y6)',
  schedule_summary = 'Miércoles, 16:30-18:00h',
  schedule_summary_ca = 'Dimecres, 16:30-18:00h',
  schedule_summary_es = 'Miércoles, 16:30-18:00h',
  schedule_summary_en = 'Wednesday, 4:30-6:00pm',
  schedule_details = '[
    {"group": "1r-3r", "sessions": [{"day": 3, "startTime": "16:30", "endTime": "18:00"}]},
    {"group": "4t-6è", "sessions": [{"day": 3, "startTime": "16:30", "endTime": "18:00"}]}
  ]'::jsonb,
  price = 20,
  price_member = 20,
  price_non_member = 25,
  price_info = '/mes',
  important_note = 'Obligatori portar casc, genolleres i colzeres.',
  important_note_ca = 'Obligatori portar casc, genolleres i colzeres.',
  important_note_es = 'Obligatorio traer casco, rodilleras y coderas.',
  important_note_en = 'Helmet, knee pads and elbow pads are required.'
WHERE id = 7;

-- 4) Insert new activities (only if absent, idempotent by title)
INSERT INTO public.activities (
  title, title_ca, title_es, title_en,
  category, category_ca, category_es, category_en, category_icon, color,
  description, description_ca, description_es, description_en,
  grades, grades_ca, grades_es, grades_en,
  schedule_summary, schedule_summary_ca, schedule_summary_es, schedule_summary_en,
  schedule_details,
  place, place_ca, place_es,
  price, price_member, price_non_member, price_info,
  spots, image_url, is_stem_approved, inscription_enabled, inscription_course_types
)
SELECT * FROM (VALUES
  -- Multi-esport: Ed. infantil (Dl) · 1r-3r (Dj) · 4t-6è (Dt)
  (
    'Multi-esport', 'Multi-esport', 'Multideporte', 'Multi-sport',
    'sports', 'Esports', 'Deportes', 'Sports', 'sports_basketball', 'bg-green-500',
    'Iniciación deportiva a través del juego: coordinación, trabajo en equipo y una buena variedad de deportes cada trimestre.',
    'Iniciació esportiva a través del joc: coordinació, treball en equip i una bona varietat d''esports cada trimestre.',
    'Iniciación deportiva a través del juego: coordinación, trabajo en equipo y una buena variedad de deportes cada trimestre.',
    'Sports introduction through play: coordination, teamwork and a variety of different sports each term.',
    'Infantil y Primaria', 'Infantil i Primària', 'Infantil y Primaria', 'Pre-school and Primary',
    'Lunes (infantil) · Jueves (1º-3º) · Martes (4º-6º), 16:30-18:00h',
    'Dilluns (infantil) · Dijous (1r-3r) · Dimarts (4t-6è), 16:30-18:00h',
    'Lunes (infantil) · Jueves (1º-3º) · Martes (4º-6º), 16:30-18:00h',
    'Mon (pre-school) · Thu (Y1-Y3) · Tue (Y4-Y6), 4:30-6:00pm',
    '[
      {"group": "Ed. infantil", "sessions": [{"day": 1, "startTime": "16:30", "endTime": "18:00"}]},
      {"group": "1r-3r", "sessions": [{"day": 4, "startTime": "16:30", "endTime": "18:00"}]},
      {"group": "4t-6è", "sessions": [{"day": 2, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb,
    'Pista Poliesportiva', 'Pista Poliesportiva', 'Pista Polideportiva',
    20, 20, 25, '/mes',
    NULL::integer, '', false, false, ARRAY[]::text[]
  ),
  -- Petits artistes: Ed. infantil (Dt) · 1r-3r (Dl)
  (
    'Petits artistes', 'Petits artistes', 'Pequeños artistas', 'Little artists',
    'artistic', 'Artística', 'Artística', 'Artistic', 'palette', 'bg-pink-500',
    'Creatividad sin límites: pintura, manualidades y experimentación con materiales para los más pequeños.',
    'Creativitat sense límits: pintura, manualitats i experimentació amb materials per als més menuts.',
    'Creatividad sin límites: pintura, manualidades y experimentación con materiales para los más pequeños.',
    'Creativity without limits: painting, crafts and material experimentation for the youngest.',
    'Infantil y Primaria (1º-3º)', 'Infantil i Primària (1r-3r)', 'Infantil y Primaria (1º-3º)', 'Pre-school and Primary (Y1-Y3)',
    'Martes (infantil) · Lunes (1º-3º), 16:30-18:00h',
    'Dimarts (infantil) · Dilluns (1r-3r), 16:30-18:00h',
    'Martes (infantil) · Lunes (1º-3º), 16:30-18:00h',
    'Tue (pre-school) · Mon (Y1-Y3), 4:30-6:00pm',
    '[
      {"group": "Ed. infantil", "sessions": [{"day": 2, "startTime": "16:30", "endTime": "18:00"}]},
      {"group": "1r-3r", "sessions": [{"day": 1, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb,
    'Aula de plàstica', 'Aula de plàstica', 'Aula de plástica',
    20, 20, 25, '/mes',
    NULL::integer, '', false, false, ARRAY[]::text[]
  ),
  -- Danza urbana: 4t-6è (Dl)
  (
    'Danza urbana', 'Dansa urbana', 'Danza urbana', 'Urban dance',
    'music', 'Música', 'Música', 'Music', 'music_note', 'bg-purple-500',
    'Ritmo, expresión y coreografías de danza urbana para moverse y ganar confianza sobre el escenario.',
    'Ritme, expressió i coreografies de dansa urbana per moure''s i guanyar confiança sobre l''escenari.',
    'Ritmo, expresión y coreografías de danza urbana para moverse y ganar confianza sobre el escenario.',
    'Rhythm, expression and urban dance choreographies to get moving and build confidence on stage.',
    'Primaria (4º-6º)', 'Primària (4t-6è)', 'Primaria (4º-6º)', 'Primary (Y4-Y6)',
    'Lunes, 16:30-18:00h',
    'Dilluns, 16:30-18:00h',
    'Lunes, 16:30-18:00h',
    'Monday, 4:30-6:00pm',
    '[
      {"group": "4t-6è", "sessions": [{"day": 1, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb,
    'Sala polivalent', 'Sala polivalent', 'Sala polivalente',
    20, 20, 25, '/mes',
    NULL::integer, '', false, false, ARRAY[]::text[]
  )
) AS seed(
  title, title_ca, title_es, title_en,
  category, category_ca, category_es, category_en, category_icon, color,
  description, description_ca, description_es, description_en,
  grades, grades_ca, grades_es, grades_en,
  schedule_summary, schedule_summary_ca, schedule_summary_es, schedule_summary_en,
  schedule_details,
  place, place_ca, place_es,
  price, price_member, price_non_member, price_info,
  spots, image_url, is_stem_approved, inscription_enabled, inscription_course_types
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.activities a WHERE a.title = seed.title
);
