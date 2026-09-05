import { supabase } from '../lib/supabase';
import type { AcollidaRosterRow } from '../types/acollida';

/**
 * The monitor's side of the acollida, driven by a link with no password.
 *
 * Nothing here reads a table: every call hands the token to a database
 * function that checks it first. The link gives access to children's names, so
 * it can open exactly three doors — today's list, a search that needs three
 * letters, and marking someone in or out — and no others.
 */
export const AcollidaMonitorService = {
  async getRoster(token: string, day: string): Promise<AcollidaRosterRow[]> {
    const { data, error } = await supabase.rpc('acollida_monitor_roster', {
      p_token: token,
      p_day: day,
    });
    if (error) throw error;
    return (data || []) as AcollidaRosterRow[];
  },

  async search(token: string, query: string): Promise<AcollidaRosterRow[]> {
    const { data, error } = await supabase.rpc('acollida_monitor_search', {
      p_token: token,
      p_query: query,
    });
    if (error) throw error;
    return ((data || []) as { child_id: string; name: string; surname: string; course: string }[]).map(
      (row) => ({ ...row, expected: false, present: false, rate_id: null, slot: null, modality: null }),
    );
  },

  async mark(token: string, day: string, childId: string, present: boolean, rateId?: string | null): Promise<void> {
    const { error } = await supabase.rpc('acollida_monitor_mark', {
      p_token: token,
      p_day: day,
      p_child_id: childId,
      p_present: present,
      p_rate_id: rateId ?? null,
    });
    if (error) throw error;
  },
};

export default AcollidaMonitorService;
