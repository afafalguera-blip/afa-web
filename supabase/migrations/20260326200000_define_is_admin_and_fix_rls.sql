-- ============================================================
-- Migration: Define is_admin() function and harden RLS policies
-- Date: 2026-03-26
-- ============================================================

-- 1. Create the is_admin() helper used by RLS policies
-- Returns true if the current authenticated user has role 'admin' or 'coordinator'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
  );
$$;

-- Grant execute to authenticated users (needed for RLS evaluation)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Harden finance_transactions RLS
-- Drop the overly permissive policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'finance_transactions'
      AND policyname = 'Enable all access for all'
  ) THEN
    DROP POLICY "Enable all access for all" ON public.finance_transactions;
  END IF;
END $$;

-- Create proper admin-only policies for finance_transactions
CREATE POLICY "Admins can read finance_transactions"
  ON public.finance_transactions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert finance_transactions"
  ON public.finance_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update finance_transactions"
  ON public.finance_transactions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete finance_transactions"
  ON public.finance_transactions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3. Harden inscripcions RLS
-- Drop the overly permissive policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscripcions'
      AND policyname = 'Enable all access for all'
  ) THEN
    DROP POLICY "Enable all access for all" ON public.inscripcions;
  END IF;
END $$;

-- Allow anyone (including anon) to INSERT inscriptions (public form)
CREATE POLICY "Anyone can submit inscriptions"
  ON public.inscripcions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read, update, delete inscriptions
-- (These may already exist from 20260323 migration; use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscripcions'
      AND policyname = 'Admins can select inscriptions'
  ) THEN
    CREATE POLICY "Admins can select inscriptions"
      ON public.inscripcions FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscripcions'
      AND policyname = 'Admins can update inscriptions'
  ) THEN
    CREATE POLICY "Admins can update inscriptions"
      ON public.inscripcions FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'inscripcions'
      AND policyname = 'Admins can delete inscriptions'
  ) THEN
    CREATE POLICY "Admins can delete inscriptions"
      ON public.inscripcions FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;
