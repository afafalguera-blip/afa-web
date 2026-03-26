-- ============================================================
-- Migration: Harden RLS for activities, documents & storage buckets
-- Date: 2026-03-26
-- Depends on: 20260326200000_define_is_admin_and_fix_rls.sql (is_admin())
-- Rollback instructions at bottom of file
-- ============================================================

-- ============================================================
-- 1. ACTIVITIES TABLE
-- ============================================================

DROP POLICY IF EXISTS "Authenticated full access" ON public.activities;

DROP POLICY IF EXISTS "Public read access" ON public.activities;
CREATE POLICY "Public read access"
  ON public.activities FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert activities" ON public.activities;
CREATE POLICY "Admins can insert activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update activities" ON public.activities;
CREATE POLICY "Admins can update activities"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete activities" ON public.activities;
CREATE POLICY "Admins can delete activities"
  ON public.activities FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 2. DOCUMENTS TABLE
-- ============================================================

DROP POLICY IF EXISTS "Admins can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;

DROP POLICY IF EXISTS "Public documents are viewable by everyone" ON public.documents;
CREATE POLICY "Public documents are viewable by everyone"
  ON public.documents FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 3. STORAGE: activity-images bucket
-- ============================================================

DROP POLICY IF EXISTS "Authenticated Manage Activity Images" ON storage.objects;

DROP POLICY IF EXISTS "Public View Activity Images" ON storage.objects;
CREATE POLICY "Public View Activity Images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-images');

DROP POLICY IF EXISTS "Admins can insert activity-images" ON storage.objects;
CREATE POLICY "Admins can insert activity-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'activity-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update activity-images" ON storage.objects;
CREATE POLICY "Admins can update activity-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'activity-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'activity-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete activity-images" ON storage.objects;
CREATE POLICY "Admins can delete activity-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'activity-images' AND public.is_admin());

-- ============================================================
-- 4. STORAGE: documents bucket
-- ============================================================

DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;

DROP POLICY IF EXISTS "Documents are publicly accessible" ON storage.objects;
CREATE POLICY "Documents are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Admins can insert documents storage" ON storage.objects;
CREATE POLICY "Admins can insert documents storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update documents storage" ON storage.objects;
CREATE POLICY "Admins can update documents storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete documents storage" ON storage.objects;
CREATE POLICY "Admins can delete documents storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());

-- ============================================================
-- ROLLBACK (run manually to revert)
-- ============================================================
-- DROP POLICY IF EXISTS "Admins can insert activities" ON public.activities;
-- DROP POLICY IF EXISTS "Admins can update activities" ON public.activities;
-- DROP POLICY IF EXISTS "Admins can delete activities" ON public.activities;
-- CREATE POLICY "Authenticated full access" ON public.activities
--   FOR ALL USING (auth.role() = 'authenticated');
--
-- DROP POLICY IF EXISTS "Admins can insert documents" ON public.documents;
-- DROP POLICY IF EXISTS "Admins can update documents" ON public.documents;
-- DROP POLICY IF EXISTS "Admins can delete documents" ON public.documents;
-- CREATE POLICY "Admins can insert documents" ON public.documents FOR INSERT
--   TO authenticated WITH CHECK (true);
-- CREATE POLICY "Admins can update documents" ON public.documents FOR UPDATE
--   TO authenticated USING (true);
-- CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE
--   TO authenticated USING (true);
