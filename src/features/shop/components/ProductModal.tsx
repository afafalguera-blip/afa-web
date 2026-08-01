import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ShoppingCart } from 'lucide-react';
import type { ShopProduct } from '../types/shop';
import { useCart } from '../contexts/CartContext';
import { proxyStorageUrl } from '../../../utils/storageUrl';
import { Modal } from '../../../components/common/Modal';

interface ProductModalProps {
  product: ShopProduct;
  onClose: () => void;
  onGoToCart?: () => void;
}

export function ProductModal({ product, onClose, onGoToCart }: ProductModalProps) {
  const { t } = useTranslation();
  const { addItem, isMember, setIsMember } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [success, setSuccess] = useState(false);

  const selectedVariant = product.variants?.find(v => v.size === selectedSize);

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem(product, selectedVariant, quantity);
    setSuccess(true);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      size="md"
      footer={
        success ? (
          <div className="flex flex-1 flex-col sm:flex-row gap-2">
            {onGoToCart && (
              <button
                type="button"
                onClick={onGoToCart}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" /> {t('shop_page.go_to_cart', 'Anar a la cistella')}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setSuccess(false); onClose(); }}
              className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              {t('shop_page.continue_shopping', 'Seguir comprant')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!selectedSize}
            onClick={handleAddToCart}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ShoppingCart className="w-5 h-5" />
            {t('shop_page.add_to_cart')}
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* Image */}
        <div className="aspect-[4/3] -mx-5 -mt-4 bg-slate-50 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img
              src={proxyStorageUrl(product.image_url)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-icons-round text-7xl text-slate-200" aria-hidden="true">checkroom</span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-black text-primary">
              {selectedVariant ? (isMember ? selectedVariant.price_member : selectedVariant.price_non_member) : (isMember ? product.variants?.[0]?.price_member : product.variants?.[0]?.price_non_member)}€
            </p>
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
              {isMember ? t('shop_page.member_price') : t('shop_page.non_member_price')}
            </span>
          </div>

          {/* Membership Toggle */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit mt-4">
            <button
              type="button"
              onClick={() => setIsMember(true)}
              aria-pressed={isMember}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${isMember ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
            >
              {t('shop_page.member_price')}
            </button>
            <button
              type="button"
              onClick={() => setIsMember(false)}
              aria-pressed={!isMember}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${!isMember ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}
            >
              {t('shop_page.non_member_price')}
            </button>
          </div>
        </div>

        {/* Sizes */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
            Selecciona la talla
          </span>
          <div className="flex flex-wrap gap-2">
            {product.variants?.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedSize(v.size)}
                aria-pressed={selectedSize === v.size}
                className={`min-w-[56px] px-4 py-3 rounded-xl font-bold text-sm transition-colors border-2 ${selectedSize === v.size
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-100 text-slate-600 hover:border-primary'
                  }`}
              >
                {v.size}
              </button>
            ))}
          </div>
          {selectedVariant && (
            <p className={`text-xs mt-3 font-medium ${selectedVariant.stock <= 0 ? 'text-amber-600 font-bold' : selectedVariant.stock < 5 ? 'text-orange-600' : 'text-slate-400'}`}>
              {selectedVariant.stock <= 0 ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full" aria-hidden="true"></span>
                  Disponible sota comanda (sense estoc immediat)
                </span>
              ) : (
                `En estoc: ${selectedVariant.stock} unitats`
              )}
            </p>
          )}
        </div>

        {/* Quantity Selector */}
        {selectedSize && (
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quantitat</span>
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <button
                type="button"
                aria-label="Restar unitat"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:bg-white rounded-lg transition-colors"
              >
                -
              </button>
              <span className="w-10 text-center font-bold">{quantity}</span>
              <button
                type="button"
                aria-label="Sumar unitat"
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:bg-white rounded-lg transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )}

        {success && (
          <div role="status" className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold">
            <Check className="w-5 h-5" aria-hidden="true" />
            {t('shop_page.added_success', 'S\'ha afegit a la cistella')}
          </div>
        )}
      </div>
    </Modal>
  );
}
