-- URL shortener table and click counter function

CREATE TABLE IF NOT EXISTS public.short_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  target_url text NOT NULL,
  description text,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.short_urls
  ADD CONSTRAINT short_urls_slug_format_chk
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE public.short_urls
  ADD CONSTRAINT short_urls_clicks_non_negative_chk
  CHECK (clicks >= 0);

ALTER TABLE public.short_urls
  ADD CONSTRAINT short_urls_target_url_protocol_chk
  CHECK (target_url ~ '^https?://');

CREATE UNIQUE INDEX IF NOT EXISTS idx_short_urls_slug_unique
  ON public.short_urls (slug);

CREATE INDEX IF NOT EXISTS idx_short_urls_created_at
  ON public.short_urls (created_at DESC);

CREATE OR REPLACE FUNCTION public.increment_clicks(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.short_urls
  SET clicks = clicks + 1
  WHERE slug = p_slug;
END;
$$;

ALTER TABLE public.short_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage short urls" ON public.short_urls;
CREATE POLICY "Admins can manage short urls"
ON public.short_urls
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

REVOKE ALL ON TABLE public.short_urls FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.short_urls TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
