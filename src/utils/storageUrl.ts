const SUPABASE_STORAGE_PREFIX = 'https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/';

/**
 * Converts a Supabase Storage URL to a proxied URL served through Vercel's CDN.
 * This avoids Supabase egress charges by caching images at the edge.
 *
 * Example:
 *   https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/logo.png
 *   → /storage/object/public/Imagenes/logo.png
 */
export function proxyStorageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith(SUPABASE_STORAGE_PREFIX)) {
    return '/storage/' + url.slice(SUPABASE_STORAGE_PREFIX.length);
  }
  return url;
}
