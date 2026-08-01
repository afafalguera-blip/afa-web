import { useCallback, useEffect, useState, useMemo } from 'react';
import { AdminInventoryService } from '../../../features/shop/services/AdminInventoryService';
import type { ShopProduct } from '../../../features/shop/types/shop';
import { Package, Search, Download, Calculator, AlertTriangle, Edit, Info } from 'lucide-react';
import { ProductEditorModal } from '../../../components/admin/ProductEditorModal';
import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { useToast } from '../../../components/common/Toast';
import { useContentTranslation } from '../../../hooks/useContentTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { sortSizes, calculateChandalStock } from '../../../utils/productUtils';
import { ExportService } from '../../../services/ExportService';
import { proxyStorageUrl } from '../../../utils/storageUrl';

export function InventoryPage() {
  const { tContent } = useContentTranslation();
  const { toast } = useToast();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setProducts(await AdminInventoryService.listProducts());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No s\'ha pogut carregar l\'inventari');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Càlcul dinàmic de l'estoc del xandall complet
  const processedProducts = useMemo(() => {
    return calculateChandalStock(products);
  }, [products]);

  const handleStockUpdate = async (variantId: string, newStock: string) => {
    const stock = parseInt(newStock);
    if (isNaN(stock)) return;

    setSavingId(variantId);
    try {
      await AdminInventoryService.updateVariantStock(variantId, stock);

      setProducts(prev => prev.map(p => ({
        ...p,
        variants: p.variants?.map(v =>
          v.id === variantId ? { ...v, stock } : v
        )
      })));
      toast.success('Estoc actualitzat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error actualitzant l\'estoc');
    } finally {
      setSavingId(null);
    }
  };

  const handleExportPDF = () => {
    ExportService.exportInventoryPDF(processedProducts);
  };

  // Client-side filter on purpose: the catalogue is small (dozens of rows) and
  // the search must also match the translated name, which lives in the client.
  const filteredProducts = processedProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tContent(p, 'name').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <AdminPageHeader
        title="Gestió d'Inventari"
        subtitle="Controla l'estoc, preus i talles dels productes de la botiga."
        icon={Package}
        loading={loading}
        onRefresh={fetchInventory}
        onCreate={() => {
          setEditingProduct(null);
          setIsModalOpen(true);
        }}
        createLabel="Nou Producte"
        actions={
          <>
            <div className="relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <input
                type="search"
                aria-label="Buscar producte"
                placeholder="Buscar producte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-md text-[13px] outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={handleExportPDF}
              title="Descarregar PDF"
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-200 bg-white text-neutral-700 text-[13px] font-medium hover:bg-neutral-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900"></div>
          <p className="text-neutral-500 font-medium">Carregant inventari...</p>
        </div>
      ) : (
        <>
          {/* Products Grid/List */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => {
                const isCalculated = product.isCalculated;
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-lg border border-neutral-200 overflow-hidden"
                  >
                    {/* Product Header inside Card */}
                    <div className="p-4 md:p-5 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-white rounded-lg border border-neutral-200 flex items-center justify-center overflow-hidden">
                          {product.image_url ? (
                            <img src={proxyStorageUrl(product.image_url)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 md:w-6 md:h-6 text-neutral-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-neutral-900 text-base md:text-lg truncate">{tContent(product, 'name')}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
                              {product.category}
                            </span>
                            {isCalculated && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase rounded-md tracking-wider">
                                <Calculator className="w-3 h-3" />
                                <span className="hidden sm:inline">Estoc Calculat</span>
                                <span className="sm:hidden">Calculat</span>
                              </span>
                            )}
                            {(!product.variants || product.variants.length === 0) && (
                              <span className="flex items-center gap-1 text-amber-600 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" /> Sense talles
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(product);
                          setIsModalOpen(true);
                        }}
                        className="flex-shrink-0 flex items-center gap-2 px-3 md:px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors font-medium text-[13px]"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    </div>

                    {/* Variants — table on md+, cards on mobile */}
                    {(!product.variants || product.variants.length === 0) ? (
                      <div className="p-8 text-center bg-neutral-50/50">
                        <p className="text-neutral-400 text-sm italic">Aquest producte no té variants configurades.</p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-neutral-100">
                          {sortSizes(product.variants || []).map((variant) => (
                            <div key={variant.id} className="px-4 py-3 flex items-center gap-3">
                              <span className="font-mono bg-neutral-100 px-2.5 py-1 rounded text-xs font-bold w-14 text-center flex-shrink-0">
                                {variant.size}
                              </span>
                              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs text-neutral-400">
                                  Soci <span className="font-semibold text-neutral-600">{variant.price_member}€</span>
                                  <span className="mx-1.5 text-neutral-300">·</span>
                                  No soci <span className="font-semibold text-neutral-600">{variant.price_non_member}€</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isCalculated ? (
                                  <div className="w-16 px-2 py-1.5 rounded-lg border bg-neutral-100 border-neutral-200 text-neutral-500 font-bold text-sm text-center cursor-not-allowed">
                                    {variant.stock}
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="number"
                                      aria-label={`Estoc talla ${variant.size}`}
                                      defaultValue={variant.stock}
                                      className={`w-16 px-2 py-1.5 rounded-lg border text-sm text-center focus:ring-2 focus:ring-neutral-900/10 outline-none transition-colors ${variant.stock <= 0
                                        ? 'bg-red-50 border-red-200 text-red-700'
                                        : 'bg-white border-neutral-200'
                                        }`}
                                      onBlur={(e) => {
                                        if (e.target.value !== variant.stock.toString()) {
                                          handleStockUpdate(variant.id, e.target.value);
                                        }
                                      }}
                                    />
                                    {savingId === variant.id && (
                                      <div className="absolute -right-4 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-neutral-900 border-t-transparent rounded-full"></div>
                                    )}
                                  </div>
                                )}
                                {variant.stock <= 0 ? (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase w-20 text-center">Esgotat</span>
                                ) : variant.stock <= 5 ? (
                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase w-20 text-center">Baix estoc</span>
                                ) : (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase w-20 text-center">En estoc</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-neutral-50/30 text-neutral-400 uppercase text-[10px] font-bold tracking-widest">
                              <tr>
                                <th scope="col" className="px-6 py-3">Talla / Variant</th>
                                <th scope="col" className="px-6 py-3">Preu Soci</th>
                                <th scope="col" className="px-6 py-3">Preu No Soci</th>
                                <th scope="col" className="px-6 py-3">Estoc Actual</th>
                                <th scope="col" className="px-6 py-3 text-right">Estat</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                              {sortSizes(product.variants || []).map((variant) => (
                                <tr key={variant.id} className="group hover:bg-neutral-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="font-mono bg-neutral-100 px-2 py-1 rounded text-xs font-bold">{variant.size}</span>
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-neutral-600">
                                    {variant.price_member}€
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-neutral-600">
                                    {variant.price_non_member}€
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      {isCalculated ? (
                                        <div className="w-20 px-3 py-1.5 rounded-lg border bg-neutral-100 border-neutral-200 text-neutral-500 font-bold text-sm flex items-center justify-center cursor-not-allowed" title="L'estoc es calcula automàticament">
                                          {variant.stock}
                                        </div>
                                      ) : (
                                        <>
                                          <input
                                            type="number"
                                            aria-label={`Estoc talla ${variant.size}`}
                                            defaultValue={variant.stock}
                                            className={`w-20 px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-neutral-900/10 outline-none transition-colors ${variant.stock <= 0
                                              ? 'bg-red-50 border-red-200 text-red-700'
                                              : 'bg-white border-neutral-200'
                                              }`}
                                            onBlur={(e) => {
                                              if (e.target.value !== variant.stock.toString()) {
                                                handleStockUpdate(variant.id, e.target.value);
                                              }
                                            }}
                                          />
                                          {savingId === variant.id && (
                                            <div className="animate-spin w-3 h-3 border-2 border-neutral-900 border-t-transparent rounded-full"></div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {variant.stock <= 0 ? (
                                      <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase">Esgotat</span>
                                    ) : variant.stock <= 5 ? (
                                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase">Baix estoc</span>
                                    ) : (
                                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase">En estoc</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredProducts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-lg border border-dashed border-neutral-200">
                <div className="inline-flex items-center justify-center p-4 bg-neutral-50 rounded-full mb-4">
                  <Search className="w-8 h-8 text-neutral-300" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">No s'han trobat productes</h3>
                <p className="text-neutral-500 mt-2">Prova amb una altra cerca o crea un producte nou.</p>
              </div>
            )}
          </div>

          {/* Info Legend */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-neutral-600 text-center">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>
                L'estoc del <strong>Xandall Complet</strong> es calcula automàticament segons les unitats disponibles de pantalons i sudaderes per a cada talla.
              </span>
            </div>
          </div>
        </>
      )}

      <ProductEditorModal
        isOpen={isModalOpen}
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
    </div>
  );
}
