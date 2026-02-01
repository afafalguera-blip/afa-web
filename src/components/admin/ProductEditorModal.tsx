
import { useState, useEffect } from "react";
import { ShopService } from "../../services/ShopService";
import type { ShopProduct } from "../../types/shop";
import { useTranslation } from "react-i18next";
import { X, Save, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ProductEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ShopProduct | null;
  onSaved: () => void;
}

export function ProductEditorModal({ isOpen, onClose, product, onSaved }: ProductEditorModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<ShopProduct>>({});
  const [loading, setLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState<'es' | 'ca' | 'en'>('es');

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
        setFormData({});
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof ShopProduct, value: any) => {
    // If it's a translatable field, update the specific language field
    const translatableFields = ['name', 'description'];
    
    if (translatableFields.includes(field)) {
        const langKey = `${field}_${currentLang}` as keyof ShopProduct;
        setFormData(prev => ({ 
            ...prev, 
            [langKey]: value,
            // If editing Spanish, also update the legacy field for backward compatibility
            ...(currentLang === 'es' ? { [field]: value } : {})
        }));
    } else {
        setFormData(prev => ({ ...prev, [field]: value }));
    }
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
    if (!product?.id) return; // Only update supported for now

    setLoading(true);
    try {
      await ShopService.updateProduct(product.id, formData);
      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to save product", error);
      alert(t('common.error_save'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold dark:text-white">
            {product ? t('admin.editor.edit_product' as any) : t('admin.editor.new_product' as any)}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Language Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1">
             <button 
                type="button"
                onClick={() => setCurrentLang('es')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${currentLang === 'es' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                🇪🇸 Español
             </button>
             <button 
                type="button"
                onClick={() => setCurrentLang('ca')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${currentLang === 'ca' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                🏴 Català
             </button>
             <button 
                type="button"
                onClick={() => setCurrentLang('en')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${currentLang === 'en' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
                🇬🇧 English
             </button>
          </div>

          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.product_name' as any)} ({currentLang.toUpperCase()})</label>
                <input 
                  required={currentLang === 'es'} 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={getValue('name')} 
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder={currentLang !== 'es' ? '(Optional) Leave empty to use default' : ''}
                />
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('admin.editor.description')} ({currentLang.toUpperCase()})</label>
               <textarea 
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  value={getValue('description')} 
                  onChange={e => handleChange('description', e.target.value)}
                />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">{t('admin.editor.cancel')}</button>
            <button 
                form="product-form"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('admin.editor.save')}
            </button>
        </div>

      </motion.div>
    </div>
  );
}
