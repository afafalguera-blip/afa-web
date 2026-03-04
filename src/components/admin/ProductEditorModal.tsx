
import { useState, useEffect } from "react";
import { ShopService } from '../../features/shop/services/ShopService';
import type { ShopProduct, ShopVariant } from '../../features/shop/types/shop';
import { useTranslation } from "react-i18next";
import { X, Save, Loader2, Plus, Trash2, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sortSizes } from "../../utils/productUtils";
import { ConfigService, type ShopConfig } from "../../services/ConfigService";

interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ShopProduct | null;
  onSaved: () => void;
}

export function ProductEditorModal({ isOpen, onClose, product, onSaved }: ProductEditorModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<ShopProduct>>({
    category: 'uniforme',
    name: '',
    description: '',
  });
  const [variants, setVariants] = useState<Partial<ShopVariant>[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState<'es' | 'ca' | 'en'>('es');
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await ConfigService.getShopConfig();
      if (config) setShopConfig(config);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData(product);
      setVariants(sortSizes(product.variants || []));
    } else {
      setFormData({
        category: 'uniforme',
        name: '',
        description: '',
      });
      setVariants([
        { size: 'Única', price_member: 0, price_non_member: 0, stock: 0 }
      ]);
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ShopProduct, value: any) => {
    const translatableFields = ['name', 'description'];

    if (translatableFields.includes(field)) {
      const langKey = `${field}_${currentLang}` as keyof ShopProduct;
      setFormData(prev => ({
        ...prev,
        [langKey]: value,
        ...(currentLang === 'es' ? { [field]: value } : {})
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleVariantChange = (index: number, field: keyof ShopVariant, value: any) => {
    setVariants(prev => {
      const newVariants = [...prev];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return newVariants;
    });
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { size: '', price_member: 0, price_non_member: 0, stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const getValue = (field: keyof ShopProduct): string => {
    const langKey = `${field}_${currentLang}` as keyof ShopProduct;
    // @ts-ignore
    const val = formData[langKey];
    if (val !== undefined && val !== null) return String(val);

    return currentLang === 'es' && formData[field] ? String(formData[field]) : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let savedProduct;
      if (product?.id) {
        savedProduct = await ShopService.updateProduct(product.id, formData);
      } else {
        savedProduct = await ShopService.createProduct(formData);
      }

      const productId = product?.id || savedProduct?.id;
      if (!productId) throw new Error("Could not determine product ID");

      // Handle variants (sort them before processing)
      const sortedCurrentVariants = sortSizes<Partial<ShopVariant>>(variants);

      // 1. Get original variants if updating
      const originalVariants = product?.variants || [];
      const originalIds = originalVariants.map(v => v.id);
      const currentIds = sortedCurrentVariants.map(v => v.id).filter(Boolean);

      // 2. Delete variants that are no longer present
      const toDelete = originalIds.filter(id => !currentIds.includes(id));
      for (const id of toDelete) {
        await ShopService.deleteVariant(id);
      }

      // 3. Update or Create variants
      for (const variant of sortedCurrentVariants) {
        if (variant.id) {
          await ShopService.updateVariant(variant.id, variant);
        } else {
          await ShopService.createVariant({ ...variant, product_id: productId });
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save product", error);
      alert(t('common.error_save'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product?.id) return;
    if (!window.confirm(t('common.confirm_delete' as any) || 'Estàs segur que vols eliminar aquest producte?')) return;

    setLoading(true);
    try {
      await ShopService.deleteProduct(product.id);
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to delete product", error);
      alert(t('common.error_delete' as any) || 'Error al eliminar el producte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold dark:text-white">
              {product ? 'Editar Producte' : 'Nou Producte'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Section: Basic Info */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
              <span>Informació Bàsica</span>
              <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
                <select
                  value={formData.category}
                  onChange={e => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  {shopConfig?.categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.translations[currentLang] || cat.translations['ca']}
                    </option>
                  ))}
                  {!shopConfig && (
                    <>
                      <option value="uniforme">Uniforme</option>
                      <option value="accessoris">Accessoris</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">URL Imatge (opcional)</label>
                <input
                  type="text"
                  value={formData.image_url || ''}
                  onChange={e => handleChange('image_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Language Tabs for Name/Description */}
            <div className="space-y-4">
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 w-fit rounded-lg">
                {(['es', 'ca', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCurrentLang(lang)}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${currentLang === lang ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {lang === 'es' ? 'ES' : lang === 'ca' ? 'CA' : 'EN'}
                  </button>
                ))}
              </div>

              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom del Producte ({currentLang.toUpperCase()})</label>
                  <input
                    required={currentLang === 'es'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={getValue('name')}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder={currentLang !== 'es' ? '(Opcional) Deixar buit per usar defecte' : 'Ex: Samarreta Oficial'}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripció ({currentLang.toUpperCase()})</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                    value={getValue('description')}
                    onChange={e => handleChange('description', e.target.value)}
                    placeholder="..."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section: Variants (Sizes & Prices) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                <span>Talles i Preus</span>
                <div className="w-24 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
              </div>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Plus className="w-4 h-4" />
                Afegir Talla
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {variants.map((variant, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-white dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 items-end"
                  >
                    <div className="md:col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Talla</label>
                      <input
                        type="text"
                        value={variant.size}
                        onChange={e => handleVariantChange(index, 'size', e.target.value)}
                        placeholder="XL, 38..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Preu Soci</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={variant.price_member}
                          onChange={e => handleVariantChange(index, 'price_member', parseFloat(e.target.value))}
                          className="w-full pl-3 pr-6 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-blue-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Preu No Soci</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={variant.price_non_member}
                          onChange={e => handleVariantChange(index, 'price_non_member', parseFloat(e.target.value))}
                          className="w-full pl-3 pr-6 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-blue-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Estoc</label>
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={e => handleVariantChange(index, 'stock', parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex justify-end pb-1">
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {variants.length === 0 && (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500">No hi ha talles definides. Afegeix-ne una.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
          {product?.id ? (
            <button
              type="button"
              onClick={handleDeleteProduct}
              className="text-sm font-bold text-red-500 hover:text-red-600 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Producte
            </button>
          ) : <div />}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancel·lar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.name}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {product ? 'Guardar Canvis' : 'Crear Producte'}
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
