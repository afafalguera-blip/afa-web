import { supabase } from '../lib/supabase';

export interface FaqTranslation {
  category: string;
  question: string;
  answer: string;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  translations?: Record<string, FaqTranslation>;
}

export const FaqService = {
  async getActive(): Promise<Faq[]> {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []) as Faq[];
  }
};
