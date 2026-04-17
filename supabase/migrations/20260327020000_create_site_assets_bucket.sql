-- ============================================================
-- Migration: Create site-assets storage bucket with admin policies
-- Date: 2026-03-27
-- Purpose: Enable image uploads for branding (logo, hero, placeholder)
-- ============================================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Public read access
DROP POLICY IF EXISTS "Public view site-assets" ON storage.objects;
CREATE POLICY "Public view site-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

-- 3. Admins can upload
DROP POLICY IF EXISTS "Admins can insert site-assets" ON storage.objects;
CREATE POLICY "Admins can insert site-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin());

-- 4. Admins can update
DROP POLICY IF EXISTS "Admins can update site-assets" ON storage.objects;
CREATE POLICY "Admins can update site-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'site-assets' AND public.is_admin());

-- 5. Admins can delete
DROP POLICY IF EXISTS "Admins can delete site-assets" ON storage.objects;
CREATE POLICY "Admins can delete site-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin());

-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP POLICY IF EXISTS "Public view site-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can insert site-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can update site-assets" ON storage.objects;
-- DROP POLICY IF EXISTS "Admins can delete site-assets" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'site-assets';
