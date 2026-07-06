import { supabase } from '../../lib/supabase';

// Shape returned by every generator RPC (success, message, payments_generated).
export interface GenerateResult {
  success: boolean;
  message: string;
  payments_generated: number;
}

// The generator RPCs return a single-row TABLE; normalise it to one object.
function firstRow(data: unknown): GenerateResult {
  const row = Array.isArray(data) ? data[0] : data;
  return (row as GenerateResult) ?? { success: false, message: 'Sense resposta', payments_generated: 0 };
}

export const AdminPaymentsService = {
  // --- Extraescolares: monthly fees from active inscriptions + fee_rules ---
  async generateExtraescolar(month: number, year: number): Promise<GenerateResult> {
    // 1. Generate payments via RPC (only 'alta' inscriptions).
    const { data, error } = await supabase.rpc('generate_monthly_payments_only_active', {
      p_month: month,
      p_year: year
    });
    if (error) throw error;

    // 2. Remove payments for students in 'baja' status.
    await supabase.rpc('remove_baja_payments_for_month', {
      p_month: month,
      p_year: year
    });

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
       // Delete history
       await supabase
         .from('payment_history')
         .delete()
         .in('payment_id', paymentIds);
    }

    // Delete payments
    const { error: payError } = await supabase
      .from('payments')
      .delete()
      .eq('payment_year', year)
      .eq('payment_month', month);
    if (payError) throw payError;

    // Delete generation record
    await supabase
      .from('monthly_payment_generation')
      .delete()
      .eq('year', year)
      .eq('month', month);

    return true;
  }
};
