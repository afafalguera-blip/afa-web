import { useState, useEffect, useMemo } from 'react';
import { ShopService } from '../../../features/shop/services/ShopService';
import { Search, Plus, LayoutDashboard, Archive, Euro, Truck, CheckCircle, XCircle, Settings, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { OrderEditModal } from '../../../features/shop/components/OrderEditModal';
import { motion, AnimatePresence } from 'framer-motion';

import type { ShopOrder } from '../../../features/shop/types/shop';

export function OrdersPage() {
    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');

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

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;

        try {
            const newOrder = await ShopService.createEmptyOrder(newCustomerName);
            setNewCustomerName('');
            setIsCreating(false);
            fetchOrders();
            // Automatically open editor for the new order to add items
            setSelectedOrder({ ...newOrder, items: [] });
        } catch {
            alert("Error creant la comanda");
        }
    };

    const handlePaymentUpdate = async (id: string, status: 'paid' | 'pending') => {
        try {
            await ShopService.updatePaymentStatus(id, status);
            fetchOrders();
        } catch (err) {
            console.error(err);
            alert("Error actualitzant l'estat de pagament");
        }
    };

    const handleDeliveryUpdate = async (id: string, status: ShopOrder['delivery_status']) => {
        try {
            await ShopService.updateDeliveryStatus(id, status);
            fetchOrders();
        } catch (err) {
            console.error(err);
            alert("Error actualitzant l'estat d'entrega");
        }
    };

    const handleDeleteOrder = async (id: string) => {
        if (!window.confirm('Estàs segur que vols eliminar aquesta comanda? Aquesta acció no es pot desfer.')) {
            return;
        }

        try {
            await ShopService.deleteOrder(id);
            fetchOrders();
        } catch (err) {
            console.error(err);
            alert("Error eliminant la comanda");
        }
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.id.toLowerCase().includes(searchTerm.toLowerCase());

            const isArchived = order.delivery_status === 'delivered' || order.delivery_status === 'not_picked_up';

            if (view === 'active') {
                return matchesSearch && !isArchived;
            } else {
                return matchesSearch && isArchived;
            }
        });
    }, [orders, searchTerm, view]);

    const stats = useMemo(() => {
        const active = orders.filter(o => o.delivery_status === 'pending');
        const revenue = orders.filter(o => o.payment_status === 'paid').reduce((acc, o) => acc + o.total_amount, 0);
        return {
            pendingCount: active.length,
            totalRevenue: revenue
        };
    }, [orders]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-slate-500 font-medium animate-pulse">Carregant comandes...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-primary" />
                        Comandes i Reserves
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gestió de reserves, vendes presencials i seguiment d'entregues.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setView('active')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'active' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'} `}
                        >
                            Actives ({orders.filter(o => o.delivery_status === 'pending').length})
                        </button>
                        <button
                            onClick={() => setView('archived')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'archived' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'} `}
                        >
                            Arxiu ({orders.filter(o => o.delivery_status !== 'pending').length})
                        </button>
                    </div>

                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nova Venda</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar per nom de client o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    />
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Pendents Entrega</span>
                    <span className="text-2xl font-black text-blue-700 dark:text-blue-400">{stats.pendingCount}</span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-900/30 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Facturació Total</span>
                    <span className="text-2xl font-black text-green-700 dark:text-green-400">{stats.totalRevenue.toFixed(2)}€</span>
                </div>
            </div>

            {/* Manual Order Creation Form */}
            <AnimatePresence>
                {isCreating && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleCreateOrder}
                        className="overflow-hidden"
                    >
                        <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">Venda Presencial - Nom del Client</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Introdueix nom i cognoms..."
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-none ring-1 ring-primary/20 focus:ring-2 focus:ring-primary outline-none text-lg font-bold"
                                />
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Cancel·lar
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                                >
                                    Crear Comanda
                                </button>
                            </div>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Orders List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredOrders.map((order) => (
                        <motion.div
                            key={order.id}
                            layout
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="p-5 flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                                {/* Order Main Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">#{order.id.slice(0, 8)}</span>
                                        <span className="text-xs font-semibold text-slate-400">
                                            {format(new Date(order.created_at), "d MMM yyyy · HH:mm", { locale: ca })}
                                        </span>
                                        {order.delivery_status === 'delivered' && (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-lg">
                                                <Archive className="w-3 h-3" /> Arxivat
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-baseline gap-4 mb-3">
                                        <h3 className="font-bold text-xl text-slate-900 dark:text-white truncate max-w-xs">{order.customer_name}</h3>
                                        <span className="text-2xl font-black text-primary">{order.total_amount.toFixed(2)}€</span>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {order.items?.map((item) => (
                                            <div key={item.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${item.variant && item.variant.stock < item.quantity
                                                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-900/20'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}>
                                                {item.variant && item.variant.stock < item.quantity && (
                                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                )}
                                                <span className="font-black text-primary">{item.quantity}x</span>
                                                <span className="font-bold">{item.variant?.product?.name}</span>
                                                <span className={`${item.variant && item.variant.stock < item.quantity ? 'text-amber-600/70' : 'text-slate-400'} text-[9px] uppercase font-bold`}>T- {item.variant?.size}</span>
                                            </div>
                                        ))}
                                        {(!order.items || order.items.length === 0) && (
                                            <span className="text-xs italic text-amber-500 flex items-center gap-1">
                                                <Plus className="w-3 h-3" /> Sense articles - Afegeix productes des de Gestionar
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status Controls */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">

                                    {/* Payment Toggle */}
                                    <button
                                        onClick={() => handlePaymentUpdate(order.id, order.payment_status === 'paid' ? 'pending' : 'paid')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-w-[90px] ${order.payment_status === 'paid'
                                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/30'
                                            : 'bg-white border-amber-100 text-amber-600 dark:bg-slate-800 dark:border-amber-900/30'
                                            } `}
                                    >
                                        <Euro className="w-4 h-4 mb-1" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {order.payment_status === 'paid' ? 'Pagat' : 'Pendent'}
                                        </span>
                                    </button>

                                    {/* Delivery Status */}
                                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl grow sm:grow-0">
                                        <button
                                            onClick={() => handleDeliveryUpdate(order.id, 'pending')}
                                            className={`p-2 rounded-lg transition-all ${order.delivery_status === 'pending' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} `}
                                            title="Pendent"
                                        >
                                            <Truck className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeliveryUpdate(order.id, 'delivered')}
                                            className={`p-2 rounded-lg transition-all ${order.delivery_status === 'delivered' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'} `}
                                            title="Entregat i Arxivar"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeliveryUpdate(order.id, 'not_picked_up')}
                                            className={`p-2 rounded-lg transition-all ${order.delivery_status === 'not_picked_up' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'} `}
                                            title="No recollit"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 ml-auto lg:ml-0">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                            title="Gestionar Articles"
                                        >
                                            <Settings className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteOrder(order.id)}
                                            className="p-3 bg-red-50 dark:bg-red-900/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                                            title="Eliminar Comanda"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredOrders.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
                        <div className="inline-flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                            <Archive className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white">No s'han trobat comandes</h3>
                        <p className="text-slate-500 mt-2">
                            {searchTerm ? 'Prova amb una altra cerca.' : view === 'archived' ? 'No hi ha comandes arxivades encara.' : 'Actualment no hi ha comandes pendents.'}
                        </p>
                    </div>
                )}
            </div>

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
