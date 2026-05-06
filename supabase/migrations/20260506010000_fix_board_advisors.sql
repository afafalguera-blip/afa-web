-- ============================================================
-- Migration: Address Supabase advisors for board_members work
-- Date: 2026-05-06
-- Fixes:
--   - function_search_path_mutable on set_board_members_updated_at
--   - multiple_permissive_policies on board_members SELECT
-- ============================================================

-- Pin search_path on the trigger function
CREATE OR REPLACE FUNCTION public.set_board_members_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Collapse the two overlapping SELECT policies into one
DROP POLICY IF EXISTS "Public can read visible board members" ON public.board_members;
DROP POLICY IF EXISTS "Admins can read all board members" ON public.board_members;

CREATE POLICY "Read board members"
  ON public.board_members FOR SELECT
  USING (is_visible = true OR public.is_admin());
