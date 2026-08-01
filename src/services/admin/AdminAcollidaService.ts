import { supabase } from '../../lib/supabase';

export interface AcollidaRate {
  id: string;
  horari: string;
  preu_soci_mes: string;
  preu_soci_ocasional: string | null;
  preu_no_soci_mes: string;
  preu_no_soci_ocasional: string | null;
  order_index: number;
}

/** A row being edited: rows the admin just added carry a `tmp-` id until saved. */
export type AcollidaRateDraft = Omit<AcollidaRate, 'id'> & { id?: string };

const TMP_PREFIX = 'tmp-';

export function newAcollidaDraftId(): string {
  return `${TMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** True when the id refers to a row that already exists in the database. */
export function isPersistedId(id?: string): id is string {
  return !!id && !id.startsWith(TMP_PREFIX);
}

export const AdminAcollidaService = {
  async getAll(): Promise<AcollidaRate[]> {
    const { data, error } = await supabase
      .from('acollida_rates')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return (data || []) as AcollidaRate[];
  },

  /**
   * Persists the edited list without ever emptying the table.
   *
   * Writes happen before deletes: existing rows are upserted by `id` (so their
   * ids — and any reference to them — survive), new rows are inserted, and only
   * then are the rows the admin actually removed deleted. A failure at any step
   * aborts the rest, so the worst case is a partial update, never a wipe.
   *
   * @param rates    the list as shown in the editor, in display order
   * @param loadedIds ids present when the editor loaded, used to diff deletions
   */
  async saveAll(rates: AcollidaRateDraft[], loadedIds: string[]): Promise<AcollidaRate[]> {
    const keptIds = new Set(rates.map(r => r.id).filter(isPersistedId));
    const removedIds = loadedIds.filter(id => !keptIds.has(id));

    const toRow = (rate: AcollidaRateDraft, index: number) => ({
      horari: rate.horari,
      preu_soci_mes: rate.preu_soci_mes,
      preu_soci_ocasional: rate.preu_soci_ocasional || null,
      preu_no_soci_mes: rate.preu_no_soci_mes,
      preu_no_soci_ocasional: rate.preu_no_soci_ocasional || null,
      order_index: index
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
      const { error } = await supabase.from('acollida_rates').upsert(existing, { onConflict: 'id' });
      if (error) throw error;
    }

    if (created.length > 0) {
      const { error } = await supabase.from('acollida_rates').insert(created);
      if (error) throw error;
    }

    if (removedIds.length > 0) {
      const { error } = await supabase.from('acollida_rates').delete().in('id', removedIds);
      if (error) throw error;
    }

    return this.getAll();
  }
};

export default AdminAcollidaService;
