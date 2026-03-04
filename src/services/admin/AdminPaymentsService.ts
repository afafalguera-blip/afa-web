import { supabase } from '../../lib/supabase';

export const AdminPaymentsService = {
  async generateMonthlyPayments(month: number, year: number) {
    // 1. Generate payments via RPC
    const { data, error } = await supabase.rpc('generate_monthly_payments_only_active', {
      p_month: month,
      p_year: year
    });
    if (error) throw error;

    // 2. Remove payments for students in 'baja' status
    await supabase.rpc('remove_baja_payments_for_month', {
      p_month: month,
      p_year: year
    });
    
    return data;
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
