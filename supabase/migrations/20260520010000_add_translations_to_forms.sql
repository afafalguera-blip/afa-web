-- ============================================================
-- Migration: Add translations column to forms
-- Date: 2026-05-20
-- ============================================================

ALTER TABLE public.forms
    ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.forms.translations IS
'Multilingual content: { "ca": { title, description, fields: { [field_id]: { label, placeholder?, options? } } }, "en": { ... } }. The "es" version lives in the top-level columns (title, description) and field_schema (label, placeholder, options).';
