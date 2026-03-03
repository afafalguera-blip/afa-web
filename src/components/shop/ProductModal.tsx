import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, ShoppingCart } from 'lucide-react';
import type { ShopProduct } from '../../types/shop';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

interface ProductModalProps {
  product: ShopProduct;
  onClose: () => void;
  onGoToCart?: () => void;
}

export function ProductModal({ product, onClose, onGoToCart }: ProductModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [success, setSuccess] = useState(false);

  const selectedVariant = product.variants?.find(v => v.size === selectedSize);
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : true;

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem(product, selectedVariant, quantity);
    setSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-card-dark w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 rounded-full transition-all z-10 shadow-sm"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="flex flex-col">
          {/* Image */}
          <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-icons-round text-7xl text-slate-200">checkroom</span>
            )}
          </div>

          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">{product.name}</h2>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-black text-primary">
                  {selectedVariant ? (user ? selectedVariant.price_member : selectedVariant.price_non_member) : (user ? product.variants?.[0]?.price_member : product.variants?.[0]?.price_non_member)}€
                </p>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                  {user ? t('shop_page.member_price') : t('shop_page.non_member_price')}
                </span>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                Selecciona la talla
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants?.map(v => (
                  <button
                    key={v.id}
                    disabled={v.stock <= 0}
                    onClick={() => setSelectedSize(v.size)}
                    className={`min-w-[56px] px-4 py-3 rounded-xl font-bold text-sm transition-all border-2 ${selectedSize === v.size
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-none'
                      : v.stock <= 0
                        ? 'opacity-30 cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                        : 'bg-white dark:bg-card-dark border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-primary'
                      }`}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
              {selectedVariant && (
                <p className={`text-xs mt-3 font-medium ${selectedVariant.stock < 5 ? 'text-orange-500' : 'text-slate-400'}`}>
                  {selectedVariant.stock <= 0 ? (
                    <span className="text-red-500 font-bold">Sense estoc disponible</span>
                  ) : (
                    `En estoc: ${selectedVariant.stock} unitats`
                  )}
                </p>
              )}
            </div>

            {/* Quantity Selector */}
            {selectedSize && !isOutOfStock && (
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quantitat</label>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:bg-white dark:hover:bg-card-dark rounded-lg transition-colors"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(selectedVariant?.stock || 99, q + 1))}
                    className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:bg-white dark:hover:bg-card-dark rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {success ? (
              <div className="flex flex-col gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 p-4 rounded-xl flex items-center justify-center gap-2 font-bold mb-2">
                  <Check className="w-5 h-5" />
                  {t('shop_page.added_success', 'S\'ha afegit a la cistella')}
                </div>
                {onGoToCart && (
                  <button
                    onClick={onGoToCart}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <ShoppingCart className="w-5 h-5" /> {t('shop_page.go_to_cart', 'Anar a la cistella')}
                  </button>
                )}
                <button
                  onClick={() => { setSuccess(false); onClose(); }}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {t('shop_page.continue_shopping', 'Seguir comprant')}
                </button>
              </div>
            ) : (
              <button
                disabled={!selectedSize || isOutOfStock || success}
                onClick={handleAddToCart}
                className="w-full py-5 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 bg-slate-900 dark:bg-white dark:text-slate-900 shadow-slate-200 dark:shadow-none active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                <ShoppingCart className="w-5 h-5" />
                {t('shop_page.add_to_cart')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
