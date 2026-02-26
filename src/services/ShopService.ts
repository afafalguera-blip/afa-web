import type { ShopProduct, ShopVariant } from '../types/shop';
import { supabase } from '../lib/supabase';
import { FinanceService } from './FinanceService';

function transformOrder(order: any) {
    // Map new columns or legacy status to new fields if missing
    return {
        ...order,
        customer_name: order.customer_name || 'Usuari Registrat',
        payment_status: order.payment_status || (order.status === 'completed' ? 'paid' : 'pending'),
        delivery_status: order.delivery_status || (order.status === 'completed' ? 'delivered' : 'pending')
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

    const cleanUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if (allowedColumns.includes(key)) {
        cleanUpdates[key] = (updates as any)[key];
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

  async getOrders() {
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

  async updatePaymentStatus(orderId: string, status: 'paid' | 'pending') {
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

  async updateDeliveryStatus(orderId: string, status: 'delivered' | 'pending' | 'not_picked_up') {
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
  }
};
