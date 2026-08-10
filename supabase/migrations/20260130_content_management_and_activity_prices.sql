-- Fusion de 2 ficheros que compartian la version 20260130.
-- La CLI de Supabase identifica cada migracion por los digitos previos al
-- primer '_', asi que varios ficheros con la misma version chocan contra la
-- clave primaria de schema_migrations al aplicarlos desde cero. Produccion
-- tiene una sola fila para esta version, de modo que un unico fichero es
-- justo lo que ya hay aplicado alli.

-- ===== 20260130_content_management_tables.sql =====
-- Migration: Create news, projects, and events tables for admin content management
-- Created: 2026-01-30

-- News table for website news articles
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  image_url TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table for AFA initiatives
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table for general calendar
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  all_day BOOLEAN DEFAULT false,
  event_type TEXT CHECK (event_type IN ('general', 'meeting', 'celebration', 'deadline', 'activity')) DEFAULT 'general',
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- Enable Row Level Security
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news
DROP POLICY IF EXISTS "Anyone can read published news" ON news;
CREATE POLICY "Anyone can read published news" ON news
  FOR SELECT TO PUBLIC
  USING (published = true);

DROP POLICY IF EXISTS "Admins can manage all news" ON news;
CREATE POLICY "Admins can manage all news" ON news
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- RLS Policies for projects
DROP POLICY IF EXISTS "Anyone can read active projects" ON projects;
CREATE POLICY "Anyone can read active projects" ON projects
  FOR SELECT TO PUBLIC
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;
CREATE POLICY "Admins can manage all projects" ON projects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- RLS Policies for events
DROP POLICY IF EXISTS "Anyone can read events" ON events;
CREATE POLICY "Anyone can read events" ON events
  FOR SELECT TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_news_updated_at ON news;
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ===== 20260130_update_activity_prices.sql =====
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
