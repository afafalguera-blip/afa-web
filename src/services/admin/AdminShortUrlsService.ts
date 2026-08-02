import { supabase } from '../../lib/supabase';

export interface ShortUrl {
  id: string;
  slug: string;
  target_url: string;
  description: string | null;
  clicks: number;
  created_at: string;
  expires_at: string | null;
}

export interface ShortUrlFormData {
  slug: string;
  target_url: string;
  description: string;
  expires_at: string;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeTargetUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('TARGET_URL_REQUIRED');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('TARGET_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('TARGET_URL_INVALID');
  }

  return parsed.toString();
};

export const getShortLinkBaseUrl = (): string => {
  const configured = (import.meta.env.VITE_SHORT_LINK_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/+$/g, '');

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/g, '');
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/functions/v1/go`;
};

export interface ShortUrlListParams {
  /** 1-based. */
  page: number;
  pageSize: number;
  search?: string;
}

export interface ShortUrlListResult {
  rows: ShortUrl[];
  total: number;
}

/**
 * PostgREST `or=` groups are comma/parenthesis delimited, so those characters
 * cannot appear raw inside a value. Backslash and LIKE wildcards are escaped so
 * the term is matched literally.
 */
const sanitizeOrTerm = (value: string) =>
  value
    .replace(/[\\%_]/g, (match) => `\\${match}`)
    .replace(/[(),*"]/g, ' ')
    .trim();

export const AdminShortUrlsService = {
  /** Server-side paginated list; the search box is pushed down to the server. */
  async list({ page, pageSize, search }: ShortUrlListParams): Promise<ShortUrlListResult> {
    const offset = (Math.max(1, page) - 1) * pageSize;

    let query = supabase.from('short_urls').select('*', { count: 'exact' });

    const term = search ? sanitizeOrTerm(search) : '';
    if (term) {
      query = query.or(`slug.ilike.%${term}%,target_url.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    return { rows: (data || []) as ShortUrl[], total: count ?? 0 };
  },

  async save(formData: ShortUrlFormData, editingId?: string): Promise<void> {
    const slug = normalizeSlug(formData.slug);
    if (!slug) throw new Error('SLUG_REQUIRED');
    if (!SLUG_REGEX.test(slug)) throw new Error('SLUG_INVALID');

    const target_url = normalizeTargetUrl(formData.target_url);
    const expiresAtIso = formData.expires_at ? new Date(formData.expires_at).toISOString() : null;

    const payload = {
      slug,
      target_url,
      description: formData.description.trim() || null,
      expires_at: expiresAtIso
    };

    if (editingId) {
      const { error } = await supabase
        .from('short_urls')
        .update(payload)
        .eq('id', editingId);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('short_urls')
      .insert([payload]);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('short_urls')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
