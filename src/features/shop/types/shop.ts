export interface ShopProduct {
  id: string;
  name: string;
  name_es?: string;
  name_ca?: string;
  name_en?: string;
  description?: string;
  description_es?: string;
  description_ca?: string;
  description_en?: string;
  category: 'uniforme' | 'accessoris';
  image_url?: string;
  variants?: ShopVariant[];
  isCalculated?: boolean;
}

export interface ShopVariant {
  id: string;
  product_id: string;
  size: string;
  price_member: number;
  price_non_member: number;
  stock: number;
}

export interface CartItem {
  id: string; // Internal cart ID
  variant: ShopVariant;
  product: ShopProduct;
  quantity: number;
}

export type OrderPaymentStatus = 'paid' | 'pending' | 'cancelled' | 'refunded';
export type OrderDeliveryStatus = 'pending' | 'delivered' | 'not_picked_up' | 'shipped';

export interface ShopOrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  price_at_time: number;
  variant?: {
    size: string;
    stock: number;
    price_member: number;
    price_non_member: number;
    product: {
      name: string;
    };
  };
}

export interface ShopOrder {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total_amount: number;
  payment_status: OrderPaymentStatus;
  delivery_status: OrderDeliveryStatus;
  user_id?: string | null;
  is_member: boolean;
  items?: ShopOrderItem[];
}

export interface InscriptionFilters {
  course: string;
  activity: string;
  status: string;
  search: string;
}
