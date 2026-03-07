-- Add missing metadata columns for news editor/blog features

ALTER TABLE public.news ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS news_url text;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS sources text;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS event_date timestamptz;

-- Backfill slug for existing rows where possible
UPDATE public.news
SET slug = regexp_replace(regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
WHERE (slug IS NULL OR slug = '')
  AND title IS NOT NULL
  AND title <> '';

CREATE INDEX IF NOT EXISTS idx_news_slug ON public.news(slug);
CREATE INDEX IF NOT EXISTS idx_news_published_created ON public.news(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_published_published_at ON public.news(published, published_at DESC);
