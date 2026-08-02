import { supabase } from '../../../lib/supabase';
import type { ShopProduct } from '../types/shop';

/**
 * Admin-side inventory reads/writes. Kept apart from `ShopService` (the public
 * storefront service) so the CMS never talks to supabase from a component.
 *
 * The catalogue is deliberately NOT paginated: it is bounded (a couple dozen
 * uniform/accessory products) and the "xandall complet" stock is derived across
 * products, so a partial page would show wrong stock figures.
 */
export const AdminInventoryService = {
  async listProducts(): Promise<ShopProduct[]> {
    const { data, error } = await supabase
      .from('shop_products')
      .select('*, variants:shop_variants(*)')
      .order('name');

    if (error) throw error;
    return (data || []) as unknown as ShopProduct[];
  },

  async updateVariantStock(variantId: string, stock: number): Promise<void> {
    const { error } = await supabase
      .from('shop_variants')
      .update({ stock })
      .eq('id', variantId);

    if (error) throw error;
  },
};
