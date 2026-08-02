import { supabase } from '../../lib/supabase';
import type { MenjadorMenu, MenjadorRate } from '../MenjadorService';

export type AdminMenjadorRate = MenjadorRate;
export type AdminMenjadorMenu = MenjadorMenu;

/** A row being edited: rows the admin just added carry a `tmp-` id until saved. */
export type AdminMenjadorRateDraft = Omit<AdminMenjadorRate, 'id'> & { id?: string };

export interface MenuUploadData {
  title: string;
  month: number | null;
  year: number | null;
  file: File;
}

const ALLOWED_MIMES = new Set(['application/pdf']);
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const TMP_PREFIX = 'tmp-';

export function newMenjadorDraftId(): string {
  return `${TMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** True when the id refers to a row that already exists in the database. */
export function isPersistedId(id?: string): id is string {
  return !!id && !id.startsWith(TMP_PREFIX);
}

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
   * Persists the edited list without ever emptying the table.
   *
   * Writes happen before deletes: existing rows are upserted by `id` (keeping
   * their ids and any reference to them), new rows are inserted, and only then
   * are the rows the admin actually removed deleted. A failure at any step
   * aborts the rest, so the worst case is a partial update, never a wipe.
   *
   * @param rates     the list as shown in the editor, in display order
   * @param loadedIds ids present when the editor loaded, used to diff deletions
   */
  async saveRates(rates: AdminMenjadorRateDraft[], loadedIds: string[]): Promise<AdminMenjadorRate[]> {
    const keptIds = new Set(rates.map(r => r.id).filter(isPersistedId));
    const removedIds = loadedIds.filter(id => !keptIds.has(id));

    const toRow = (r: AdminMenjadorRateDraft, i: number) => ({
      label: r.label || r.label_ca || r.label_es || r.label_en || '',
      label_ca: r.label_ca ?? null,
      label_es: r.label_es ?? null,
      label_en: r.label_en ?? null,
      rate_type: r.rate_type,
      preu_soci: r.preu_soci,
      preu_no_soci: r.preu_no_soci,
      note: r.note ?? null,
      note_ca: r.note_ca ?? null,
      note_es: r.note_es ?? null,
      note_en: r.note_en ?? null,
      order_index: i,
    });

    const existing = rates
      .map((rate, index) => ({ rate, index }))
      .filter(({ rate }) => isPersistedId(rate.id))
      .map(({ rate, index }) => ({ id: rate.id as string, ...toRow(rate, index) }));

    const created = rates
      .map((rate, index) => ({ rate, index }))
      .filter(({ rate }) => !isPersistedId(rate.id))
      .map(({ rate, index }) => toRow(rate, index));

    if (existing.length > 0) {
      const { error } = await supabase.from('menjador_rates').upsert(existing, { onConflict: 'id' });
      if (error) throw error;
    }

    if (created.length > 0) {
      const { error } = await supabase.from('menjador_rates').insert(created);
      if (error) throw error;
    }

    if (removedIds.length > 0) {
      const { error } = await supabase.from('menjador_rates').delete().in('id', removedIds);
      if (error) throw error;
    }

    return this.getAllRates();
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
