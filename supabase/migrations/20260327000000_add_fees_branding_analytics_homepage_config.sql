-- ============================================================
-- Migration: Add fees, pricing, branding, analytics, homepage configs
-- Date: 2026-03-27
-- Purpose: Make hardcoded values admin-configurable
-- ============================================================

-- 1. Fees configuration (IBAN, annual fee, bank details)
INSERT INTO site_config (key, value, updated_at)
SELECT 'fees', '{
  "annual_fee_amount": 26,
  "iban": "ES22 0081 1604 7400 0103 8208",
  "bank_name": "Banco Sabadell",
  "account_holder": "AFA Escola Falguera",
  "payment_reference_template": "ALTA [NOM ALUMNE]"
}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE key = 'fees');

-- 2. Pricing configuration (activity prices per tier)
INSERT INTO site_config (key, value, updated_at)
SELECT 'pricing', '{
  "tiers": [
    {
      "id": "general",
      "label": { "ca": "Activitats generals", "es": "Actividades generales", "en": "General activities" },
      "schedule": "16:30-18:00",
      "member_price": 20,
      "non_member_price": 25
    },
    {
      "id": "english",
      "label": { "ca": "Anglès", "es": "Inglés", "en": "English" },
      "schedule": "16:30-18:00",
      "member_price": 39,
      "non_member_price": 44,
      "note": { "ca": "+ material", "es": "+ material", "en": "+ materials" }
    }
  ],
  "discount_text": { "ca": "Descompte per a socis de l''AFA", "es": "Descuento para socios del AFA", "en": "Discount for AFA members" }
}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE key = 'pricing');

-- 3. Branding configuration (logo, hero, SEO defaults)
INSERT INTO site_config (key, value, updated_at)
SELECT 'branding', '{
  "site_name": "AFA Escola Falguera",
  "logo_url": "https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/logo.png",
  "default_hero_url": "https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/hero_escuela.png",
  "default_placeholder_url": "https://images.unsplash.com/photo-1504711432869-5d39a110fdd7?q=80&w=2070&auto=format&fit=crop",
  "default_seo_description": {
    "ca": "Web oficial de l''AFA de l''Escola Falguera. Informació sobre activitats extraescolars, serveis d''acollida, projectes i últimes notícies.",
    "es": "Web oficial del AFA de la Escola Falguera. Información sobre actividades extraescolares, servicios de acogida, proyectos y últimas noticias.",
    "en": "Official website of AFA Escola Falguera. Information about extracurricular activities, childcare services, projects and latest news."
  }
}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE key = 'branding');

-- 4. Analytics configuration
INSERT INTO site_config (key, value, updated_at)
SELECT 'analytics', '{
  "google_analytics_id": "G-2DMTERT1FH",
  "enabled": true
}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE key = 'analytics');

-- 5. Homepage display configuration
INSERT INTO site_config (key, value, updated_at)
SELECT 'homepage', '{
  "featured_news_count": 3,
  "featured_events_count": 4,
  "featured_projects_count": 3,
  "max_students_per_inscription": 3,
  "calendar_events_per_day": 3,
  "assemblea_pdf_url": "https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/documents/actes/1770072824500-8l989f.pdf"
}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE key = 'homepage');

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DELETE FROM site_config WHERE key IN ('fees', 'pricing', 'branding', 'analytics', 'homepage');
