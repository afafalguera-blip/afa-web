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
  list_number?: number | null;
}

/** What the roster import actually did, straight from the database. */
export interface RosterImportReport {
  academic_year: string;
  llegides: number;
  homonims: number;
  nous: number;
  actualitzats: number;
  matriculats: number;
  donats_baixa: number;
}

/**
 * The centre's roll of children, and the monitor links that read it.
 *
 * Importing goes through `import_children_roster`, not through an upsert from
 * here: it has to create who is missing, keep the contact details of who is
 * already there, enrol everybody in the right school year and — only when it is
 * the whole centre's list — deactivate whoever no longer appears. That is one
 * transaction, and a transaction does not belong in the browser.
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

  /**
   * The school's list for one academic year.
   *
   * `deactivateMissing` is off by default and the caller has to mean it: with a
   * single course's list it would mark the rest of the school as gone.
   */
  async importRoster(
    academicYear: string,
    rows: ChildDraft[],
    deactivateMissing = false,
  ): Promise<RosterImportReport> {
    const { data, error } = await supabase.rpc('import_children_roster', {
      p_academic_year: academicYear,
      p_rows: rows,
      p_deactivate_missing: deactivateMissing,
    });
    if (error) throw error;
    return data as RosterImportReport;
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
