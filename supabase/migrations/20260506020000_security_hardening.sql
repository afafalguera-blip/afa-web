-- ============================================================
-- Migration: Security hardening — close anon attack surface
-- Date: 2026-05-06
--
-- Addresses Supabase advisor warnings:
--   * rls_policy_always_true on admin_users (CRITICAL: leaks
--     password hashes via PostgREST anon SELECT, allows anon
--     UPDATE of last_login).
--   * anon_security_definer_function_executable on internal
--     trigger functions and admin-only RPCs.
--   * function_search_path_mutable on several functions
--     (privilege-escalation risk for SECURITY DEFINER ones).
-- ============================================================

-- ------------------------------------------------------------
-- 1. authenticate_admin → SECURITY DEFINER so the FE no longer
--    needs anon SELECT/UPDATE policies on admin_users.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.authenticate_admin(
  p_username text,
  p_password text
)
RETURNS TABLE(success boolean, user_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_record public.admin_users%ROWTYPE;
  hashed_password text;
BEGIN
  SELECT * INTO user_record
  FROM public.admin_users
  WHERE username = p_username AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Usuario no encontrado';
    RETURN;
  END IF;

  hashed_password := public.hash_password(p_password);

  IF user_record.password_hash = hashed_password THEN
    UPDATE public.admin_users
    SET last_login = now()
    WHERE id = user_record.id;

    RETURN QUERY SELECT true, user_record.id, 'Autenticación exitosa';
  ELSE
    RETURN QUERY SELECT false, NULL::uuid, 'Contraseña incorrecta';
  END IF;
END;
$$;

-- Now the anon policies on admin_users are no longer needed.
DROP POLICY IF EXISTS "Allow anonymous select for auth" ON public.admin_users;
DROP POLICY IF EXISTS "Allow anonymous update last_login" ON public.admin_users;

-- Keep table read-locked; only authenticated admins can read via service role
-- or via the RPC. Add a strict admin-only policy for any future direct access.
DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
CREATE POLICY "Admins can read admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------
-- 2. Lock down trigger functions exposed via PostgREST /rpc.
--    Triggers run as the function owner regardless of EXECUTE
--    grants, so revoking is safe.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_audit_log()                             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_contact_message()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_shop_order()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_shop_order_inventory_on_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_shop_variant_stock()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_create_payments_for_inscription()           FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3. Lock admin-only RPCs to authenticated (admin uses
--    Supabase auth session which is `authenticated`).
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.dar_de_alta_inscripcion(uuid, text, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dar_de_baja_inscripcion(uuid, text, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_monthly_payments(int, int)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_monthly_payments_only_active(int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_baja_payments_for_month(int, int)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_db_size_bytes()                            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_storage_size_bytes()                       FROM PUBLIC, anon;

-- ------------------------------------------------------------
-- 4. Pin search_path on functions flagged as mutable.
--    For SECURITY DEFINER functions this prevents privilege
--    escalation via search_path manipulation.
-- ------------------------------------------------------------
ALTER FUNCTION public.sync_shop_variant_stock()                       SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_shop_order_inventory_on_status_change()  SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_shop_order()                         SET search_path = public, pg_catalog;
ALTER FUNCTION public.generate_slug(text)                             SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_db_size_bytes()                             SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_storage_size_bytes()                        SET search_path = public, pg_catalog;

-- ============================================================
-- ROLLBACK (manual, only if something breaks)
-- ============================================================
-- CREATE POLICY "Allow anonymous select for auth" ON public.admin_users
--   FOR SELECT TO anon USING (true);
-- CREATE POLICY "Allow anonymous update last_login" ON public.admin_users
--   FOR UPDATE TO anon USING (true) WITH CHECK (true);
-- GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
-- ... (re-grant as needed)
