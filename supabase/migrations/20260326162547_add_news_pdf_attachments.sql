-- Reconcile local migration history with the production hotfix applied on 2026-03-26.
-- Adds optional PDF attachment fields used by the admin news editor.

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

COMMENT ON COLUMN public.news.attachment_url IS 'Public URL for an optional attached PDF file';
COMMENT ON COLUMN public.news.attachment_name IS 'Original file name for the optional attached PDF';
