import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ShopProduct, ShopVariant } from '../types/shop';

export interface CartItem {
  id: string; // Internal cart ID
  variant: ShopVariant;
  product: ShopProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: ShopProduct, variant: ShopVariant, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from session storage if available
  useEffect(() => {
    const savedCart = sessionStorage.getItem('afa_shop_cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  // Save cart to session storage
  useEffect(() => {
    sessionStorage.setItem('afa_shop_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: ShopProduct, variant: ShopVariant, quantity: number) => {
    setItems(prev => {
      // Check if item already exists
      const existingItemIndex = prev.findIndex(i => i.variant.id === variant.id);
      if (existingItemIndex > -1) {
        const newItems = [...prev];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      }
      return [...prev, { id: crypto.randomUUID(), product, variant, quantity }];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => prev.filter(i => i.id !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((acc, item) => acc + (Number(item.variant.price_member) * item.quantity), 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
