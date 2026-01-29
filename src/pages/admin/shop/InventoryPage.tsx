import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ShopProduct } from '../../../types/shop';
import { Search } from 'lucide-react';

export function InventoryPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
          *,
          variants:shop_variants(*)
        `)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStockUpdate = async (variantId: string, newStock: string) => {
    const stock = parseInt(newStock);
    if (isNaN(stock)) return;

    setSavingId(variantId);
    try {
      const { error } = await supabase
        .from('shop_variants')
        .update({ stock })
        .eq('id', variantId);

      if (error) throw error;
      
      // Update local state
      setProducts(prev => prev.map(p => ({
        ...p,
        variants: p.variants?.map(v => 
          v.id === variantId ? { ...v, stock } : v
        )
      })));
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Error updating stock');
    } finally {
      setSavingId(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
      return (
          <div className="flex justify-center items-center h-full p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
      )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventari i Preus</h1>
        <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Buscar producte..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
             />
        </div>
      </div>

      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Producte</th>
                <th className="px-6 py-4">Talla</th>
                <th className="px-6 py-4">Preu Soci</th>
                <th className="px-6 py-4">Preu No Soci</th>
                <th className="px-6 py-4">Estoc</th>
                <th className="px-6 py-4">Accions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredProducts.map(product => (
                product.variants?.map((variant, idx) => (
                  <tr key={variant.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {idx === 0 && (
                      <td rowSpan={product.variants?.length} className="px-6 py-4 font-medium text-slate-900 dark:text-white border-r border-slate-50 dark:border-slate-800">
                        {product.name}
                        <span className="block text-xs font-normal text-slate-400">{product.category}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 font-mono">{variant.size}</td>
                    <td className="px-6 py-4">{variant.price_member}€</td>
                    <td className="px-6 py-4">{variant.price_non_member}€</td>
                    <td className="px-6 py-4">
                      <input 
                        type="number" 
                        defaultValue={variant.stock}
                        className="w-20 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-transparent focus:border-primary outline-none"
                        onBlur={(e) => {
                            if (e.target.value !== variant.stock.toString()) {
                                handleStockUpdate(variant.id, e.target.value);
                            }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      {savingId === variant.id ? (
                          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      ) : (
                          <div className="w-4 h-4"></div> /* Placeholder for alignment */
                      )}
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
