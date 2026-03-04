import { supabase } from '../lib/supabase';

export interface FinancialStats {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface ShopStats {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
}

interface RawPayment {
  amount: number | string;
  status: string;
}

interface RawOrder {
  total_amount: number | string;
  status: string;
}

export const StatsService = {
  async getFinancialStats(): Promise<FinancialStats> {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, status');

    if (error) throw error;
    
    const rawPayments = (payments || []) as RawPayment[];
    const totalAmount = rawPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0;
    const paidAmount = rawPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0;
    
    return {
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount
    };
  },

  async getShopStats(): Promise<ShopStats> {
    const { data: orders, error } = await supabase
      .from('shop_orders')
      .select('total_amount, status');
      
    if (error) throw error;

    const rawOrders = (orders || []) as RawOrder[];
    const totalOrders = rawOrders.length || 0;
    const pendingOrders = rawOrders.filter(o => o.status === 'pending').length || 0;
    const revenue = rawOrders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0) || 0;

    return {
      totalOrders,
      pendingOrders,
      revenue
    };
  }
};
