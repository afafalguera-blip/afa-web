import { supabase } from '../../../lib/supabase';

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  news_url?: string | null;
  sources?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  event_date?: string | null;
  translations?: Record<string, { title: string; excerpt: string; content: string }>;
}

export const NewsService = {
  async getLatestNews(limit: number = 3): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching news:', error);
      throw error;
    }
    return data || [];
  }
};
