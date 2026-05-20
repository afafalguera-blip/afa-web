-- ============================================================
-- Migration: Lock down storage object listing on public buckets
-- Date: 2026-05-06
--
-- Public buckets serve objects directly via the storage gateway
-- (bucket.public=true), so no `storage.objects` SELECT policy
-- is needed for `getPublicUrl` to work. The broad SELECT
-- policies were leaking the listing API to anon, which the
-- advisor flagged. Drop them.
--
-- Also tighten the `invoices` bucket: a stray policy was
-- allowing any role to INSERT.
-- ============================================================

-- 1. Drop broad SELECT policies (listing) on public buckets.
DROP POLICY IF EXISTS "Public Access"                          ON storage.objects;
DROP POLICY IF EXISTS "Public View Activity Images"            ON storage.objects;
DROP POLICY IF EXISTS "Documents are publicly accessible"      ON storage.objects;
DROP POLICY IF EXISTS "Public view site-assets"                ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to site-assets" ON storage.objects;

-- 2. Authenticated admins can still LIST their buckets if they
--    need to (admin tooling). Add narrow admin-only SELECT.
DROP POLICY IF EXISTS "Admins can list invoices"          ON storage.objects;
CREATE POLICY "Admins can list invoices"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoices' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can list activity-images"   ON storage.objects;
CREATE POLICY "Admins can list activity-images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'activity-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can list documents"         ON storage.objects;
CREATE POLICY "Admins can list documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can list site-assets"       ON storage.objects;
CREATE POLICY "Admins can list site-assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.is_admin());

-- 3. Tighten invoices INSERT — was open to any role.
DROP POLICY IF EXISTS "Authenticated Upload"              ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert invoices"        ON storage.objects;
CREATE POLICY "Admins can insert invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update invoices" ON storage.objects;
CREATE POLICY "Admins can update invoices"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoices' AND public.is_admin())
  WITH CHECK (bucket_id = 'invoices' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete invoices" ON storage.objects;
CREATE POLICY "Admins can delete invoices"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'invoices' AND public.is_admin());

-- 4. Remove duplicate site-assets policies (cleanup).
DROP POLICY IF EXISTS "Allow admin upload to site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin update to site-assets" ON storage.objects;
