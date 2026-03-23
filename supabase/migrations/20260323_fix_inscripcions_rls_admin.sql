-- Fix RLS for inscriptions so admin users (authenticated with admin role) can read/manage records.
-- Keep public insert enabled for public inscription form.

ALTER TABLE public.inscripcions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous select" ON public.inscripcions;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.inscripcions;
DROP POLICY IF EXISTS "Allow anonymous delete" ON public.inscripcions;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.inscripcions;

CREATE POLICY "Admins can select inscriptions"
ON public.inscripcions
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update inscriptions"
ON public.inscripcions
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete inscriptions"
ON public.inscripcions
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Public can insert inscriptions"
ON public.inscripcions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
