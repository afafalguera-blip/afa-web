import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { ShopProduct } from '../../types/shop';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ProductModalProps {
  product: ShopProduct;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const { user, profile } = useAuth();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-fill name if profile exists
  useEffect(() => {
    if (profile?.full_name) {
      setCustomerName(profile.full_name);
    }
  }, [profile]);

  const variants = product.variants || [];
  const selectedVariant = variants.find(v => v.size === selectedSize);
  
  // Determine if out of stock
  const isOutOfStock = selectedVariant ? selectedVariant.stock <= 0 : false;

  const handleReserve = async () => {
    if (!selectedVariant) return;
    if (!customerName.trim()) {
      setErrorMsg('Cal introduir el nom i cognoms per reservar.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Create Order and Items via RPC (handles guest/atomic insert)
      const { error: rpcError } = await supabase.rpc('create_shop_order_v1', {
        p_customer_name: customerName,
        p_total_amount: selectedVariant.price_member,
        p_variant_id: selectedVariant.id,
        p_quantity: 1,
        p_price_at_time: selectedVariant.price_member,
        p_user_id: user?.id || null
      });

      if (rpcError) throw rpcError;
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error('Reservation error:', error);
      setErrorMsg('Error al processar la reserva. Torna-ho a provar.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-card-dark rounded-3xl p-8 max-w-sm w-full text-center animate-in zoom-in-50">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Reserva Confirmada!</h3>
          <p className="text-slate-500 mb-6">Pots passar a recollir-la a l'AFA en l'horari habitual.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-card-dark rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors z-10"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="grid md:grid-cols-2">
           {/* Image Column */}
           <div className="h-64 md:h-full bg-slate-100 dark:bg-slate-800 relative">
              {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <span className="material-icons-round text-6xl">checkroom</span>
                  </div>
              )}
           </div>

           {/* Content Column */}
           <div className="p-6 md:p-8 flex flex-col h-full">
              <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{product.category}</span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{product.name}</h2>
              
              <div className="space-y-4 mb-8">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Talla</label>
                    <div className="flex flex-wrap gap-2">
                       {variants.map(v => (
                           <button
                             key={v.id}
                             disabled={v.stock <= 0}
                             onClick={() => setSelectedSize(v.size)}
                             className={`
                               px-4 py-2 rounded-lg text-sm font-bold border transition-all
                               ${selectedSize === v.size 
                                 ? 'border-primary bg-primary text-white shadow-md' 
                                 : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 text-slate-700 dark:text-slate-200'}
                               ${v.stock <= 0 ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''}
                             `}
                           >
                             {v.size}
                           </button>
                       ))}
                    </div>
                 </div>

                 {selectedVariant && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Preu Soci</span>
                            <span className="font-bold text-lg text-primary">{selectedVariant.price_member}€</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">No Soci</span>
                            <span className="text-slate-600 dark:text-slate-400">{selectedVariant.price_non_member}€</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                            <span className={`text-xs font-bold ${selectedVariant.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {selectedVariant.stock > 0 ? 'Disponible' : 'Esgotat'}
                            </span>
                        </div>
                    </div>
                 )}
                 
                 {/* Mandatory Name Field */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Nom i Cognoms (Qui recull) <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Ex: Joan Garcia"
                        className="w-full px-4 py-3 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    />
                 </div>
              </div>

              {errorMsg && (
                  <p className="text-red-500 text-sm mb-4">{errorMsg}</p>
              )}

              <div className="mt-auto">
                 <button 
                    onClick={handleReserve}
                    disabled={!selectedSize || isOutOfStock || loading}
                    className={`
                        w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95
                        ${!selectedSize || isOutOfStock 
                            ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' 
                            : 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:shadow-xl'}
                    `}
                 >
                    {loading ? 'Processant...' : 'Reservar Ara'}
                 </button>
                 <p className="text-center text-xs text-slate-400 mt-3">Pagament a la recollida</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
