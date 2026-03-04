import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ShopProduct } from '../types/shop';
import { Search, ShoppingBag, ShoppingCart } from 'lucide-react'; // Retaining Search and ShoppingBag as they are used in the original code
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../../../hooks/useContentTranslation';
import { ProductModal } from '../components/ProductModal';
import { CheckoutModal } from '../components/CheckoutModal';
import { LazyImage } from '../../../components/common/LazyImage';
import { SEO } from '../../../components/common/SEO';
import { calculateChandalStock } from '../../../utils/productUtils';
import { useCart } from '../contexts/CartContext';
import { ConfigService, type ShopConfig } from '../../../services/ConfigService';

export function ShopLanding() {
  const { i18n, t } = useTranslation();
  const { tContent } = useContentTranslation();
  const { itemCount } = useCart();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'all' | 'uniforme' | 'accessoris'>('all');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);

  const currentLang = (i18n.language || 'ca') as 'ca' | 'es' | 'en';

  useEffect(() => {
    fetchProducts();
    fetchConfig();
  }, []);

  async function fetchConfig() {
    const config = await ConfigService.getShopConfig();
    if (config) setShopConfig(config);
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
  *,
  variants: shop_variants(*)
        `);

      if (error) throw error;
      setProducts(calculateChandalStock(data || []));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = category === 'all'
    ? products
    : products.filter(p => p.category === category);

  return (
    <div className="px-6 py-4 pb-32 lg:pb-24 max-w-7xl mx-auto">
      <SEO
        title="Tienda Solidaria"
        description="Reserva el uniforme escolar, accesorios y material del AFA Escuela Falguera. Precios reducidos para socios."
      />

      <header className="mb-10 flex justify-between items-start pt-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">{t('nav.shop')}</h1>
          <p className="text-slate-500 text-sm max-w-md leading-relaxed">{t('shop_page.subtitle')}</p>
        </div>

        {/* Cart Floating Button Mobile / Desktop Header */}
        <button
          onClick={() => setIsCheckoutOpen(true)}
          className="relative p-3 bg-white dark:bg-card-dark rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-white/10 hover:ring-primary transition-all group active:scale-95"
        >
          <ShoppingBag className="w-6 h-6 text-slate-700 dark:text-slate-200 group-hover:text-primary" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in">
              {itemCount}
            </span>
          )}
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('shop_page.search_placeholder')}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-card-dark border-none rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:text-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
          <button
            onClick={() => setCategory('all')}
            className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${category === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white dark:bg-card-dark ring-1 ring-slate-200 dark:ring-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'} `}
          >
            {t('shop_page.filter_all')}
          </button>

          {shopConfig?.categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as any)}
              className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${category === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white dark:bg-card-dark ring-1 ring-slate-200 dark:ring-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'} `}
            >
              {cat.translations[currentLang] || cat.translations['ca']}
            </button>
          ))}

          {!shopConfig && (
            <>
              <button
                onClick={() => setCategory('uniforme')}
                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${category === 'uniforme' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white dark:bg-card-dark ring-1 ring-slate-200 dark:ring-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'} `}
              >
                {t('shop_page.filter_uniform')}
              </button>
              <button
                onClick={() => setCategory('accessoris')}
                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${category === 'accessoris' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-white dark:bg-card-dark ring-1 ring-slate-200 dark:ring-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50'} `}
              >
                {t('shop_page.filter_accessories')}
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="group bg-white dark:bg-card-dark rounded-3xl p-4 shadow-sm ring-1 ring-slate-100 dark:ring-white/5 flex flex-col cursor-pointer hover:shadow-xl hover:ring-primary/20 transition-all active:scale-95"
            >
              <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4 overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-500">
                {product.image_url ? (
                  <LazyImage src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <span className="material-icons-round text-5xl">checkroom</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none flex items-center justify-center">
                  <span className="bg-white/90 dark:bg-slate-900/90 py-2 px-4 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-y-4 group-hover:translate-y-0 duration-300 flex items-center gap-2">
                    <ShoppingCart className="w-3 h-3" /> {t('shop_page.view_options')}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-[15px] mb-2 line-clamp-2 px-1 group-hover:text-primary transition-colors">{tContent(product, 'name')}</h3>

              <div className="mt-auto px-1 pt-2">
                {product.variants && product.variants.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-primary font-bold text-lg">
                      {Math.min(...product.variants.map(v => Number(v.price_member)))}€
                      <span className="text-[10px] text-slate-400 font-normal ml-1.5 uppercase tracking-wider">{t('shop_page.member_price')}</span>
                    </p>
                    <p className="text-slate-400 text-xs">
                      {Math.min(...product.variants.map(v => Number(v.price_non_member)))}€
                      <span className="text-[10px] text-slate-400 font-normal ml-1.5 uppercase tracking-wider">{t('shop_page.non_member_price')}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Checkout Button for Mobile */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-6 right-6 z-[40] md:max-w-xs md:left-auto md:right-10 animate-in slide-in-from-bottom-10 duration-500">
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full py-5 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 font-black text-lg group hover:scale-[1.02] active:scale-[0.98] transition-all hover:bg-primary/90 border border-white/20 backdrop-blur-md"
          >
            <div className="relative animate-bounce">
              <ShoppingBag className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-primary text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">{itemCount}</span>
            </div>
            <span>{t('shop_page.cart_title')}</span>
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onGoToCart={() => {
            setSelectedProduct(null);
            setIsCheckoutOpen(true);
          }}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </div>
  );
}
