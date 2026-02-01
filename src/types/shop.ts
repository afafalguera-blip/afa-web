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
  variantId: string;
  productName: string;
  size: string;
  price: number;
  quantity: number;
}
