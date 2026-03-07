import { supabase } from '../../lib/supabase';
import type { NewsArticle } from '../PublicNewsService';

export const AdminNewsService = {
  async getAll(): Promise<NewsArticle[]> {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
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
