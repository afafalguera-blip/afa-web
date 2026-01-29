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

export const StatsService = {
  async getFinancialStats(): Promise<FinancialStats> {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, status');

    if (error) throw error;

    const totalAmount = payments?.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0;
    const paidAmount = payments?.filter((p: any) => p.status === 'paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0;
    
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

    const totalOrders = orders?.length || 0;
    const pendingOrders = orders?.filter((o: any) => o.status === 'pending').length || 0;
    const revenue = orders?.filter((o: any) => o.status !== 'cancelled').reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0) || 0;

    return {
      totalOrders,
      pendingOrders,
      revenue
    };
  }
};
