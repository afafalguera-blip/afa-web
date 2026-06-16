import { supabase } from '../lib/supabase';

export interface FinanceTransaction {
    id?: string;
    created_at?: string;
    date: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    description: string;
    payment_method: string;
    status: 'paid' | 'pending';
    attachment_url?: string;
    reference_id?: string;
    reference_type?: string;
    academic_year?: string;
}

export const FinanceService = {
    async getTransactions(academicYear?: string) {
        let query = supabase
            .from('finance_transactions')
            .select('*')
            .order('date', { ascending: false });
        if (academicYear) query = query.eq('academic_year', academicYear);
        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    },

    async addTransaction(transaction: FinanceTransaction) {
        const { data, error } = await supabase
            .from('finance_transactions')
            .insert([transaction])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTransaction(id: string, updates: Partial<FinanceTransaction>) {
        const { data, error } = await supabase
            .from('finance_transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTransaction(id: string) {
        const { error } = await supabase
            .from('finance_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async uploadInvoice(file: File) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
            .from('invoices')
            .upload(fileName, file);

        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
            .from('invoices')
            .getPublicUrl(fileName);
            
        return publicUrl;
    },

    // List the academic years present across finance data (newest first).
    async getAcademicYears(): Promise<string[]> {
        const [tx, pay] = await Promise.all([
            supabase.from('finance_transactions').select('academic_year'),
            supabase.from('payments').select('academic_year'),
        ]);
        const years = new Set<string>();
        for (const r of tx.data || []) if (r.academic_year) years.add(r.academic_year as string);
        for (const r of pay.data || []) if (r.academic_year) years.add(r.academic_year as string);
        return Array.from(years).sort().reverse();
    },

    // Stats for a single academic year, or all-time when academicYear is omitted.
    async getStats(academicYear?: string) {
        let txQuery = supabase
            .from('finance_transactions')
            .select('amount, type, date');
        if (academicYear) txQuery = txQuery.eq('academic_year', academicYear);
        const { data: transactions, error: transError } = await txQuery;

        if (transError) throw transError;

        let payQuery = supabase
            .from('payments')
            .select('amount, status')
            .eq('status', 'paid');
        if (academicYear) payQuery = payQuery.eq('academic_year', academicYear);
        const { data: payments, error: payError } = await payQuery;

        if (payError) throw payError;

        const transactionIncome = transactions
            ?.filter(t => t.type === 'income')
            .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

        const transactionExpenses = transactions
            ?.filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + Number(t.amount), 0) || 0;

        const paymentIncome = payments
            ?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

        const totalIncome = transactionIncome + paymentIncome;

        return {
            balance: totalIncome - transactionExpenses,
            income: totalIncome,
            expenses: transactionExpenses
        };
    }
};
