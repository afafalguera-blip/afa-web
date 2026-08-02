import { useCallback, useEffect, useMemo, useState } from "react";
import { ShopService } from '../../features/shop/services/ShopService';
import type { ShopProduct, ShopVariant } from '../../features/shop/types/shop';
import { useTranslation } from "react-i18next";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sortSizes } from "../../utils/productUtils";
import { ConfigService, type ShopConfig } from "../../services/ConfigService";
import { Modal } from "../common/Modal";
import { useToast } from "../common/Toast";
import { useConfirm } from "../common/ConfirmDialog";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";

interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ShopProduct | null;
  onSaved: () => void;
}

const FIELD_CLASS =
  'w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors';

function emptyProduct(): Partial<ShopProduct> {
  return { category: 'uniforme', name: '', description: '' };
}

export function ProductEditorModal({ isOpen, onClose, product, onSaved }: ProductEditorModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [formData, setFormData] = useState<Partial<ShopProduct>>(emptyProduct);
  const [variants, setVariants] = useState<Partial<ShopVariant>[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState<'es' | 'ca' | 'en'>('es');
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);

  const isDirty = useMemo(
    () => !loading && JSON.stringify({ formData, variants }) !== initialSnapshot,
    [formData, variants, initialSnapshot, loading]
  );
  const { confirmDiscard } = useDirtyGuard(isOpen && isDirty);

  useEffect(() => {
    ConfigService.getShopConfig()
      .then((config) => {
        if (config) setShopConfig(config);
      })
      .catch(() => {
        // Falls back to the hardcoded category list rendered below.
      });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const nextForm = product ? { ...product } : emptyProduct();
    const nextVariants: Partial<ShopVariant>[] = product
      ? sortSizes(product.variants || [])
      : [{ size: 'Única', price_member: 0, price_non_member: 0, stock: 0 }];

    setFormData(nextForm);
    setVariants(nextVariants);
    setInitialSnapshot(JSON.stringify({ formData: nextForm, variants: nextVariants }));
  }, [product, isOpen]);

  const handleChange = <K extends keyof ShopProduct>(field: K, value: ShopProduct[K]) => {
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

  const handleVariantChange = <K extends keyof ShopVariant>(index: number, field: K, value: ShopVariant[K]) => {
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
    const val = formData[langKey as keyof typeof formData];
    if (val !== undefined && val !== null) return String(val);

    return currentLang === 'es' && formData[field] ? String(formData[field]) : '';
  };

  const requestClose = useCallback(async () => {
    if (await confirmDiscard()) onClose();
  }, [confirmDiscard, onClose]);

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

      toast.success(
        product?.id
          ? t('admin.shop.product_updated', 'Producte actualitzat')
          : t('admin.shop.product_created', 'Producte creat')
      );
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error_save'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product?.id) return;
    const ok = await confirm({
      title: t('admin.shop.delete_product_title', 'Eliminar producte'),
      message: t('admin.shop.delete_product_message', 'S\'eliminaran també totes les seves talles.'),
      itemName: product.name,
      destructive: true,
    });
    if (!ok) return;

    setLoading(true);
    try {
      await ShopService.deleteProduct(product.id);
      toast.success(t('admin.shop.product_deleted', 'Producte eliminat'));
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error', 'Error al eliminar el producte'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={requestClose}
      title={product ? 'Editar Producte' : 'Nou Producte'}
      size="xl"
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-1 justify-between items-center gap-3">
          {product?.id ? (
            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={loading}
              className="text-[13px] font-medium text-red-600 hover:text-red-700 px-3 py-2 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('admin.shop.delete_product', 'Eliminar Producte')}
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Cancel·lar
            </button>
            <button
              type="submit"
              form="product-editor-form"
              disabled={loading || !formData.name}
              className="px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {product ? 'Guardar Canvis' : 'Crear Producte'}
            </button>
          </div>
        </div>
      }
    >
      <form id="product-editor-form" onSubmit={handleSubmit} className="space-y-8">

        {/* Section: Basic Info */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Informació Bàsica</span>
            <div className="flex-1 h-px bg-neutral-100"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700" htmlFor="product-category">Categoria</label>
              <select
                id="product-category"
                value={formData.category}
                onChange={e => handleChange('category', e.target.value as 'uniforme' | 'accessoris')}
                className={FIELD_CLASS}
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
              <label className="text-sm font-medium text-neutral-700" htmlFor="product-image">URL Imatge (opcional)</label>
              <input
                id="product-image"
                type="text"
                value={formData.image_url || ''}
                onChange={e => handleChange('image_url', e.target.value)}
                placeholder="https://..."
                className={FIELD_CLASS}
              />
            </div>
          </div>

          {/* Language Tabs for Name/Description */}
          <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-neutral-100 w-fit rounded-lg">
              {(['es', 'ca', 'en'] as const).map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setCurrentLang(lang)}
                  aria-pressed={currentLang === lang}
                  className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${currentLang === lang ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="space-y-4 bg-neutral-50 p-4 rounded-lg border border-neutral-100">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700" htmlFor="product-name">Nom del Producte ({currentLang.toUpperCase()})</label>
                <input
                  id="product-name"
                  required={currentLang === 'es'}
                  className={FIELD_CLASS}
                  value={getValue('name')}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder={currentLang !== 'es' ? '(Opcional) Deixar buit per usar defecte' : 'Ex: Samarreta Oficial'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700" htmlFor="product-description">Descripció ({currentLang.toUpperCase()})</label>
                <textarea
                  id="product-description"
                  rows={3}
                  className={`${FIELD_CLASS} resize-none`}
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
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              <span>Talles i Preus</span>
              <div className="w-24 h-px bg-neutral-100"></div>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 hover:text-neutral-900"
            >
              <Plus className="w-4 h-4" />
              Afegir Talla
            </button>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {variants.map((variant, index) => (
                <motion.div
                  key={variant.id ?? `new-${index}`}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-white rounded-lg border border-neutral-100 items-end"
                >
                  <div className="md:col-span-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase" htmlFor={`variant-size-${index}`}>Talla</label>
                    <input
                      id={`variant-size-${index}`}
                      type="text"
                      value={variant.size ?? ''}
                      onChange={e => handleVariantChange(index, 'size', e.target.value)}
                      placeholder="XL, 38..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm outline-none focus:border-neutral-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase" htmlFor={`variant-member-${index}`}>Preu Soci</label>
                    <div className="relative">
                      <input
                        id={`variant-member-${index}`}
                        type="number"
                        value={variant.price_member ?? 0}
                        onChange={e => handleVariantChange(index, 'price_member', parseFloat(e.target.value))}
                        className="w-full pl-3 pr-6 py-2 rounded-lg border border-neutral-200 bg-white text-sm outline-none focus:border-neutral-400"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">€</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase" htmlFor={`variant-non-member-${index}`}>Preu No Soci</label>
                    <div className="relative">
                      <input
                        id={`variant-non-member-${index}`}
                        type="number"
                        value={variant.price_non_member ?? 0}
                        onChange={e => handleVariantChange(index, 'price_non_member', parseFloat(e.target.value))}
                        className="w-full pl-3 pr-6 py-2 rounded-lg border border-neutral-200 bg-white text-sm outline-none focus:border-neutral-400"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">€</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase" htmlFor={`variant-stock-${index}`}>Estoc</label>
                    <input
                      id={`variant-stock-${index}`}
                      type="number"
                      value={variant.stock ?? 0}
                      onChange={e => handleVariantChange(index, 'stock', parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm outline-none focus:border-neutral-400"
                    />
                  </div>
                  <div className="flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      aria-label={`Eliminar talla ${variant.size ?? index + 1}`}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {variants.length === 0 && (
              <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                <p className="text-sm text-neutral-500">No hi ha talles definides. Afegeix-ne una.</p>
              </div>
            )}
          </div>
        </section>
      </form>
    </Modal>
  );
}
