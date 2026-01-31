import { useEffect, useState } from 'react';
import { ShopService } from '../../../services/ShopService';
import { CheckCircle, XCircle, Euro, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { OrderEditModal } from '../../../components/shop/OrderEditModal';
import { Settings } from 'lucide-react';

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  customer_name: string;
  payment_status: 'paid' | 'pending';
  delivery_status: 'pending' | 'delivered' | 'not_picked_up';
  items?: any[];
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await ShopService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePaymentUpdate = async (id: string, status: 'paid' | 'pending') => {
      try {
          await ShopService.updatePaymentStatus(id, status);
          fetchOrders();
      } catch (err) {
          console.error(err);
          alert("Error actualitzant l'estat de pagament");
      }
  };

  const handleDeliveryUpdate = async (id: string, status: Order['delivery_status']) => {
    try {
        await ShopService.updateDeliveryStatus(id, status);
        fetchOrders();
    } catch (err) {
        console.error(err);
        alert("Error actualitzant l'estat d'entrega");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Comandes i Reserves</h1>
      
      {loading ? (
          <div className="flex justify-center py-12 text-slate-500 animate-pulse">Carregant comandes...</div>
      ) : (
          <div className="grid gap-4">
              {orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                      {/* Order Info */}
                      <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                             <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">#{order.id.slice(0,8)}</span>
                             <span className="text-sm text-slate-500">
                                {format(new Date(order.created_at), "d MMMM yyyy HH:mm", { locale: ca })}
                             </span>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                             <p className="font-bold text-2xl text-slate-900 dark:text-white uppercase tracking-tighter">{order.total_amount.toFixed(2)}€</p>
                             <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                             <p className="font-bold text-slate-700 dark:text-slate-300">{order.customer_name}</p>
                          </div>
                          
                          <div className="space-y-1">
                              {order.items?.map((item: any) => (
                                  <div key={item.id} className="text-slate-700 flex items-center gap-2 text-sm">
                                      <span className="font-bold bg-slate-100 px-2 rounded-lg text-slate-600">{item.quantity}x</span> 
                                      {item.variant?.product?.name} 
                                      <span className="text-slate-400 text-xs uppercase ml-1">(Talla {item.variant?.size})</span>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Status Controls */}
                      <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                          
                          {/* Payment Status */}
                          <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 min-w-[180px]">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  <Euro className="w-3 h-3" /> Pagament
                              </div>
                              {order.payment_status === 'paid' ? (
                                  <button 
                                    onClick={() => handlePaymentUpdate(order.id, 'pending')}
                                    className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors group"
                                    title="Clic per desmarcar (marcar com pendent)"
                                  >
                                      <CheckCircle className="w-4 h-4 group-hover:hidden" />
                                      <span className="group-hover:hidden">Pagat</span>
                                      <span className="hidden group-hover:inline flex items-center gap-1">
                                         Desmarcar
                                      </span>
                                  </button>
                              ) : (
                                  <button 
                                    onClick={() => handlePaymentUpdate(order.id, 'paid')}
                                    className="flex items-center justify-between px-3 py-1.5 bg-white border border-yellow-300 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-50 transition"
                                  >
                                      <span>Pendent</span>
                                      <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded text-yellow-800 ml-2">Marcar Pagat</span>
                                  </button>
                              )}
                          </div>

                          {/* Delivery Status */}
                          <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100 min-w-[200px]">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  <Truck className="w-3 h-3" /> Entrega
                              </div>

                              {order.delivery_status === 'delivered' ? (
                                   <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                      <CheckCircle className="w-4 h-4" /> Entregat
                                  </div>
                              ) : order.delivery_status === 'not_picked_up' ? (
                                  <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                      <XCircle className="w-4 h-4" /> No recollit
                                  </div>
                              ) : (
                                  <div className="flex flex-col gap-1">
                                      <button 
                                          onClick={() => handleDeliveryUpdate(order.id, 'delivered')}
                                          className="text-xs w-full bg-blue-100 text-blue-700 hover:bg-blue-200 py-1.5 rounded font-medium transition"
                                      >
                                          Marcar Entregat
                                      </button>
                                      <button 
                                          onClick={() => handleDeliveryUpdate(order.id, 'not_picked_up')}
                                          className="text-xs w-full bg-slate-200 text-slate-600 hover:bg-slate-300 py-1.5 rounded font-medium transition"
                                      >
                                          No recollit
                                      </button>
                                  </div>
                              )}
                          </div>

                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-white/10 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-400 hover:text-primary min-w-[100px]"
                          >
                              <Settings className="w-5 h-5 mb-1" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Gestionar</span>
                          </button>

                      </div>
                  </div>
              ))}
              
              {orders.length === 0 && (
                  <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      No s'han trobat comandes.
                  </div>
              )}
          </div>
      )}

      {selectedOrder && (
        <OrderEditModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  );
}
