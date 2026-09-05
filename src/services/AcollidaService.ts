import { supabase } from '../lib/supabase';
import type { AcollidaRate, AcollidaInscriptionInput, AcollidaCapacity } from '../types/acollida';

/** Postgres error code raised by `check_acollida_rate_limit()`. */
const RATE_LIMIT_CODE = 'P0429';

export class AcollidaRateLimitError extends Error {
  constructor() {
    super('acollida_rate_limit');
    this.name = 'AcollidaRateLimitError';
  }
}

export const AcollidaService = {
  /** Rates shown on the public page and offered by the sign-up form. */
  async getRates(includeInactive = false): Promise<AcollidaRate[]> {
    let query = supabase.from('acollida_rates').select('*').order('order_index', { ascending: true });
    if (!includeInactive) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AcollidaRate[];
  },

  /** Seats per room. Public: the form has to say when a day is full. */
  async getCapacity(): Promise<AcollidaCapacity[]> {
    const { data, error } = await supabase.from('acollida_capacity').select('*');
    if (error) throw error;
    return (data || []) as AcollidaCapacity[];
  },

  /**
   * Days with no seat left for this slot's room, between two dates.
   *
   * The RPC answers with dates and nothing else — no names, no counts, no rows
   * of other families — which is why an anonymous visitor may call it at all.
   */
  async getFullDays(rateId: string, from: string, to: string): Promise<string[]> {
    const { data, error } = await supabase.rpc('acollida_full_days', {
      p_rate_id: rateId,
      p_from: from,
      p_to: to,
    });
    if (error) throw error;
    return (data || []) as string[];
  },

  /**
   * Sends one row per child. They go in a single INSERT so a family either gets
   * all of its children signed up or none: half a family on the list is the
   * kind of thing nobody notices until the day the service starts.
   */
  async submitInscriptions(rows: AcollidaInscriptionInput[]): Promise<void> {
    const { error } = await supabase.from('acollida_inscripcions').insert(rows);
    if (!error) return;

    const code = (error as { code?: string }).code;
    if (code === RATE_LIMIT_CODE) throw new AcollidaRateLimitError();
    throw error;
  },
};

export default AcollidaService;
