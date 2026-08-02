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
        academic_year: o.academic_year as string | undefined,
        items: o.items as ShopOrderItem[]
    };
}

/** Delivery statuses that move an order into the "Arxiu" tab. */
const ARCHIVED_DELIVERY_STATUSES: OrderDeliveryStatus[] = ['delivered', 'not_picked_up'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORDER_SELECT = `
        *,
        items:shop_order_items(
           *,
           variant:shop_variants(
              size,
              stock,
              price_member,
              price_non_member,
              product:shop_products(name)
           )
        )
      `;

export type OrdersView = 'active' | 'archived';

export interface OrdersFilters {
    academicYear?: string;
    view?: OrdersView;
    search?: string;
}

export interface OrdersQuery extends OrdersFilters {
    /** 1-based. */
    page: number;
    pageSize: number;
}

export interface PaginatedOrders {
    rows: ShopOrder[];
    total: number;
}

export interface OrdersSummary {
    pendingCount: number;
    archivedCount: number;
    totalRevenue: number;
}

/** PostgREST reserves , . : ( ) in filter values; strip them from user input. */
function sanitizeSearch(term: string): string {
    return term.replace(/[,.():*%\\]/g, ' ').trim();
}

// Non-recursive shape on purpose: constraining the generic to `T extends
// FilterableQuery<T>` makes TS instantiate PostgREST's builder type against
// itself and blow the depth limit (TS2589).
interface FilterableQuery {
    eq(column: string, value: unknown): FilterableQuery;
    or(filters: string): FilterableQuery;
}

/**
 * Pushes the cohort, the active/archived tab and the search box to the server.
 * Legacy rows may have a NULL delivery_status (the UI reads them as "pending"),
 * hence the explicit null branch instead of a plain `not.in`.
 */
function applyOrderFilters<T>(query: T, filters: OrdersFilters): T {
    let q = query as FilterableQuery;
    const orGroups: string[] = [];

    if (filters.academicYear) q = q.eq('academic_year', filters.academicYear);

    const archived = `"${ARCHIVED_DELIVERY_STATUSES.join('","')}"`;
    if (filters.view === 'archived') {
        orGroups.push(`delivery_status.in.(${archived})`);
    } else if (filters.view === 'active') {
        orGroups.push(`delivery_status.is.null,delivery_status.not.in.(${archived})`);
    }

    const search = sanitizeSearch(filters.search ?? '');
    if (search) {
        // uuid columns have no ilike operator: only an exact id match is possible.
        if (UUID_RE.test(search)) {
            q = q.eq('id', search);
        } else {
            orGroups.push(
                `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%`,
            );
        }
    }

    if (orGroups.length === 1) q = q.or(orGroups[0]);
    // PostgREST guarantees a single top-level `or`; nest the groups to AND them.
    else if (orGroups.length > 1) q = q.or(`and(${orGroups.map((g) => `or(${g})`).join(',')})`);

    return q as T;
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

  /** One page of orders plus the exact total for the same filters. */
  async listOrders({ page, pageSize, ...filters }: OrdersQuery): Promise<PaginatedOrders> {
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    const { data, error, count } = await applyOrderFilters(
      supabase.from('shop_orders').select(ORDER_SELECT, { count: 'exact' }),
      filters,
    )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: (data || []).map(transformOrder), total: count ?? 0 };
  },

  /** Single order with its items, used to refresh the editor in place. */
  async getOrder(orderId: string): Promise<ShopOrder> {
    const { data, error } = await supabase
      .from('shop_orders')
      .select(ORDER_SELECT)
      .eq('id', orderId)
      .single();
    if (error) throw error;
    return transformOrder(data);
  },

  /**
   * Tab counters and revenue for the whole cohort. Revenue needs a SUM that
   * PostgREST cannot do without an RPC, so it reads only `total_amount`.
   */
  async getOrdersSummary(academicYear?: string): Promise<OrdersSummary> {
    const countQuery = (view: OrdersView) =>
      applyOrderFilters(
        supabase.from('shop_orders').select('id', { count: 'exact', head: true }),
        { academicYear, view },
      );

    let revenueQuery = supabase
      .from('shop_orders')
      .select('total_amount')
      .eq('payment_status', 'paid');
    if (academicYear) revenueQuery = revenueQuery.eq('academic_year', academicYear);

    const [active, archivedRes, revenue] = await Promise.all([
      countQuery('active'),
      countQuery('archived'),
      revenueQuery,
    ]);

    if (active.error) throw active.error;
    if (archivedRes.error) throw archivedRes.error;
    if (revenue.error) throw revenue.error;

    const totalRevenue = ((revenue.data || []) as { total_amount: number | string }[])
      .reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);

    return {
      pendingCount: active.count ?? 0,
      archivedCount: archivedRes.count ?? 0,
      totalRevenue,
    };
  },

  async updateOrderCustomerName(orderId: string, customerName: string) {
    const { error } = await supabase
      .from('shop_orders')
      .update({ customer_name: customerName })
      .eq('id', orderId);
    if (error) throw error;
  },

  /** Flips the member flag and re-prices every line accordingly. */
  async setOrderMember(order: ShopOrder, isMember: boolean) {
    const items = order.items ?? [];
    let newTotal = 0;

    for (const item of items) {
      if (!item.variant) continue;
      const newPrice = isMember ? item.variant.price_member : item.variant.price_non_member;
      const { error } = await supabase
        .from('shop_order_items')
        .update({ price_at_time: newPrice })
        .eq('id', item.id);
      if (error) throw error;
      newTotal += newPrice * item.quantity;
    }

    const { error } = await supabase
      .from('shop_orders')
      .update({ is_member: isMember, ...(items.length > 0 ? { total_amount: newTotal } : {}) })
      .eq('id', order.id);
    if (error) throw error;
  },

  async getOrderAcademicYears(): Promise<string[]> {
    const { data, error } = await supabase.from('shop_orders').select('academic_year');
    if (error) throw error;
    const years = new Set<string>();
    for (const r of data || []) if (r.academic_year) years.add(r.academic_year as string);
    return Array.from(years).sort().reverse();
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

  async getProductsWithVariants(): Promise<ShopProduct[]> {
    const { data, error } = await supabase
      .from('shop_products')
      .select('*, variants:shop_variants(*)')
      .order('name');
    if (error) throw error;
    return (data || []) as unknown as ShopProduct[];
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
