-- Migration: Add translations to site_announcements
-- Created: 2026-02-26

ALTER TABLE site_announcements ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Initialize translations with current message
UPDATE site_announcements 
SET translations = jsonb_build_object(
    'ca', message,
    'es', message,
    'en', message
)
WHERE translations = '{}'::jsonb OR translations IS NULL;

-- Add description
COMMENT ON COLUMN site_announcements.translations IS 'Translations for the banner message: { "ca": "...", "es": "...", "en": "..." }';
