-- ============================================================
-- Migration: Fix privilege escalation on profiles + anon rate limits
-- Date: 2026-08-01
-- ============================================================
-- Contexto: la policy "Users can update own profile." permitia UPDATE sobre
-- la propia fila sin WITH CHECK, por lo que cualquier usuario registrado
-- podia ejecutar `update profiles set role='admin'` y tomar el control del
-- admin completo (is_admin() resuelve contra profiles.role). El registro por
-- email esta abierto, asi que la cadena era explotable por cualquiera.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles: impedir auto-promocion de rol
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    jwt_role text := COALESCE(
        NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role',
        ''
    );
    caller_is_admin boolean;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
        RETURN NEW;
    END IF;

    -- Sin claims JWT = conexion directa (psql, Management API, migraciones)
    IF jwt_role IN ('service_role', 'supabase_admin', '') THEN
        RETURN NEW;
    END IF;

    SELECT (p.role = 'admin') INTO caller_is_admin
    FROM public.profiles p
    WHERE p.id = auth.uid();

    IF COALESCE(caller_is_admin, false) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.role := 'familia';
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'No autoritzat a modificar profiles.role'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();

-- Defensa en profundidad: la policy tambien fija el rol permitido.
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

-- El SELECT era USING (true) para public: exponia nombre y rol de los
-- administradores a cualquier visitante anonimo.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id OR public.is_admin());

-- ------------------------------------------------------------
-- 2. Retirar el sistema de auth legacy expuesto a anon
-- ------------------------------------------------------------
-- authenticate_admin comparaba hashes sin salt ni rate-limit y distinguia
-- "usuario inexistente" de "password incorrecta" (enumeracion). El acceso
-- real al admin es Supabase Auth + RLS, asi que es superficie muerta.

DROP FUNCTION IF EXISTS public.authenticate_admin(text, text);
-- El grant efectivo venia de PUBLIC, no de anon/authenticated directamente.
REVOKE ALL ON FUNCTION public.hash_password(text) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3. Rate limit en inserts anonimos con datos personales
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_inscripcio_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_same_email INT;
    recent_total INT;
BEGIN
    SELECT COUNT(*) INTO recent_same_email
    FROM public.inscripcions
    WHERE created_at > (NOW() - interval '60 seconds')
      AND parent_email_1 IS NOT DISTINCT FROM NEW.parent_email_1;

    IF recent_same_email >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa inscripcions en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    -- Freno global generoso: no bloquea una jornada de inscripciones real,
    -- pero corta el flood automatizado que dispara emails via webhook.
    SELECT COUNT(*) INTO recent_total
    FROM public.inscripcions
    WHERE created_at > (NOW() - interval '60 seconds');

    IF recent_total >= 40 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa inscripcions en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inscripcio_rate_limit ON public.inscripcions;
CREATE TRIGGER trg_inscripcio_rate_limit
    BEFORE INSERT ON public.inscripcions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_inscripcio_rate_limit();

CREATE OR REPLACE FUNCTION public.check_contact_message_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_same_email INT;
    recent_total INT;
BEGIN
    SELECT COUNT(*) INTO recent_same_email
    FROM public.contact_messages
    WHERE created_at > (NOW() - interval '300 seconds')
      AND email IS NOT DISTINCT FROM NEW.email;

    IF recent_same_email >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa missatges en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    SELECT COUNT(*) INTO recent_total
    FROM public.contact_messages
    WHERE created_at > (NOW() - interval '60 seconds');

    IF recent_total >= 20 THEN
        RAISE EXCEPTION 'Rate limit exceeded: massa missatges en poc temps'
            USING ERRCODE = 'P0429';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_message_rate_limit ON public.contact_messages;
CREATE TRIGGER trg_contact_message_rate_limit
    BEFORE INSERT ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.check_contact_message_rate_limit();

-- ------------------------------------------------------------
-- 4. Higiene de policies
-- ------------------------------------------------------------
-- inscripcions tenia dos policies INSERT identicas y redundantes.
DROP POLICY IF EXISTS "Anyone can submit inscriptions" ON public.inscripcions;

-- search_path faltante (unico SECURITY DEFINER vigente sin fijar).
ALTER FUNCTION public.check_form_submission_rate_limit() SET search_path = public;
