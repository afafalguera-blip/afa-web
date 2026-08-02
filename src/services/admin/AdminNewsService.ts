import { supabase } from '../../lib/supabase';
import type { NewsArticle } from '../PublicNewsService';

export type NewsPublishedFilter = 'all' | 'published' | 'draft';

export interface NewsListParams {
  /** 1-based. */
  page: number;
  pageSize: number;
  search?: string;
  /** yyyy-mm-dd, inclusive. */
  dateFrom?: string;
  /** yyyy-mm-dd, inclusive. */
  dateTo?: string;
  published?: NewsPublishedFilter;
}

export interface NewsListResult {
  rows: NewsArticle[];
  total: number;
}

/** LIKE wildcards typed by the user must be literal, not pattern operators. */
const escapeLikePattern = (value: string) => value.replace(/[%_\\]/g, (match) => `\\${match}`);

export const AdminNewsService = {
  async list({
    page,
    pageSize,
    search,
    dateFrom,
    dateTo,
    published = 'all'
  }: NewsListParams): Promise<NewsListResult> {
    const offset = (Math.max(1, page) - 1) * pageSize;

    let query = supabase.from('news').select('*', { count: 'exact' });

    if (published === 'published') query = query.eq('published', true);
    if (published === 'draft') query = query.eq('published', false);

    const term = search?.trim();
    if (term) {
      // Only the base `title` column is searchable server-side: the per-language
      // titles live inside the `translations` JSON column and are not indexed.
      query = query.ilike('title', `%${escapeLikePattern(term)}%`);
    }

    // The list is ordered by "published_at, falling back to created_at", so the
    // date range has to consider both columns. Comparison happens in UTC on the
    // server while the UI picker is local time; near-midnight rows can therefore
    // land one day off. Accepted trade-off in exchange for server-side paging.
    if (dateFrom) {
      query = query.or(
        `published_at.gte.${dateFrom}T00:00:00,and(published_at.is.null,created_at.gte.${dateFrom}T00:00:00)`
      );
    }
    if (dateTo) {
      query = query.or(
        `published_at.lte.${dateTo}T23:59:59,and(published_at.is.null,created_at.lte.${dateTo}T23:59:59)`
      );
    }

    const { data, error, count } = await query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    return { rows: (data || []) as NewsArticle[], total: count ?? 0 };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async togglePublish(article: NewsArticle): Promise<NewsArticle> {
    const newPublished = !article.published;
    const publishedAt = newPublished ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('news')
      .update({
        published: newPublished,
        published_at: publishedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
