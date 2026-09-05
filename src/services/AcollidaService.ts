import { supabase } from '../lib/supabase';
import type { AcollidaRate, AcollidaInscriptionInput } from '../types/acollida';

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
