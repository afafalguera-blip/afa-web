import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, ShoppingBag, User } from 'lucide-react';
import { ShopService } from '../../services/ShopService';
import { supabase } from '../../lib/supabase';
import type { ShopProduct } from '../../types/shop';

interface OrderEditModalProps {
  order: any;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderEditModal({ order: initialOrder, onClose, onUpdate }: OrderEditModalProps) {
  const [order, setOrder] = useState(initialOrder);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [customerName, setCustomerName] = useState(initialOrder.customer_name);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const data = await ShopService.getProductsWithVariants();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }

  const handleUpdateName = async () => {
    try {
      await supabase.from('shop_orders').update({ customer_name: customerName }).eq('id', order.id);
      setEditingName(false);
      onUpdate();
    } catch (error) {
      alert('Error actualitzant el nom');
    }
  };

  const handleUpdateItem = async (itemId: string, variantId: string, quantity: number, price: number) => {
    setLoading(true);
    try {
      await ShopService.updateOrderItem(itemId, variantId, quantity, price);
      refreshOrder();
    } catch (error) {
      alert('Error actualitzant l\'article');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Segur que vols eliminar aquest article?')) return;
    setLoading(true);
    try {
      await ShopService.deleteOrderItem(itemId);
      refreshOrder();
    } catch (error) {
      alert('Error eliminant l\'article');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedVariantId) return;
    const variant = products.flatMap(p => p.variants || []).find(v => v.id === selectedVariantId);
    if (!variant) return;

    setLoading(true);
    try {
      await ShopService.addOrderItem(order.id, selectedVariantId, 1, variant.price_member);
      setShowAddProduct(false);
      setSelectedProductId('');
      setSelectedVariantId('');
      refreshOrder();
    } catch (error) {
      alert('Error afegint l\'article');
    } finally {
      setLoading(false);
    }
  };

  async function refreshOrder() {
    // We simply fetch all orders again via onUpdate to keep it simple and consistent
    onUpdate();
    // But we also need to update the local 'order' view if we want to stay in the modal
    const { data } = await supabase.from('shop_orders').select('*, items:shop_order_items(*, variant:shop_variants(*, product:shop_products(name)))').eq('id', order.id).single();
    if (data) setOrder(data);
  }

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/10">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <ShoppingBag className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestionar Comanda</h2>
                <span className="text-xs font-mono text-slate-400">ID: {order.id.slice(0,8)}</span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Customer Info */}
          <section className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <User className="w-4 h-4" /> Client
               </h3>
               {!editingName && (
                 <button onClick={() => setEditingName(true)} className="text-xs text-primary font-bold hover:underline">Editar</button>
               )}
            </div>
            
            {editingName ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                />
                <button onClick={handleUpdateName} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-lg font-bold text-slate-800 dark:text-white">{order.customer_name}</p>
            )}
          </section>

          {/* Items Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Articles</h3>
               <button 
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-full hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
               >
                 <Plus className="w-3.5 h-3.5" /> Afegir Producte
               </button>
            </div>

            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="group bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-all">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-white leading-tight">{item.variant?.product?.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                       <select 
                        value={item.variant_id}
                        onChange={(e) => handleUpdateItem(item.id, e.target.value, item.quantity, item.price_at_time)}
                        className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded py-0.5 px-2 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                       >
                         {products.find(p => p.name === item.variant?.product?.name)?.variants?.map(v => (
                           <option key={v.id} value={v.id}>Talla {v.size} ({v.stock} disp.)</option>
                         ))}
                       </select>
                       <span className="text-xs text-slate-400 font-mono">{item.price_at_time}€</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                       <button 
                        onClick={() => handleUpdateItem(item.id, item.variant_id, Math.max(1, item.quantity - 1), item.price_at_time)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors"
                       >-</button>
                       <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                       <button 
                        onClick={() => handleUpdateItem(item.id, item.variant_id, item.quantity + 1, item.price_at_time)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 rounded text-slate-500 transition-colors"
                       >+</button>
                    </div>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {(!order.items || order.items.length === 0) && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl uppercase text-[10px] tracking-widest font-bold">
                  Comanda buida
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
           <div>
              <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-0.5">Total Comanda</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white uppercase">{order.total_amount?.toFixed(2)}€</p>
           </div>
           <button 
            onClick={onClose}
            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-xl hover:scale-105 transition-all"
           >
             Tancar
           </button>
        </div>

        {/* Add Product Sub-Modal */}
        {showAddProduct && (
          <div className="absolute inset-0 z-20 bg-white dark:bg-slate-900 flex flex-col animate-in slide-in-from-bottom duration-300">
             <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="font-bold">Afegir Article</h3>
                <button onClick={() => setShowAddProduct(false)} className="p-2"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-6 space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Producte</label>
                   <select 
                    value={selectedProductId} 
                    onChange={e => {
                      setSelectedProductId(e.target.value);
                      setSelectedVariantId('');
                    }}
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary"
                   >
                     <option value="">Selecciona producte...</option>
                     {products.map(p => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                   </select>
                </div>

                {selectedProduct && (
                   <div>
                     <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-widest">Talla</label>
                     <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants?.map(v => (
                          <button 
                            key={v.id}
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedVariantId === v.id ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}
                          >
                            {v.size} ({v.stock} disp.)
                          </button>
                        ))}
                     </div>
                   </div>
                )}
             </div>
             <div className="mt-auto p-6 border-t border-slate-100 dark:border-white/5">
                <button 
                  disabled={!selectedVariantId || loading}
                  onClick={handleAddItem}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 disabled:opacity-50"
                >
                  {loading ? 'Processant...' : 'Confirmar i Afegir'}
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
