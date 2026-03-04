import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import type { ShopProduct } from '../../../features/shop/types/shop';
import { Package, Search, Plus, Download, Calculator, AlertTriangle, Edit, Info } from 'lucide-react';
import { ProductEditorModal } from '../../../components/admin/ProductEditorModal';
import { useContentTranslation } from '../../../hooks/useContentTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { sortSizes, calculateChandalStock } from '../../../utils/productUtils';
import { ExportService } from '../../../services/ExportService';

export function InventoryPage() {
  const { tContent } = useContentTranslation();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      setLoading(true);
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

  // Càlcul dinàmic de l'estoc del xandall complet
  const processedProducts = useMemo(() => {
    return calculateChandalStock(products);
  }, [products]);

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

  const handleExportPDF = () => {
    ExportService.exportInventoryPDF(processedProducts);
  };

  const filteredProducts = processedProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tContent(p, 'name').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-slate-500 font-medium animate-pulse">Carregant inventari...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Gestió d'Inventari
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Controla l'estoc, preus i talles dels productes de la botiga.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar producte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
            />
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-5 h-5" />
            <span>Descarregar PDF</span>
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>Nou Producte</span>
          </button>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => {
            const isCalculated = (product as any).isCalculated;
            return (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Product Header inside Card */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{tContent(product, 'name')}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded-md tracking-wider">
                          {product.category}
                        </span>
                        {isCalculated && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase rounded-md tracking-wider">
                            <Calculator className="w-3 h-3" /> Estoc Calculat
                          </span>
                        )}
                        {(!product.variants || product.variants.length === 0) && (
                          <span className="flex items-center gap-1 text-amber-500 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> Sense talles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all font-semibold text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                </div>

                {/* Variants Table/List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/30 dark:bg-slate-800/20 text-slate-400 uppercase text-[10px] font-bold tracking-widest">
                      <tr>
                        <th className="px-6 py-3">Talla / Variant</th>
                        <th className="px-6 py-3">Preu Soci</th>
                        <th className="px-6 py-3">Preu No Soci</th>
                        <th className="px-6 py-3">Estoc Actual</th>
                        <th className="px-6 py-3 text-right">Estat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {sortSizes(product.variants || []).map((variant) => (
                        <tr key={variant.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold">{variant.size}</span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                            {variant.price_member}€
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                            {variant.price_non_member}€
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {isCalculated ? (
                                <div className="w-20 px-3 py-1.5 rounded-lg border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm flex items-center justify-center cursor-not-allowed" title="L'estoc es calcula automàticament">
                                  {variant.stock}
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    defaultValue={variant.stock}
                                    className={`w-20 px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all ${variant.stock <= 0
                                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                      }`}
                                    onBlur={(e) => {
                                      if (e.target.value !== variant.stock.toString()) {
                                        handleStockUpdate(variant.id, e.target.value);
                                      }
                                    }}
                                  />
                                  {savingId === variant.id && (
                                    <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full"></div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {variant.stock <= 0 ? (
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black rounded-full uppercase">Esgotat</span>
                            ) : variant.stock <= 5 ? (
                              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-full uppercase">Baix estoc</span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-black rounded-full uppercase">En estoc</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!product.variants || product.variants.length === 0) && (
                    <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-800/10">
                      <p className="text-slate-400 text-sm italic">Aquest producte no té variants configurades.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
            <div className="inline-flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold dark:text-white">No s'han trobat productes</h3>
            <p className="text-slate-500 mt-2">Prova amb una altra cerca o crea un producte nou.</p>
          </div>
        )}
      </div>

      {/* Info Legend */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400 text-center">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            L'estoc del <strong>Xandall Complet</strong> es calcula automàticament segons les unitats disponibles de pantalons i sudaderes per a cada talla.
          </span>
        </div>
      </div>

      {isModalOpen && (
        <ProductEditorModal
          isOpen={true}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          onSaved={() => {
            fetchInventory();
            setIsModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
