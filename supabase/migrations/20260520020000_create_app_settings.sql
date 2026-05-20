-- ============================================================
-- Migration: app_settings (admin-managed runtime secrets)
-- Date: 2026-05-20
-- Pattern ported from inmaculada/backend (PHP) to Supabase/Postgres.
-- ============================================================
--
-- Stores secrets such as GEMINI_API_KEY that the admin can rotate from
-- the UI without redeploying. RLS denies everyone — only service_role
-- (the Edge Function runtime) can SELECT the raw value. The admin UI
-- talks through SECURITY DEFINER RPCs that:
--   · admin_set_app_setting    — write (admin-only)
--   · admin_delete_app_setting — clear (admin-only)
--   · admin_get_app_setting_meta — read masked summary (admin-only)
-- Raw values never leave the database for any role other than the
-- Edge Function.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.app_settings IS
'Runtime secrets managed from the admin UI (e.g. GEMINI_API_KEY). RLS denies all roles; only service_role and SECURITY DEFINER functions touch the raw value.';

-- ------------------------------------------------------------
-- RLS: deny everyone. Service role bypasses RLS, so the Edge
-- Function can still read with its key.
-- ------------------------------------------------------------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- (no policies → all reads/writes from authenticated/anon are blocked)

-- ------------------------------------------------------------
-- Whitelist of allowed setting keys.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_allowed_setting_key(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_key IN ('GEMINI_API_KEY');
$$;

-- ------------------------------------------------------------
-- Masking helper: last 4 chars, the rest as bullets.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mask_secret(value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    len INT := length(coalesce(value, ''));
BEGIN
    IF len = 0 THEN RETURN ''; END IF;
    IF len < 8 THEN RETURN repeat('•', len); END IF;
    RETURN repeat('•', len - 4) || right(value, 4);
END;
$$;

-- ------------------------------------------------------------
-- RPCs (SECURITY DEFINER, admin-gated)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_app_setting(p_key TEXT, p_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_allowed_setting_key(p_key) THEN
        RAISE EXCEPTION 'unknown setting key: %', p_key USING ERRCODE = '22023';
    END IF;
    IF p_value IS NULL OR length(trim(p_value)) = 0 THEN
        RAISE EXCEPTION 'value required' USING ERRCODE = '22023';
    END IF;
    IF length(p_value) > 1024 THEN
        RAISE EXCEPTION 'value too long' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.app_settings (key, value, updated_by)
    VALUES (p_key, p_value, auth.uid())
    ON CONFLICT (key) DO UPDATE
       SET value      = EXCLUDED.value,
           updated_at = NOW(),
           updated_by = EXCLUDED.updated_by;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_app_setting(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_app_setting(p_key TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_allowed_setting_key(p_key) THEN
        RAISE EXCEPTION 'unknown setting key: %', p_key USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.app_settings WHERE key = p_key;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_app_setting(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_app_setting_meta(p_key TEXT)
RETURNS TABLE (
    key TEXT,
    is_set BOOLEAN,
    masked TEXT,
    updated_at TIMESTAMPTZ,
    updated_by_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_allowed_setting_key(p_key) THEN
        RAISE EXCEPTION 'unknown setting key: %', p_key USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
        s.key,
        TRUE AS is_set,
        public.mask_secret(s.value) AS masked,
        s.updated_at,
        u.email::TEXT AS updated_by_email
    FROM public.app_settings s
    LEFT JOIN auth.users u ON u.id = s.updated_by
    WHERE s.key = p_key
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_app_setting_meta(TEXT) TO authenticated;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP FUNCTION IF EXISTS public.admin_get_app_setting_meta(TEXT);
-- DROP FUNCTION IF EXISTS public.admin_delete_app_setting(TEXT);
-- DROP FUNCTION IF EXISTS public.admin_set_app_setting(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.mask_secret(TEXT);
-- DROP FUNCTION IF EXISTS public.is_allowed_setting_key(TEXT);
-- DROP TABLE IF EXISTS public.app_settings;
