import { supabase } from '../../lib/supabase';
import type { MenjadorMenu, MenjadorRate } from '../MenjadorService';

export type AdminMenjadorRate = MenjadorRate;
export type AdminMenjadorMenu = MenjadorMenu;

export interface MenuUploadData {
  title: string;
  month: number | null;
  year: number | null;
  file: File;
}

const ALLOWED_MIMES = new Set(['application/pdf']);
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

export const AdminMenjadorService = {
  // ---------- Rates ----------
  async getAllRates(): Promise<AdminMenjadorRate[]> {
    const { data, error } = await supabase
      .from('menjador_rates')
      .select('*')
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Replace all rates with the supplied list. Mirrors AcollidaManager pattern:
   * delete-then-insert keeps it simple and stable for a small static list.
   */
  async replaceAllRates(rates: Omit<AdminMenjadorRate, 'id'>[]): Promise<void> {
    const { error: delError } = await supabase
      .from('menjador_rates')
      .delete()
      .neq('label', '__FORCE_DELETE_ALL__');
    if (delError) throw delError;

    if (rates.length === 0) return;

    const { error: insError } = await supabase
      .from('menjador_rates')
      .insert(
        rates.map((r, i) => ({
          label: r.label,
          label_ca: r.label_ca,
          label_es: r.label_es,
          label_en: r.label_en,
          rate_type: r.rate_type,
          preu_soci: r.preu_soci,
          preu_no_soci: r.preu_no_soci,
          note: r.note,
          note_ca: r.note_ca,
          note_es: r.note_es,
          note_en: r.note_en,
          order_index: i,
        }))
      );
    if (insError) throw insError;
  },

  // ---------- Menus ----------
  async getAllMenus(): Promise<AdminMenjadorMenu[]> {
    const { data, error } = await supabase
      .from('menjador_menus')
      .select('*')
      .order('year', { ascending: false, nullsFirst: false })
      .order('month', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async uploadMenu(data: MenuUploadData): Promise<void> {
    const file = data.file;

    if (!ALLOWED_MIMES.has(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.type}. Solo PDF.`);
    }
    if (file.size > MAX_SIZE) {
      throw new Error('El archivo supera el tamaño máximo de 15MB');
    }

    const ext = file.name.split('.').pop() || 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `${data.year ?? 'sense-any'}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menjador-menus')
      .upload(filePath, file, { contentType: 'application/pdf' });
    if (uploadError) throw uploadError;

    try {
      const { data: { publicUrl } } = supabase.storage
        .from('menjador-menus')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('menjador_menus')
        .insert([{
          title: data.title,
          month: data.month,
          year: data.year,
          file_url: publicUrl,
          file_path: filePath,
          size_bytes: file.size,
          is_active: true,
        }]);
      if (dbError) throw dbError;
    } catch (err) {
      await supabase.storage.from('menjador-menus').remove([filePath]);
      throw err;
    }
  },

  async toggleMenuActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('menjador_menus')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteMenu(menu: AdminMenjadorMenu): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from('menjador-menus')
      .remove([menu.file_path]);
    if (storageError) console.warn('Storage delete warning:', storageError);

    const { error: dbError } = await supabase
      .from('menjador_menus')
      .delete()
      .eq('id', menu.id);
    if (dbError) throw dbError;
  },
};
