-- Migration: Create site announcements table for global banner management
-- Created: 2026-02-24

CREATE TABLE IF NOT EXISTS site_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT false,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, success
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default row if it doesn't exist
INSERT INTO site_announcements (id, is_active, message)
VALUES ('00000000-0000-0000-0000-000000000001', false, 'Benvinguts a la nova web!')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE site_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can read announcements" ON site_announcements;
CREATE POLICY "Anyone can read announcements" ON site_announcements
  FOR SELECT TO PUBLIC
  USING (true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON site_announcements;
CREATE POLICY "Admins can manage announcements" ON site_announcements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_site_announcements_updated_at ON site_announcements;
CREATE TRIGGER update_site_announcements_updated_at
  BEFORE UPDATE ON site_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
