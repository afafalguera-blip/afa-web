import { supabase } from '../../lib/supabase';
import type { AcollidaMonitorLink, Child, AcollidaUnbilledRow } from '../../types/acollida';

const TABLE = 'children';

/** Rows a CSV import produces, before they have an id. */
export interface ChildDraft {
  name: string;
  surname: string;
  course: string;
  family_email?: string | null;
  family_phone?: string | null;
}

/**
 * The centre's roll of children, and the monitor links that read it.
 *
 * Importing is an upsert on name-and-course, so re-importing the school's list
 * after a correction updates instead of duplicating: the register has to keep
 * working while the list is being tidied up.
 */
export const AdminChildrenService = {
  async getAll(search = ''): Promise<Child[]> {
    let query = supabase.from(TABLE).select('*').order('surname').order('name');
    const term = search.trim();
    if (term) query = query.or(`name.ilike.%${term}%,surname.ilike.%${term}%`);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Child[];
  },

  async create(child: ChildDraft): Promise<void> {
    const { error } = await supabase.from(TABLE).insert({ ...child, source: 'manual' });
    if (error) throw error;
  },

  async update(id: string, patch: Partial<Child>): Promise<void> {
    const { error } = await supabase.from(TABLE).update(patch).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /** Upserts on (name, course) — see the note above about re-importing. */
  async importMany(rows: ChildDraft[]): Promise<number> {
    if (rows.length === 0) return 0;
    const { error } = await supabase
      .from(TABLE)
      .upsert(rows.map((r) => ({ ...r, source: 'import' })), { onConflict: 'match_key,course' });
    if (error) throw error;
    return rows.length;
  },

  async getLinks(): Promise<AcollidaMonitorLink[]> {
    const { data, error } = await supabase
      .from('acollida_monitor_links')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as AcollidaMonitorLink[];
  },

  /**
   * A new link. The token is generated in the browser with the platform's
   * crypto — 32 random bytes — because a token anybody could guess is the whole
   * security of this page.
   */
  async createLink(label: string, capacityGroup: 'mati' | 'tarda'): Promise<AcollidaMonitorLink> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const { data, error } = await supabase
      .from('acollida_monitor_links')
      .insert({ token, label, capacity_group: capacityGroup })
      .select()
      .single();
    if (error) throw error;
    return data as AcollidaMonitorLink;
  },

  async setLinkActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase.from('acollida_monitor_links').update({ active }).eq('id', id);
    if (error) throw error;
  },

  /** Children who came without a confirmed sign-up that month. */
  async getUnbilled(month: number, year: number): Promise<AcollidaUnbilledRow[]> {
    const { data, error } = await supabase.rpc('acollida_unbilled_attendance', {
      p_month: month,
      p_year: year,
    });
    if (error) throw error;
    return (data || []) as AcollidaUnbilledRow[];
  },
};

export default AdminChildrenService;
