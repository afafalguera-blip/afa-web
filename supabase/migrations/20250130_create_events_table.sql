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
