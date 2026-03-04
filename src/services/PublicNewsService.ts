import { supabase } from '../lib/supabase';

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  sources?: string | null;
  news_url?: string | null;
  event_date?: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  translations?: Record<string, { title: string; excerpt: string; content: string }>;
}

export const PublicNewsService = {
  async getNewsBySlug(slug: string, lang: string): Promise<NewsArticle | null> {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error || !data) return null;

      // Apply translations if available
      const translations = data.translations || {};
      const langData = translations[lang] || {};

      return {
        ...data,
        title: langData.title || data.title,
        excerpt: langData.excerpt || data.excerpt,
        content: langData.content || data.content,
      };
    } catch (err) {
      console.error('Error fetching news by slug:', err);
      return null;
    }
  },

  async getAllNews(lang: string): Promise<NewsArticle[]> {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(article => {
        const translations = article.translations || {};
        const langData = translations[lang] || {};

        return {
          ...article,
          title: langData.title || article.title,
          excerpt: langData.excerpt || article.excerpt,
          content: langData.content || article.content,
        };
      });
    } catch (err) {
      console.error('Error fetching all news:', err);
      return [];
    }
  }
};
