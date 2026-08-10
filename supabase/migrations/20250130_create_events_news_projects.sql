-- Fusion de 3 ficheros que compartian la version 20250130.
-- La CLI de Supabase identifica cada migracion por los digitos previos al
-- primer '_', asi que varios ficheros con la misma version chocan contra la
-- clave primaria de schema_migrations al aplicarlos desde cero. Produccion
-- tiene una sola fila para esta version, de modo que un unico fichero es
-- justo lo que ya hay aplicado alli.

-- ===== 20250130_create_events_table.sql =====
-- =============================================
-- Migration: Create Events Table
-- Description: Table to store general calendar events
-- =============================================

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  all_day boolean DEFAULT false,
  event_type text DEFAULT 'general' CHECK (event_type IN ('general', 'meeting', 'celebration', 'deadline', 'activity')),
  color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to events"
  ON public.events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Anyone can read events
CREATE POLICY "Anyone can read events"
  ON public.events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add trigger for audit logging
CREATE TRIGGER log_events_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- Add updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for date queries
CREATE INDEX idx_events_event_date ON public.events(event_date);

COMMENT ON TABLE public.events IS 'Stores general calendar events for the AFA';

-- ===== 20250130_create_news_table.sql =====
-- =============================================
-- Migration: Create News Table
-- Description: Table to store AFA news articles
-- =============================================

CREATE TABLE IF NOT EXISTS public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  excerpt text,
  image_url text,
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to news"
  ON public.news
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Anyone can read published news
CREATE POLICY "Anyone can read published news"
  ON public.news
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Add trigger for audit logging
CREATE TRIGGER log_news_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.news
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.news IS 'Stores news articles for the AFA website';

-- ===== 20250130_create_projects_table.sql =====
-- =============================================
-- Migration: Create Projects Table
-- Description: Table to store AFA projects/initiatives
-- =============================================

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Anyone can read active projects
CREATE POLICY "Anyone can read active projects"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Add trigger for audit logging
CREATE TRIGGER log_projects_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- Add updated_at trigger
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.projects IS 'Stores AFA projects and initiatives';
