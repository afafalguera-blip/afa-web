import { supabase } from '../../lib/supabase';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  /** NULL = acción de sistema (cron / service_role / cascada). */
  changed_by: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  } | null;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  tableName?: string;
  action?: string;
  userId?: string;
  /** ISO date (yyyy-mm-dd) inclusivo. */
  dateFrom?: string;
  /** ISO date (yyyy-mm-dd) inclusivo: se expande hasta el final del día. */
  dateTo?: string;
  /** Coincidencia parcial sobre table_name o record_id. */
  search?: string;
}

export interface AuditLogPage {
  rows: AuditLog[];
  total: number;
}

export interface AuditLogFacets {
  tables: string[];
  users: { id: string; full_name: string }[];
}

export const AUDIT_ACTIONS: AuditAction[] = ['INSERT', 'UPDATE', 'DELETE'];

const SELECT_COLUMNS =
  'id, table_name, record_id, action, old_data, new_data, changed_by, created_at, profiles!changed_by(full_name)';

/** Muestra reciente sobre la que se calculan los desplegables de filtro. */
const FACET_SAMPLE_SIZE = 2000;

const DEFAULT_PAGE_SIZE = 25;

type RawRow = Omit<AuditLog, 'profiles'> & {
  // PostgREST devuelve el embed como objeto o como array según la relación.
  profiles?: { full_name: string } | { full_name: string }[] | null;
};

const normalizeProfile = (
  embed: RawRow['profiles']
): { full_name: string } | null => (Array.isArray(embed) ? embed[0] ?? null : embed ?? null);

const endOfDay = (isoDate: string): string => `${isoDate}T23:59:59.999Z`;

export const AdminObservabilityService = {
  async getLogs(query: AuditLogQuery = {}): Promise<AuditLogPage> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let request = supabase
      .from('audit_logs')
      .select(SELECT_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query.tableName) request = request.eq('table_name', query.tableName);
    if (query.action) request = request.eq('action', query.action);
    if (query.userId) request = request.eq('changed_by', query.userId);
    if (query.dateFrom) request = request.gte('created_at', query.dateFrom);
    if (query.dateTo) request = request.lte('created_at', endOfDay(query.dateTo));

    const search = query.search?.trim();
    if (search) {
      // `,` `(` `)` y `%` rompen la gramática de PostgREST dentro de .or().
      const escaped = search.replace(/[%,()]/g, '');
      if (escaped) {
        request = request.or(`table_name.ilike.%${escaped}%,record_id.ilike.%${escaped}%`);
      }
    }

    const { data, error, count } = await request;
    if (error) throw error;

    const rows = ((data ?? []) as unknown as RawRow[]).map((row) => ({
      ...row,
      profiles: normalizeProfile(row.profiles)
    }));

    return { rows, total: count ?? 0 };
  },

  /**
   * Opciones de los filtros. PostgREST no expone DISTINCT, así que se deducen
   * de una muestra de los registros más recientes.
   */
  async getFacets(): Promise<AuditLogFacets> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('table_name, changed_by, profiles!changed_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(FACET_SAMPLE_SIZE);

    if (error) throw error;

    const tables = new Set<string>();
    const users = new Map<string, string>();

    ((data ?? []) as unknown as Pick<RawRow, 'table_name' | 'changed_by' | 'profiles'>[]).forEach(
      (row) => {
        if (row.table_name) tables.add(row.table_name);
        if (row.changed_by && !users.has(row.changed_by)) {
          const profile = normalizeProfile(row.profiles);
          users.set(row.changed_by, profile?.full_name ?? row.changed_by);
        }
      }
    );

    return {
      tables: [...tables].sort((a, b) => a.localeCompare(b)),
      users: [...users.entries()]
        .map(([id, full_name]) => ({ id, full_name }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
    };
  }
};
