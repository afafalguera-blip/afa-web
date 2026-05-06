import { supabase } from '../lib/supabase';

export type MenjadorRateType = 'fix' | 'esporadic';

export interface MenjadorRate {
  id: string;
  label: string;
  label_ca?: string | null;
  label_es?: string | null;
  label_en?: string | null;
  rate_type: MenjadorRateType;
  preu_soci: string;
  preu_no_soci: string;
  note?: string | null;
  note_ca?: string | null;
  note_es?: string | null;
  note_en?: string | null;
  order_index: number;
}

export interface MenjadorMenu {
  id: string;
  title: string;
  month: number | null;
  year: number | null;
  file_url: string;
  file_path: string;
  size_bytes: number | null;
  is_active: boolean;
  created_at: string;
}

export interface MenjadorInfoBlock {
  intro: string;
  schedule: string;
  company: string;
  allergies: string;
  diets: string;
  how_to: string;
  contact: string;
}

export interface MenjadorInfoConfig {
  translations: {
    ca: MenjadorInfoBlock;
    es: MenjadorInfoBlock;
    en: MenjadorInfoBlock;
  };
}

export const MenjadorService = {
  async getRates(): Promise<MenjadorRate[]> {
    const { data, error } = await supabase
      .from('menjador_rates')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getActiveMenus(): Promise<MenjadorMenu[]> {
    const { data, error } = await supabase
      .from('menjador_menus')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false, nullsFirst: false })
      .order('month', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
