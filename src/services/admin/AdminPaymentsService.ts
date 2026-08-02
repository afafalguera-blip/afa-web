import { supabase } from '../../lib/supabase';
import type { InscriptionStudent } from '../../types/inscription';
import type { Payment, PaymentConcept } from '../../types/payment';

// Shape returned by every generator RPC (success, message, payments_generated).
export interface GenerateResult {
  success: boolean;
  message: string;
  payments_generated: number;
}

export type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'overdue';

/** Server-side filters shared by the list, the summary and the export. */
export interface PaymentsFilters {
  academicYear?: string;
  concept?: PaymentConcept | 'all';
  status?: PaymentStatusFilter;
  /** 1-12, or undefined for every month. */
  month?: number;
  search?: string;
}

export interface PaymentsQuery extends PaymentsFilters {
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface PaginatedPayments {
  rows: Payment[];
  total: number;
}

/** Amounts over the whole filtered set, not just the visible page. */
export interface PaymentsSummary {
  total: number;
  paid: number;
  pending: number;
}

/** Hard cap for the CSV export so a runaway cohort can't blow up the browser. */
const EXPORT_LIMIT = 5000;

// The generator RPCs return a single-row TABLE; normalise it to one object.
function firstRow(data: unknown): GenerateResult {
  const row = Array.isArray(data) ? data[0] : data;
  return (row as GenerateResult) ?? { success: false, message: 'Sense resposta', payments_generated: 0 };
}

/** PostgREST reserves , . : ( ) in filter values; strip them from user input. */
function sanitizeSearch(term: string): string {
  return term.replace(/[,.():*%\\]/g, ' ').trim();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * PostgREST accepts a single top-level `or=`. When several OR groups must be
 * ANDed we nest them as `or=(and(or(a),or(b)))` instead of emitting two `or`
 * params, whose combination is not guaranteed.
 */
function combineOrGroups(groups: string[]): string | null {
  if (groups.length === 0) return null;
  if (groups.length === 1) return groups[0];
  return `and(${groups.map((g) => `or(${g})`).join(',')})`;
}

/** Structural subset of PostgrestFilterBuilder used by the filter helper. */
// Non-recursive shape on purpose: constraining the generic to `T extends
// FilterableQuery<T>` makes TS instantiate PostgREST's builder type against
// itself and blow the depth limit (TS2589).
interface FilterableQuery {
  eq(column: string, value: unknown): FilterableQuery;
  neq(column: string, value: unknown): FilterableQuery;
  lt(column: string, value: unknown): FilterableQuery;
  or(filters: string): FilterableQuery;
}

/** Applies every filter that can be pushed to the server. */
function applyFilters<T>(query: T, filters: PaymentsFilters): T {
  let q = query as FilterableQuery;
  const orGroups: string[] = [];

  if (filters.academicYear) q = q.eq('academic_year', filters.academicYear);
  // `concept` is NOT NULL DEFAULT 'extraescolar', so a plain eq is enough.
  if (filters.concept && filters.concept !== 'all') q = q.eq('concept', filters.concept);
  if (filters.month) q = q.eq('payment_month', filters.month);

  // The UI's "overdue" is derived (unpaid + past due date), not the raw column.
  if (filters.status === 'paid') {
    q = q.eq('status', 'paid');
  } else if (filters.status === 'overdue') {
    q = q.neq('status', 'paid').lt('due_date', todayIso());
  } else if (filters.status === 'pending') {
    q = q.neq('status', 'paid');
    orGroups.push(`due_date.gte.${todayIso()},due_date.is.null`);
  }

  const search = sanitizeSearch(filters.search ?? '');
  if (search) {
    orGroups.push(`student_name.ilike.%${search}%,student_surname.ilike.%${search}%`);
  }

  const combined = combineOrGroups(orGroups);
  if (combined) q = q.or(combined);

  return q as T;
}

export const AdminPaymentsService = {
  // --- Listing ---------------------------------------------------------------

  /** One page of receipts plus the exact total for the same filters. */
  async listPayments({ page, pageSize, ...filters }: PaymentsQuery): Promise<PaginatedPayments> {
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    const query = applyFilters(
      supabase.from('payments').select('*', { count: 'exact' }),
      filters,
    )
      .order('due_date', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: (data || []) as unknown as Payment[], total: count ?? 0 };
  },

  /**
   * Totals for the filtered set. PostgREST cannot SUM without an RPC, so this
   * reads only `amount,status` (two numeric-ish columns) instead of full rows.
   */
  async getPaymentsSummary(filters: PaymentsFilters): Promise<PaymentsSummary> {
    const { data, error } = await applyFilters(
      supabase.from('payments').select('amount, status'),
      filters,
    );
    if (error) throw error;

    const rows = (data || []) as unknown as { amount: number | string; status: string }[];
    let total = 0;
    let paid = 0;
    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      total += amount;
      if (row.status === 'paid') paid += amount;
    }
    return { total, paid, pending: total - paid };
  },

  /** Per-concept counts for the tabs (scoped to the cohort only, like the tabs). */
  async countByConcept(academicYear?: string): Promise<Record<PaymentConcept, number>> {
    const concepts: PaymentConcept[] = ['extraescolar', 'acollida', 'soci', 'llibres'];
    const results = await Promise.all(
      concepts.map(async (concept) => {
        let query = supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('concept', concept);
        if (academicYear) query = query.eq('academic_year', academicYear);
        const { count, error } = await query;
        if (error) throw error;
        return [concept, count ?? 0] as const;
      }),
    );
    return Object.fromEntries(results) as Record<PaymentConcept, number>;
  },

  /** Every row matching the filters, for the CSV export (capped). */
  async listPaymentsForExport(filters: PaymentsFilters): Promise<Payment[]> {
    const { data, error } = await applyFilters(
      supabase.from('payments').select('*'),
      filters,
    )
      .order('due_date', { ascending: false })
      .range(0, EXPORT_LIMIT - 1);
    if (error) throw error;
    return (data || []) as unknown as Payment[];
  },

  /** Distinct cohorts present in payments, newest first. */
  async listAcademicYears(): Promise<string[]> {
    const { data, error } = await supabase.from('payments').select('academic_year');
    if (error) throw error;
    const years = new Set<string>();
    for (const row of data || []) {
      const year = (row as { academic_year: string | null }).academic_year;
      if (year) years.add(year);
    }
    return Array.from(years).sort().reverse();
  },

  // --- Mutations -------------------------------------------------------------

  async createPayment(payment: Partial<Payment>): Promise<void> {
    const dueDate = payment.due_date ? new Date(payment.due_date) : new Date();
    const { error } = await supabase.from('payments').insert([
      {
        ...payment,
        payment_month: dueDate.getMonth() + 1,
        payment_year: dueDate.getFullYear(),
      },
    ]);
    if (error) throw error;
  },

  async updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
    const { error } = await supabase.from('payments').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
  },

  /** Flips paid/pending and keeps `payment_date` consistent. */
  async setPaymentStatus(id: string, status: 'paid' | 'pending'): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ status, payment_date: status === 'paid' ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) throw error;
  },

  /** Flattened pupils of active inscriptions, for the payment autocomplete. */
  async listActiveStudents(): Promise<InscriptionStudent[]> {
    const { data, error } = await supabase
      .from('inscripcions')
      .select('students')
      .eq('status', 'alta');
    if (error) throw error;

    return ((data || []) as { students: InscriptionStudent[] | null }[]).flatMap((inscription) =>
      (inscription.students || []).map((student) => ({
        name: student.name,
        surname: student.surname,
        course: student.course,
        activities: student.activities || [],
      })),
    );
  },

  // --- Generators ------------------------------------------------------------

  // --- Extraescolares: monthly fees from active inscriptions + fee_rules ---
  async generateExtraescolar(month: number, year: number): Promise<GenerateResult> {
    // 1. Generate payments via RPC (only 'alta' inscriptions).
    const { data, error } = await supabase.rpc('generate_monthly_payments_only_active', {
      p_month: month,
      p_year: year
    });
    if (error) throw error;

    // 2. Remove payments for students in 'baja' status.
    const { error: cleanupError } = await supabase.rpc('remove_baja_payments_for_month', {
      p_month: month,
      p_year: year
    });
    if (cleanupError) throw cleanupError;

    return firstRow(data);
  },

  // --- Cuota socio AFA: one receipt per member family for the course ---
  async generateSoci(year: number): Promise<GenerateResult> {
    const { data, error } = await supabase.rpc('generate_soci_payments', { p_year: year });
    if (error) throw error;
    return firstRow(data);
  },

  // --- Libros socialización: one receipt per pupil, priced by course ---
  async generateBooks(year: number): Promise<GenerateResult> {
    const { data, error } = await supabase.rpc('generate_book_payments', { p_year: year });
    if (error) throw error;
    return firstRow(data);
  },

  // --- Acollida: duplicate one month's receipts into the next ---
  async rolloverAcollida(
    fromMonth: number,
    fromYear: number,
    toMonth: number,
    toYear: number
  ): Promise<GenerateResult> {
    const { data, error } = await supabase.rpc('rollover_acollida_payments', {
      p_from_month: fromMonth,
      p_from_year: fromYear,
      p_to_month: toMonth,
      p_to_year: toYear
    });
    if (error) throw error;
    return firstRow(data);
  },

  async deleteMonthlyPayments(month: number, year: number) {
    // Get IDs first to clean history
    const { data: payments, error: fetchError } = await supabase
      .from('payments')
      .select('id')
      .eq('payment_year', year)
      .eq('payment_month', month);

    if (fetchError) throw fetchError;
    const paymentIds = (payments || []).map(p => p.id);

    if (paymentIds.length > 0) {
      const { error: historyError } = await supabase
        .from('payment_history')
        .delete()
        .in('payment_id', paymentIds);
      if (historyError) throw historyError;
    }

    // Delete payments
    const { error: payError } = await supabase
      .from('payments')
      .delete()
      .eq('payment_year', year)
      .eq('payment_month', month);
    if (payError) throw payError;

    // Delete generation record
    const { error: genError } = await supabase
      .from('monthly_payment_generation')
      .delete()
      .eq('year', year)
      .eq('month', month);
    if (genError) throw genError;

    return true;
  }
};
