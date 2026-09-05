import { supabase } from '../../lib/supabase';
import type { AcollidaRate } from '../../types/acollida';

export type { AcollidaRate };

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

/**
 * A rate that families already signed up to cannot be deleted: the sign-up
 * points at it, and losing it would leave those rows without a price. The UI
 * turns this into "deactivate it instead", which is what the AFA means anyway
 * when a time slot stops being offered.
 */
export class AcollidaRateInUseError extends Error {
  readonly count: number;

  constructor(count: number) {
    super('acollida_rate_in_use');
    this.name = 'AcollidaRateInUseError';
    this.count = count;
  }
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

  /** How many sign-ups point at each of the given rates. Keyed by rate id. */
  async countUsage(rateIds: string[]): Promise<Record<string, number>> {
    if (rateIds.length === 0) return {};

    const { data, error } = await supabase
      .from('acollida_inscripcions')
      .select('rate_id')
      .in('rate_id', rateIds);

    if (error) throw error;

    return (data || []).reduce<Record<string, number>>((acc, row) => {
      const id = (row as { rate_id: string }).rate_id;
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});
  },

  /**
   * Persists the edited list without ever emptying the table.
   *
   * Writes happen before deletes: existing rows are upserted by `id` (so their
   * ids — and any sign-up pointing at them — survive), new rows are inserted,
   * and only then are the rows the admin actually removed deleted. A failure at
   * any step aborts the rest, so the worst case is a partial update, never a
   * wipe. A removed rate that is still in use aborts BEFORE any write, so the
   * admin gets the message with the editor untouched.
   *
   * @param rates    the list as shown in the editor, in display order
   * @param loadedIds ids present when the editor loaded, used to diff deletions
   */
  async saveAll(rates: AcollidaRateDraft[], loadedIds: string[]): Promise<AcollidaRate[]> {
    const keptIds = new Set(rates.map(r => r.id).filter(isPersistedId));
    const removedIds = loadedIds.filter(id => !keptIds.has(id));

    if (removedIds.length > 0) {
      const usage = await this.countUsage(removedIds);
      const blocked = Object.values(usage).reduce((a, b) => a + b, 0);
      if (blocked > 0) throw new AcollidaRateInUseError(blocked);
    }

    const toRow = (rate: AcollidaRateDraft, index: number) => ({
      horari: rate.horari,
      preu_soci_mes: rate.preu_soci_mes,
      preu_soci_ocasional: rate.preu_soci_ocasional,
      preu_no_soci_mes: rate.preu_no_soci_mes,
      preu_no_soci_ocasional: rate.preu_no_soci_ocasional,
      active: rate.active,
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
