import { supabase } from '../../lib/supabase';
import type { AcollidaFilters, AcollidaInscription, AcollidaStatus } from '../../types/acollida';

const TABLE = 'acollida_inscripcions';
const DEFAULT_PAGE_SIZE = 25;

export interface GetAcollidaParams extends Partial<AcollidaFilters> {
  academicYear?: string;
  /** 1-based. */
  page?: number;
  pageSize?: number;
}

export interface GetAcollidaResult {
  rows: AcollidaInscription[];
  total: number;
}

export interface AcollidaStats {
  total: number;
  confirmed: number;
  pending: number;
  monthly: number;
  occasional: number;
}

export interface GenerateResult {
  success: boolean;
  message: string;
  payments_generated: number;
}

/**
 * Every filter is a plain column, so all of them go to Postgres — unlike the
 * extraescolar listing, which has to filter courses in memory because they live
 * inside a JSONB array. That is the whole point of giving acollida its own
 * table: the page you see is the page the database sent.
 */
const applyFilters = <T>(query: T, params: GetAcollidaParams): T => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;

  if (params.academicYear) q = q.eq('academic_year', params.academicYear);
  if (params.status) q = q.eq('status', params.status);
  if (params.course) q = q.eq('course', params.course);
  if (params.rateId) q = q.eq('rate_id', params.rateId);
  if (params.modality) q = q.eq('modality', params.modality);
  if (params.weekday) q = q.contains('weekdays', [Number(params.weekday)]);

  const search = params.search?.trim();
  if (search) {
    const safe = search.replace(/[%,()]/g, ' ');
    q = q.or(
      [
        `child_name.ilike.%${safe}%`,
        `child_surname.ilike.%${safe}%`,
        `parent_name.ilike.%${safe}%`,
        `parent_email.ilike.%${safe}%`,
        `parent_phone.ilike.%${safe}%`,
      ].join(','),
    );
  }

  return q as T;
};

export const AdminAcollidaInscriptionsService = {
  async getPage(params: GetAcollidaParams = {}): Promise<GetAcollidaResult> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;

    const query = applyFilters(
      supabase.from(TABLE).select('*', { count: 'exact' }),
      params,
    )
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: (data || []) as AcollidaInscription[], total: count ?? 0 };
  },

  /** Every row matching the filters, for exports and the per-day roster. */
  async getAllFiltered(params: GetAcollidaParams = {}): Promise<AcollidaInscription[]> {
    const query = applyFilters(supabase.from(TABLE).select('*'), params).order('child_surname', {
      ascending: true,
    });

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AcollidaInscription[];
  },

  async getAcademicYears(): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('academic_year')
      .order('academic_year', { ascending: false });

    if (error) throw error;
    return [...new Set((data || []).map((r) => (r as { academic_year: string }).academic_year))];
  },

  async getStats(academicYear?: string): Promise<AcollidaStats> {
    const query = applyFilters(supabase.from(TABLE).select('status, modality'), {
      academicYear,
    });
    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as { status: AcollidaStatus; modality: string }[];
    return {
      total: rows.length,
      confirmed: rows.filter((r) => r.status === 'confirmada').length,
      pending: rows.filter((r) => r.status === 'pendent').length,
      monthly: rows.filter((r) => r.modality === 'mensual').length,
      occasional: rows.filter((r) => r.modality === 'ocasional').length,
    };
  },

  async setStatus(id: string, status: AcollidaStatus): Promise<void> {
    const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
    if (error) throw error;
  },

  async update(id: string, patch: Partial<AcollidaInscription>): Promise<void> {
    const { error } = await supabase.from(TABLE).update(patch).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Turns the confirmed sign-ups of that month into receipts (concept
   * 'acollida'). Already-paid receipts are never touched: the guard is in the
   * SQL function, not here.
   */
  async generatePayments(month: number, year: number): Promise<GenerateResult> {
    const { data, error } = await supabase.rpc('generate_acollida_payments', {
      p_month: month,
      p_year: year,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return (row || { success: false, message: '', payments_generated: 0 }) as GenerateResult;
  },
};

export default AdminAcollidaInscriptionsService;
