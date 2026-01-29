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
}

export const FinanceService = {
    async getTransactions() {
        const { data, error } = await supabase
            .from('finance_transactions')
            .select('*')
            .order('date', { ascending: false });
        
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

    async getStats() {
        const { data: transactions, error: transError } = await supabase
            .from('finance_transactions')
            .select('amount, type, date');

        if (transError) throw transError;

        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('amount, status')
            .eq('status', 'paid');
            
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
