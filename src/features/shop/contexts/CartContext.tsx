/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ShopProduct, ShopVariant, CartItem } from '../types/shop';
import { useAuth } from '../../../hooks/useAuth';

interface CartContextType {
    items: CartItem[];
    addItem: (product: ShopProduct, variant: ShopVariant, quantity: number) => void;
    removeItem: (cartItemId: string) => void;
    clearCart: () => void;
    total: number;
    itemCount: number;
    isMember: boolean;
    setIsMember: (isMember: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [items, setItems] = useState<CartItem[]>(() => {
        const savedCart = sessionStorage.getItem('afa_shop_cart');
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed)) {
                    return parsed.filter(item => item.id && item.variant && item.product);
                }
            } catch (e) {
                console.error('Error loading cart:', e);
            }
        }
        return [];
    });

    const [isMember, setIsMember] = useState<boolean>(() => {
        const saved = sessionStorage.getItem('afa_shop_is_member');
        if (saved !== null) return saved === 'true';
        return user !== null; // Default to true if logged in
    });

    // Save cart to session storage
    useEffect(() => {
        sessionStorage.setItem('afa_shop_cart', JSON.stringify(items));
    }, [items]);

    // Save member status
    useEffect(() => {
        sessionStorage.setItem('afa_shop_is_member', String(isMember));
    }, [isMember]);

    // Adjust state during render when user changes (Syncing isMember with Auth)
    const [prevUserId, setPrevUserId] = useState(user?.id);
    if (user?.id !== prevUserId) {
        setPrevUserId(user?.id);
        if (user) setIsMember(true);
    }

    const addItem = React.useCallback((product: ShopProduct, variant: ShopVariant, quantity: number) => {
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
    }, []);

    const removeItem = React.useCallback((cartItemId: string) => {
        setItems(prev => prev.filter(i => i.id !== cartItemId));
    }, []);

    const clearCart = React.useCallback(() => {
        setItems([]);
    }, []);

    // Dynamic price calculation based on user membership
    const total = React.useMemo(() => items.reduce((acc, item) => {
        const price = isMember ? Number(item.variant.price_member) : Number(item.variant.price_non_member);
        return acc + (price * item.quantity);
    }, 0), [items, isMember]);

    const itemCount = React.useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

    const contextValue = React.useMemo(() => ({
        items,
        addItem,
        removeItem,
        clearCart,
        total,
        itemCount,
        isMember,
        setIsMember
    }), [items, addItem, removeItem, clearCart, total, itemCount, isMember]);

    return (
        <CartContext.Provider value={contextValue}>
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
