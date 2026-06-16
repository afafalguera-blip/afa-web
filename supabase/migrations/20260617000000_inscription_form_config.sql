-- =============================================================
-- Migration: editable inscription form config + custom answers
-- Date: 2026-06-17
-- Adds admin-editable config for the extracurricular inscription
-- form (texts, optional fields, custom questions) and a place to
-- store answers to those custom questions per submission.
-- =============================================================

-- 1) Custom-question answers on submissions (key/value bag).
ALTER TABLE public.inscripcions
  ADD COLUMN IF NOT EXISTS extra_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.inscripcions.extra_answers IS
  'Answers to admin-defined custom questions, keyed by CustomQuestion.key.';

-- 2) Seed the inscription_form config row (idempotent). Texts left empty so
--    the public form keeps using the existing i18n strings until admin edits.
INSERT INTO public.site_config (key, value, updated_at)
SELECT 'inscription_form', '{
  "content": { "ca": {}, "es": {}, "en": {} },
  "fields": [
    { "key": "parent_dni",     "enabled": true, "required": true,  "label": {"ca":"","es":"","en":""} },
    { "key": "parent_phone_2", "enabled": true, "required": false, "label": {"ca":"","es":"","en":""} },
    { "key": "parent_email_2", "enabled": true, "required": false, "label": {"ca":"","es":"","en":""} },
    { "key": "health_info",    "enabled": true, "required": false, "label": {"ca":"","es":"","en":""} },
    { "key": "image_rights",   "enabled": true, "required": true,  "label": {"ca":"","es":"","en":""} },
    { "key": "leave_alone",    "enabled": true, "required": true,  "label": {"ca":"","es":"","en":""} }
  ],
  "customQuestions": []
}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM public.site_config WHERE key = 'inscription_form');

-- ROLLBACK
-- ALTER TABLE public.inscripcions DROP COLUMN IF EXISTS extra_answers;
-- DELETE FROM public.site_config WHERE key = 'inscription_form';
