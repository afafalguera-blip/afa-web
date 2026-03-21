-- Add optional PDF attachment support to news

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

COMMENT ON COLUMN public.news.attachment_url IS 'Public URL for an optional attached PDF file';
COMMENT ON COLUMN public.news.attachment_name IS 'Original file name for the optional attached PDF';
