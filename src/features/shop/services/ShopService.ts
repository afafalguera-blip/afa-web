import type { ShopProduct, ShopVariant, ShopOrder, ShopOrderItem, OrderPaymentStatus, OrderDeliveryStatus } from '../types/shop';
import { supabase } from '../../../lib/supabase';
import { FinanceService } from '../../../services/FinanceService';

function transformOrder(order: unknown): ShopOrder {
    const o = order as Record<string, unknown>;
    return {
        id: o.id as string,
        created_at: o.created_at as string,
        customer_name: (o.customer_name as string) || 'Usuari Registrat',
        customer_email: (o.customer_email as string) || '',
        customer_phone: (o.customer_phone as string) || '',
        total_amount: o.total_amount as number,
        payment_status: (o.payment_status as OrderPaymentStatus) || (o.status === 'completed' ? 'paid' : 'pending'),
        delivery_status: (o.delivery_status as OrderDeliveryStatus) || (o.status === 'completed' ? 'delivered' : 'pending'),
        user_id: o.user_id as string | undefined,
        is_member: (o.is_member as boolean) ?? false,
        items: o.items as ShopOrderItem[]
    };
}

export const ShopService = {
  async createProduct(product: Partial<ShopProduct>) {
    const { data, error } = await supabase
      .from('shop_products')
      .insert({
        name: product.name,
        name_es: product.name_es || product.name,
        name_ca: product.name_ca,
        name_en: product.name_en,
        description: product.description,
        description_es: product.description_es || product.description,
        description_ca: product.description_ca,
        description_en: product.description_en,
        category: product.category || 'uniforme',
        image_url: product.image_url
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: Partial<ShopProduct>) {
    const allowedColumns = [
      'name', 'name_es', 'name_ca', 'name_en',
      'description', 'description_es', 'description_ca', 'description_en',
      'category', 'image_url'
    ];

    const cleanUpdates: Record<string, unknown> = {};
    Object.keys(updates).forEach(key => {
      if (allowedColumns.includes(key)) {
        cleanUpdates[key] = (updates as Record<string, unknown>)[key];
      }
    });

    const { data, error } = await supabase
      .from('shop_products')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProduct(id: string) {
    // Delete variants first (though DB should handle cascade if configured)
    await supabase.from('shop_variants').delete().eq('product_id', id);
    
    const { error } = await supabase
      .from('shop_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async createVariant(variant: Partial<ShopVariant>) {
    const { data, error } = await supabase
      .from('shop_variants')
      .insert(variant)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateVariant(id: string, updates: Partial<ShopVariant>) {
    const { data, error } = await supabase
      .from('shop_variants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteVariant(id: string) {
    const { error } = await supabase
      .from('shop_variants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getOrders(): Promise<ShopOrder[]> {
    const { data, error } = await supabase
      .from('shop_orders')
      .select(`
        *,
        items:shop_order_items(
           *,
           variant:shop_variants(
              size,
              product:shop_products(name)
           )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformOrder);
  },

  async createComplexOrder(payload: {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    totalAmount: number;
    items: Array<{ variant_id: string; quantity: number; price_at_time: number }>;
    userId?: string | null;
    language: 'ca' | 'es' | 'en';
    isMember?: boolean;
  }): Promise<void> {
    const { error } = await supabase.rpc('create_shop_complex_order_v1', {
        p_customer_name: payload.customerName,
        p_customer_email: payload.customerEmail,
        p_customer_phone: payload.customerPhone || null,
        p_total_amount: payload.totalAmount,
        p_items: payload.items,
        p_user_id: payload.userId || null,
        p_language: payload.language,
        p_is_member: payload.isMember ?? false
    });

    if (error) throw error;
  },

  async updatePaymentStatus(orderId: string, status: OrderPaymentStatus) {
    const { data, error } = await supabase
      .from('shop_orders')
      .update({ payment_status: status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    
    // If marked as paid, create a transaction record automatically
    if (status === 'paid' && data) {
         await FinanceService.addTransaction({
             date: new Date().toISOString().split('T')[0],
             amount: data.total_amount,
             type: 'income',
             category: 'shop',
             description: `Venda Botiga #${data.id.slice(0,8)}`,
             payment_method: 'unknown', // Could be added to UI later
             status: 'paid',
             reference_id: data.id,
             reference_type: 'shop_order'
         });
    }

    return data;
  },

  async updateDeliveryStatus(orderId: string, status: OrderDeliveryStatus) {
      const { data, error } = await supabase
        .from('shop_orders')
        .update({ delivery_status: status })
        .eq('id', orderId)
        .select()
        .single();
  
      if (error) throw error;
      return data;
  },

  async getProductsWithVariants() {
    const { data, error } = await supabase
      .from('shop_products')
      .select('*, variants:shop_variants(*)')
      .order('name');
    if (error) throw error;
    return data;
  },

  async addOrderItem(orderId: string, variantId: string, quantity: number, price: number) {
    const { data, error } = await supabase
      .from('shop_order_items')
      .insert({
        order_id: orderId,
        variant_id: variantId,
        quantity,
        price_at_time: price
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateOrderItem(itemId: string, variantId: string, quantity: number, price: number) {
    const { data, error } = await supabase
      .from('shop_order_items')
      .update({
        variant_id: variantId,
        quantity,
        price_at_time: price
      })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteOrderItem(itemId: string) {
    const { error } = await supabase
      .from('shop_order_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
  },

  async deleteOrder(orderId: string) {
    const { error } = await supabase
      .from('shop_orders')
      .delete()
      .eq('id', orderId);
    if (error) throw error;
  },

  async createEmptyOrder(customerName: string) {
    const { data, error } = await supabase
      .from('shop_orders')
      .insert({
        customer_name: customerName,
        total_amount: 0,
        payment_status: 'pending',
        delivery_status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
