-- Add translations column to news table
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.news.translations IS 'Multilingual content: { "ca": { "title": "...", "content": "..." }, "es": { ... }, "en": { ... } }';
