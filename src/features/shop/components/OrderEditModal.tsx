import { useCallback, useState, useEffect } from 'react';
import { Plus, Trash2, Save, User, Mail, Phone, BadgeCheck } from 'lucide-react';
import { ShopService } from '../services/ShopService';
import type { ShopProduct, ShopOrder, ShopOrderItem, ShopVariant } from '../types/shop';
import { sortSizes } from '../../../utils/productUtils';
import { Modal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/Toast';
import { useConfirm } from '../../../components/common/ConfirmDialog';
import { useDirtyGuard } from '../../../hooks/useDirtyGuard';

interface OrderEditModalProps {
  order: ShopOrder;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderEditModal({ order: initialOrder, onClose, onUpdate }: OrderEditModalProps) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [order, setOrder] = useState(initialOrder);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [customerName, setCustomerName] = useState(initialOrder.customer_name);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  // Every other edit is persisted immediately; only the inline name field can
  // hold an unsaved change.
  const { confirmDiscard } = useDirtyGuard(editingName && customerName !== order.customer_name);

  useEffect(() => {
    ShopService.getProductsWithVariants()
      .then(setProducts)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Error carregant els productes');
      });
  }, [toast]);

  const refreshOrder = useCallback(async () => {
    onUpdate();
    try {
      setOrder(await ShopService.getOrder(order.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error refrescant la comanda');
    }
  }, [onUpdate, order.id, toast]);

  const requestClose = useCallback(async () => {
    if (await confirmDiscard()) onClose();
  }, [confirmDiscard, onClose]);

  const handleUpdateName = async () => {
    try {
      await ShopService.updateOrderCustomerName(order.id, customerName);
      setEditingName(false);
      toast.success('Nom actualitzat');
      await refreshOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error actualitzant el nom');
    }
  };

  const handleToggleMember = async (value: boolean) => {
    setLoading(true);
    try {
      await ShopService.setOrderMember(order, value);
      await refreshOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error actualitzant l\'estat de soci');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (itemId: string, variantId: string, quantity: number, price: number) => {
    setLoading(true);
    try {
      await ShopService.updateOrderItem(itemId, variantId, quantity, price);
      await refreshOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error actualitzant l\'article');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: ShopOrderItem) => {
    const ok = await confirm({
      title: 'Eliminar article',
      itemName: `${item.quantity}x ${item.variant?.product?.name ?? 'Article'} · T-${item.variant?.size ?? '—'}`,
      destructive: true,
    });
    if (!ok) return;

    setLoading(true);
    try {
      await ShopService.deleteOrderItem(item.id);
      toast.success('Article eliminat');
      await refreshOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error eliminant l\'article');
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
      const price = order.is_member ? variant.price_member : variant.price_non_member;
      await ShopService.addOrderItem(order.id, selectedVariantId, 1, price);
      setShowAddProduct(false);
      setSelectedProductId('');
      setSelectedVariantId('');
      toast.success('Article afegit');
      await refreshOrder();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error afegint l\'article');
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <>
      <Modal
        open
        onClose={requestClose}
        title={`Gestionar Comanda #${order.id.slice(0, 8)}`}
        size="lg"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-1 items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-neutral-400 uppercase font-black tracking-widest">Total Comanda</p>
              <p className="text-xl font-black text-neutral-900">{Number(order.total_amount || 0).toFixed(2)}€</p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="px-3.5 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors"
            >
              Tancar
            </button>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Customer Info */}
          <section className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" /> Client
              </h3>
              {!editingName && (
                <button type="button" onClick={() => setEditingName(true)} className="text-xs text-neutral-700 font-bold hover:underline">
                  Editar
                </button>
              )}
            </div>

            {editingName ? (
              <div className="flex gap-2">
                <label className="sr-only" htmlFor="order-customer-name">Nom del client</label>
                <input
                  id="order-customer-name"
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
                <button
                  type="button"
                  onClick={handleUpdateName}
                  aria-label="Desar nom"
                  className="p-2 bg-admin-accent text-white rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-lg font-bold text-neutral-900">{order.customer_name}</p>
                {order.customer_email && (
                  <p className="text-sm text-neutral-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {order.customer_email}
                  </p>
                )}
                {order.customer_phone && (
                  <p className="text-sm text-neutral-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {order.customer_phone}
                  </p>
                )}
              </div>
            )}

            {/* Member toggle */}
            <div className="mt-3 pt-3 border-t border-neutral-200">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={order.is_member ?? false}
                    disabled={loading}
                    onChange={e => handleToggleMember(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 rounded-full peer-checked:bg-admin-accent transition-colors"></div>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className={`w-4 h-4 ${order.is_member ? 'text-neutral-900' : 'text-neutral-300'}`} />
                  <span className="text-sm font-bold text-neutral-700">Soci</span>
                  {order.is_member && (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-admin-accent text-white px-2 py-0.5 rounded-full">Preu soci aplicat</span>
                  )}
                </div>
              </label>
            </div>
          </section>

          {/* Items */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Articles</h3>
              <button
                type="button"
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-1.5 text-[13px] font-medium bg-admin-accent text-white px-3 py-1.5 rounded-md hover:bg-neutral-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Afegir Producte
              </button>
            </div>

            <div className="space-y-3">
              {order.items?.map((item: ShopOrderItem) => (
                <div key={item.id} className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 leading-tight truncate">{item.variant?.product?.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <label className="sr-only" htmlFor={`item-variant-${item.id}`}>Talla</label>
                      <select
                        id={`item-variant-${item.id}`}
                        value={item.variant_id}
                        onChange={(e) => handleUpdateItem(item.id, e.target.value, item.quantity, item.price_at_time)}
                        className="text-xs bg-neutral-100 border-none rounded py-1 px-2 outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer"
                      >
                        {sortSizes(products.find(p => p.name === item.variant?.product?.name)?.variants || []).map((v: ShopVariant) => (
                          <option key={v.id} value={v.id}>Talla {v.size} ({v.stock} disp.)</option>
                        ))}
                      </select>
                      <span className="text-xs text-neutral-400 font-mono">{item.price_at_time}€</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-neutral-100 rounded-lg p-1">
                      <button
                        type="button"
                        aria-label="Restar unitat"
                        onClick={() => handleUpdateItem(item.id, item.variant_id, Math.max(1, item.quantity - 1), item.price_at_time)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-neutral-500 transition-colors"
                      >-</button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Sumar unitat"
                        onClick={() => handleUpdateItem(item.id, item.variant_id, item.quantity + 1, item.price_at_time)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-neutral-500 transition-colors"
                      >+</button>
                    </div>
                    <button
                      type="button"
                      aria-label="Eliminar article"
                      onClick={() => handleDeleteItem(item)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {(!order.items || order.items.length === 0) && (
                <div className="text-center py-12 text-neutral-400 border-2 border-dashed border-neutral-200 rounded-lg uppercase text-[10px] tracking-widest font-bold">
                  Comanda buida
                </div>
              )}
            </div>
          </section>
        </div>
      </Modal>

      {/* Add Product nested dialog */}
      <Modal
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        title="Afegir Article"
        size="md"
        footer={
          <button
            type="button"
            disabled={!selectedVariantId || loading}
            onClick={handleAddItem}
            className="px-3.5 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Processant...' : 'Confirmar i Afegir'}
          </button>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2" htmlFor="add-item-product">Producte</label>
            <select
              id="add-item-product"
              value={selectedProductId}
              onChange={e => {
                setSelectedProductId(e.target.value);
                setSelectedVariantId('');
              }}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
            >
              <option value="">Selecciona producte...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div>
              <span className="block text-sm font-medium text-neutral-700 mb-2">Talla</span>
              <div className="flex flex-wrap gap-2">
                {sortSizes(selectedProduct.variants || []).map((v: ShopVariant) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    aria-pressed={selectedVariantId === v.id}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${selectedVariantId === v.id ? 'bg-admin-accent text-white border-neutral-900' : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'}`}
                  >
                    {v.size} ({v.stock} disp.)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
