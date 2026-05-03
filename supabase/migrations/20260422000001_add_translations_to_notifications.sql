ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS translations jsonb;

COMMENT ON COLUMN public.notifications.translations IS 'Auto-translated content: { ca: { title, message }, es: {...}, en: {...} }';
