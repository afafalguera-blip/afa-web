-- Comprehensive Update for Extraescolars
-- 1. Add Pricing Columns
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS price_member NUMERIC,
ADD COLUMN IF NOT EXISTS price_non_member NUMERIC;

-- 2. Update Pricing & Structured Schedules
-- We use a single batch update for clarity

-- Futbol: 20/25
UPDATE public.activities SET 
    price = 20, 
    price_member = 20, 
    price_non_member = 25,
    schedule_details = '[
        {"group": "1r-3r", "sessions": [{"day": 2, "startTime": "16:30", "endTime": "18:00"}, {"day": 4, "startTime": "16:30", "endTime": "18:00"}]},
        {"group": "4t-6è", "sessions": [{"day": 3, "startTime": "16:30", "endTime": "18:00"}, {"day": 5, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb
WHERE title = 'Futbol';

-- Anglès: 39/44
UPDATE public.activities SET 
    price = 39, 
    price_member = 39, 
    price_non_member = 44,
    schedule_details = '[
        {"group": "1r-3r", "sessions": [{"day": 2, "startTime": "16:30", "endTime": "18:00"}]},
        {"group": "4t-6è", "sessions": [{"day": 3, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb
WHERE title = 'Anglès';

-- Patinatge: 20/25
UPDATE public.activities SET 
    price = 20, 
    price_member = 20, 
    price_non_member = 25,
    schedule_details = '[
        {"group": "Iniciació", "sessions": [{"day": 3, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb
WHERE title = 'Patinatge';

-- Teatre Musical en Anglès: 20/25
UPDATE public.activities SET 
    price = 20, 
    price_member = 20, 
    price_non_member = 25,
    schedule_details = '[
        {"group": "Infantil 3-5", "sessions": [{"day": 2, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb
WHERE title = 'Teatre Musical en Anglès';

-- Marxa-Marxa en Anglès: 20/25
UPDATE public.activities SET 
    price = 20, 
    price_member = 20, 
    price_non_member = 25,
    schedule_details = '[
        {"group": "Infantil", "sessions": [{"day": 4, "startTime": "16:30", "endTime": "18:00"}]}
    ]'::jsonb
WHERE title = 'Marxa-Marxa en Anglès';

-- Timbals: 20/25
UPDATE public.activities SET 
    price = 20, 
    price_member = 20, 
    price_non_member = 25,
    schedule_details = '[
        {"group": "Grup Únic", "sessions": [{"day": 5, "startTime": "17:30", "endTime": "19:00"}]}
    ]'::jsonb
WHERE title = 'Timbals';

-- Robòtica: 45/50
UPDATE public.activities SET 
    price = 45, 
    price_member = 45, 
    price_non_member = 50,
    schedule_details = '[
        {"group": "Grup A", "sessions": [{"day": 1, "startTime": "17:00", "endTime": "18:30"}, {"day": 3, "startTime": "17:00", "endTime": "18:30"}]},
        {"group": "Grup B", "sessions": [{"day": 2, "startTime": "17:00", "endTime": "18:30"}, {"day": 4, "startTime": "17:00", "endTime": "18:30"}]}
    ]'::jsonb
WHERE title ILIKE '%Robòtica%';
