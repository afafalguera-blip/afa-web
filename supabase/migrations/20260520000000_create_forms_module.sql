-- ============================================================
-- Migration: Forms module (dynamic form templates + submissions)
-- Date: 2026-05-20
-- Source: Ported from hockeyteams/spa-migration (generic core only).
-- ============================================================

-- ------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    header_image_url TEXT,
    folder TEXT,
    closes_at TIMESTAMPTZ NULL,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.forms IS 'Plantillas de formularios dinámicos creados desde el admin del AFA.';
COMMENT ON COLUMN public.forms.folder IS 'Carpeta/categoría libre para agrupar formularios (ej: Inscripcions, Extraescolars, Menjador).';

CREATE INDEX IF NOT EXISTS idx_forms_folder ON public.forms(folder);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON public.forms(slug);

CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    submitted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE public.form_submissions IS 'Envíos recibidos en formularios públicos. Soft-delete via deleted_at.';

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_deleted_at ON public.form_submissions(deleted_at);

-- ------------------------------------------------------------
-- 2. updated_at trigger for forms
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_forms_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forms_set_updated_at ON public.forms;
CREATE TRIGGER trg_forms_set_updated_at
    BEFORE UPDATE ON public.forms
    FOR EACH ROW
    EXECUTE FUNCTION public.set_forms_updated_at();

-- ------------------------------------------------------------
-- 3. Soft-delete RPC (SECURITY DEFINER, admin-only)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.soft_delete_form_submission(submission_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden borrar envíos'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.form_submissions
       SET deleted_at = NOW()
     WHERE id = submission_id
       AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_form_submission(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 4. Rate-limit trigger on form_submissions
--    Max 5 submissions / form / 60s per (user OR anon-bucket).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_form_submission_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recent_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_count
    FROM public.form_submissions
    WHERE form_id = NEW.form_id
      AND submitted_at > (NOW() - interval '60 seconds')
      AND deleted_at IS NULL
      AND (
          (NEW.submitted_by_user_id IS NOT NULL AND submitted_by_user_id = NEW.submitted_by_user_id)
          OR
          (NEW.submitted_by_user_id IS NULL AND submitted_by_user_id IS NULL)
      );

    IF recent_count >= 5 THEN
        RAISE EXCEPTION 'Rate limit exceeded: too many submissions in a short period'
            USING ERRCODE = 'P0429';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_submission_rate_limit ON public.form_submissions;
CREATE TRIGGER trg_form_submission_rate_limit
    BEFORE INSERT ON public.form_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_form_submission_rate_limit();

-- ------------------------------------------------------------
-- 5. RLS
-- ------------------------------------------------------------

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- ---- forms ----

DROP POLICY IF EXISTS "Public reads active forms" ON public.forms;
CREATE POLICY "Public reads active forms"
    ON public.forms FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins read all forms" ON public.forms;
CREATE POLICY "Admins read all forms"
    ON public.forms FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins insert forms" ON public.forms;
CREATE POLICY "Admins insert forms"
    ON public.forms FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins update forms" ON public.forms;
CREATE POLICY "Admins update forms"
    ON public.forms FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete forms" ON public.forms;
CREATE POLICY "Admins delete forms"
    ON public.forms FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ---- form_submissions ----

-- Anyone (auth or anon) can submit to active, not-expired forms only.
DROP POLICY IF EXISTS "Anyone submits to active open forms" ON public.form_submissions;
CREATE POLICY "Anyone submits to active open forms"
    ON public.form_submissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.forms f
            WHERE f.id = form_id
              AND f.is_active = true
              AND (f.closes_at IS NULL OR f.closes_at > NOW())
        )
    );

DROP POLICY IF EXISTS "Admins read submissions" ON public.form_submissions;
CREATE POLICY "Admins read submissions"
    ON public.form_submissions FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update submissions" ON public.form_submissions;
CREATE POLICY "Admins update submissions"
    ON public.form_submissions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete submissions" ON public.form_submissions;
CREATE POLICY "Admins delete submissions"
    ON public.form_submissions FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------
-- 6. Storage buckets
--    form-assets  → header images (public read, admin write)
--    form-data    → attached files in submissions (private; anon/auth insert; admin read/delete)
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('form-assets', 'form-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('form-data', 'form-data', false)
ON CONFLICT (id) DO NOTHING;

-- ---- form-assets policies ----
DROP POLICY IF EXISTS "Public view form-assets" ON storage.objects;
CREATE POLICY "Public view form-assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'form-assets');

DROP POLICY IF EXISTS "Admins insert form-assets" ON storage.objects;
CREATE POLICY "Admins insert form-assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'form-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins update form-assets" ON storage.objects;
CREATE POLICY "Admins update form-assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'form-assets' AND public.is_admin())
    WITH CHECK (bucket_id = 'form-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete form-assets" ON storage.objects;
CREATE POLICY "Admins delete form-assets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'form-assets' AND public.is_admin());

-- ---- form-data policies ----
-- Anyone (auth or anon) can upload an attachment as part of a submission.
DROP POLICY IF EXISTS "Anyone uploads form-data" ON storage.objects;
CREATE POLICY "Anyone uploads form-data"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'form-data');

-- Only admins can list/read attachments. Public access goes through signed URLs.
DROP POLICY IF EXISTS "Admins read form-data" ON storage.objects;
CREATE POLICY "Admins read form-data"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'form-data' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete form-data" ON storage.objects;
CREATE POLICY "Admins delete form-data"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'form-data' AND public.is_admin());

-- ============================================================
-- ROLLBACK (manual)
-- ============================================================
-- DROP TRIGGER IF EXISTS trg_form_submission_rate_limit ON public.form_submissions;
-- DROP TRIGGER IF EXISTS trg_forms_set_updated_at ON public.forms;
-- DROP FUNCTION IF EXISTS public.check_form_submission_rate_limit();
-- DROP FUNCTION IF EXISTS public.soft_delete_form_submission(UUID);
-- DROP FUNCTION IF EXISTS public.set_forms_updated_at();
-- DROP TABLE IF EXISTS public.form_submissions;
-- DROP TABLE IF EXISTS public.forms;
-- DROP POLICY IF EXISTS "Public view form-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins insert form-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins update form-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins delete form-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Anyone uploads form-data" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins read form-data" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins delete form-data" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id IN ('form-assets', 'form-data');
