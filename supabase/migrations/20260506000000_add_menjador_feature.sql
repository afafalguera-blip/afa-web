-- ============================================================
-- Migration: Menjador (canteen) feature
-- Date: 2026-05-06
-- Adds: menjador_rates, menjador_menus, menjador-menus storage bucket,
--       site_config 'menjador_info' (translatable description blocks)
-- Depends on: 20260326200000_define_is_admin_and_fix_rls.sql (is_admin())
-- ============================================================

-- ============================================================
-- 1. RATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.menjador_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Tier label, eg: "Fix (mig mes o més + 1 dia)" / "Esporàdic"
  label TEXT NOT NULL,
  label_ca TEXT,
  label_es TEXT,
  label_en TEXT,
  -- Type of attendance: 'fix' (recurrent) | 'esporadic' (occasional)
  rate_type TEXT NOT NULL CHECK (rate_type IN ('fix', 'esporadic')),
  -- Free-form price string so admin can write "7,50 €/dia" etc.
  preu_soci TEXT NOT NULL,
  preu_no_soci TEXT NOT NULL,
  -- Optional explanatory note shown under the price
  note TEXT,
  note_ca TEXT,
  note_es TEXT,
  note_en TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.menjador_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read menjador_rates" ON public.menjador_rates;
CREATE POLICY "Public can read menjador_rates"
  ON public.menjador_rates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert menjador_rates" ON public.menjador_rates;
CREATE POLICY "Admins can insert menjador_rates"
  ON public.menjador_rates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update menjador_rates" ON public.menjador_rates;
CREATE POLICY "Admins can update menjador_rates"
  ON public.menjador_rates FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete menjador_rates" ON public.menjador_rates;
CREATE POLICY "Admins can delete menjador_rates"
  ON public.menjador_rates FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 2. MENUS TABLE (PDF uploads, one per period)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.menjador_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                    -- e.g. "Menú Maig 2026"
  -- Period the menu applies to. month is 1..12, year e.g. 2026.
  -- Both nullable to allow special menus (eg. summer/excursions).
  month INT CHECK (month BETWEEN 1 AND 12),
  year INT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS menjador_menus_period_idx
  ON public.menjador_menus (year DESC NULLS LAST, month DESC NULLS LAST);

ALTER TABLE public.menjador_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active menjador_menus" ON public.menjador_menus;
CREATE POLICY "Public can read active menjador_menus"
  ON public.menjador_menus FOR SELECT
  USING (is_active OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert menjador_menus" ON public.menjador_menus;
CREATE POLICY "Admins can insert menjador_menus"
  ON public.menjador_menus FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update menjador_menus" ON public.menjador_menus;
CREATE POLICY "Admins can update menjador_menus"
  ON public.menjador_menus FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete menjador_menus" ON public.menjador_menus;
CREATE POLICY "Admins can delete menjador_menus"
  ON public.menjador_menus FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 3. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('menjador-menus', 'menjador-menus', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public View menjador-menus" ON storage.objects;
CREATE POLICY "Public View menjador-menus"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menjador-menus');

DROP POLICY IF EXISTS "Admins can insert menjador-menus" ON storage.objects;
CREATE POLICY "Admins can insert menjador-menus"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'menjador-menus' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update menjador-menus" ON storage.objects;
CREATE POLICY "Admins can update menjador-menus"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'menjador-menus' AND public.is_admin())
  WITH CHECK (bucket_id = 'menjador-menus' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete menjador-menus" ON storage.objects;
CREATE POLICY "Admins can delete menjador-menus"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'menjador-menus' AND public.is_admin());

-- ============================================================
-- 4. SITE CONFIG: descriptive blocks (admin-editable, multi-lang)
-- ============================================================

INSERT INTO site_config (key, value, updated_at)
SELECT 'menjador_info', '{
  "translations": {
    "ca": {
      "intro": "El servei de menjador escolar ofereix dinars equilibrats elaborats segons les recomanacions nutricionals del Departament d''Educació. Els monitors acompanyen els infants durant l''àpat i les estones d''esbarjo del migdia.",
      "schedule": "De dilluns a divendres, de 12:30 h a 15:00 h.",
      "company": "",
      "allergies": "Si el vostre fill o filla té al·lèrgies o intoleràncies, cal comunicar-ho a l''AFA i adjuntar el certificat mèdic abans de començar el servei.",
      "diets": "S''ofereixen dietes especials (al·lèrgies, intoleràncies, motius religiosos i dietes toves per malaltia) sota petició prèvia.",
      "how_to": "Les famílies poden inscriure's per a tot el curs (fix) o utilitzar el servei de manera puntual (esporàdic). Per a dies esporàdics, cal avisar a l''AFA al matí.",
      "contact": "Per a qualsevol consulta, podeu escriure''ns des del formulari de contacte o passar per l''espai AFA els dilluns de 9:00 a 9:30 h."
    },
    "es": {
      "intro": "El servicio de comedor escolar ofrece comidas equilibradas elaboradas según las recomendaciones nutricionales del Departament d''Educació. Los monitores acompañan a los niños durante la comida y los ratos de patio del mediodía.",
      "schedule": "De lunes a viernes, de 12:30 h a 15:00 h.",
      "company": "",
      "allergies": "Si tu hijo o hija tiene alergias o intolerancias, debes comunicarlo al AFA y adjuntar el certificado médico antes de iniciar el servicio.",
      "diets": "Se ofrecen dietas especiales (alergias, intolerancias, motivos religiosos y dietas blandas por enfermedad) bajo petición previa.",
      "how_to": "Las familias pueden inscribirse para todo el curso (fijo) o usar el servicio de manera puntual (esporádico). Para días esporádicos, hay que avisar al AFA por la mañana.",
      "contact": "Para cualquier consulta, podéis escribirnos desde el formulario de contacto o pasar por el espacio AFA los lunes de 9:00 a 9:30 h."
    },
    "en": {
      "intro": "The school canteen service offers balanced lunches prepared in line with the nutritional guidelines of the Departament d''Educació. Monitors look after the children during lunch and the midday playground time.",
      "schedule": "Monday to Friday, from 12:30 pm to 3:00 pm.",
      "company": "",
      "allergies": "If your child has allergies or intolerances, you must notify the AFA and attach the medical certificate before starting the service.",
      "diets": "Special diets are available on request (allergies, intolerances, religious reasons and bland diets due to illness).",
      "how_to": "Families can sign up for the whole school year (fixed) or use the service occasionally (sporadic). For sporadic days, please notify the AFA in the morning.",
      "contact": "For any questions, write to us via the contact form or visit the AFA space on Mondays from 9:00 to 9:30 am."
    }
  }
}'::jsonb, now()
WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE key = 'menjador_info');

-- ============================================================
-- 5. SEED two default rate rows so the admin sees the structure
-- ============================================================

INSERT INTO public.menjador_rates (label, label_ca, label_es, label_en, rate_type, preu_soci, preu_no_soci, note, note_ca, note_es, note_en, order_index)
SELECT
  'Fix',
  'Fix (mig mes o més + 1 dia)',
  'Fijo (medio mes o más + 1 día)',
  'Fixed (half month or more + 1 day)',
  'fix',
  '—',
  '—',
  'Preu per dia. Aplicable a alumnes que es queden la meitat del mes o més.',
  'Preu per dia. Aplicable a alumnes que es queden la meitat del mes o més.',
  'Precio por día. Aplicable al alumnado que se queda la mitad del mes o más.',
  'Price per day. Applies to pupils staying half the month or more.',
  0
WHERE NOT EXISTS (SELECT 1 FROM public.menjador_rates);

INSERT INTO public.menjador_rates (label, label_ca, label_es, label_en, rate_type, preu_soci, preu_no_soci, note, note_ca, note_es, note_en, order_index)
SELECT
  'Esporàdic',
  'Esporàdic',
  'Esporádico',
  'Sporadic',
  'esporadic',
  '—',
  '—',
  'Preu per dia solt. Cal avisar a l''AFA al matí.',
  'Preu per dia solt. Cal avisar a l''AFA al matí.',
  'Precio por día suelto. Hay que avisar al AFA por la mañana.',
  'Price per individual day. Notify the AFA in the morning.',
  1
WHERE (SELECT count(*) FROM public.menjador_rates) < 2;

-- ============================================================
-- ROLLBACK (run manually to revert)
-- ============================================================
-- DROP TABLE IF EXISTS public.menjador_menus;
-- DROP TABLE IF EXISTS public.menjador_rates;
-- DELETE FROM site_config WHERE key = 'menjador_info';
-- DROP POLICY IF EXISTS "Public View menjador-menus" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can insert menjador-menus" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can update menjador-menus" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can delete menjador-menus" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'menjador-menus';
