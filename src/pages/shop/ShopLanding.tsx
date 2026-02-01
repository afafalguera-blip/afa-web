import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ShopProduct } from '../../types/shop';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// We'll placeholder the internal components first
import { ProductModal } from '../../components/shop/ProductModal';

export function ShopLanding() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'all' | 'uniforme' | 'accessoris'>('all');
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    // ... same fetch logic
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
          *,
          variants:shop_variants(*)
        `);
      
      if (error) throw error;
      setProducts(data || []);
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
    <div className="px-6 py-4 pb-24 lg:pb-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('nav.shop')}</h1>
        <p className="text-slate-500 text-sm">{t('shop_page.subtitle')}</p>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
             <input 
               type="text" 
               placeholder={t('shop_page.search_placeholder')} 
               className="w-full pl-12 pr-4 py-3 bg-white dark:bg-card-dark border-none rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 dark:text-white"
             />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
           <button 
             onClick={() => setCategory('all')}
             className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10'}`}
           >
             {t('shop_page.filter_all')}
           </button>
           <button 
             onClick={() => setCategory('uniforme')}
             className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === 'uniforme' ? 'bg-primary text-white' : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10'}`}
           >
             {t('shop_page.filter_uniform')}
           </button>
           <button 
             onClick={() => setCategory('accessoris')}
             className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === 'accessoris' ? 'bg-primary text-white' : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-white/10'}`}
           >
             {t('shop_page.filter_accessories')}
           </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div 
                key={product.id} 
                onClick={() => setSelectedProduct(product)}
                className="bg-white dark:bg-card-dark rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-95"
            >
                <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 overflow-hidden">
                    {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <span className="material-icons-round text-4xl">checkroom</span>
                        </div>
                    )}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 line-clamp-2">{product.name}</h3>
                
                <div className="mt-auto">
                    {product.variants && product.variants.length > 0 && (
                        <p className="text-primary font-bold">
                            {Math.min(...product.variants.map(v => Number(v.price_member)))}€
                            <span className="text-xs text-slate-400 font-normal ml-1">{t('shop_page.member_price')}</span>
                        </p>
                    )}
                     <button className="w-full mt-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg pointer-events-none">
                        {t('shop_page.view_options')}
                    </button>
                </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}
