-- Returns total bytes stored across all buckets (used by usage-alert Edge Function)
CREATE OR REPLACE FUNCTION public.get_storage_size_bytes()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    SUM((metadata->>'size')::bigint),
    0
  )::bigint
  FROM storage.objects
  WHERE (metadata->>'size') IS NOT NULL;
$$;
