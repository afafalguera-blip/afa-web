import { supabase } from '../../lib/supabase';
import type { Faq, FaqTranslation } from '../FaqService';

export type { Faq } from '../FaqService';

export interface FaqFormData {
  category: string;
  sort_order: number;
  is_active: boolean;
  translations: Record<string, FaqTranslation>;
}

export const AdminFaqService = {
  async getFaqs(): Promise<Faq[]> {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []) as Faq[];
  },

  async deleteFaq(id: string): Promise<void> {
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('faqs')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  },

  async saveFaq(formData: FaqFormData, maxOrder: number, editingId?: string): Promise<void> {
    const es = formData.translations.es;
    const payload = {
      category: formData.translations.es?.category || formData.category,
      question: es?.question || '',
      answer: es?.answer || '',
      is_active: formData.is_active,
      translations: formData.translations
    };

    if (editingId) {
      const { error } = await supabase
        .from('faqs')
        .update({ ...payload, sort_order: formData.sort_order })
        .eq('id', editingId);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('faqs')
      .insert([{ ...payload, sort_order: maxOrder + 1 }]);

    if (error) throw error;
  }
};
