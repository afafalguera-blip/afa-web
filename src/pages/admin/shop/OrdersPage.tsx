import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePagedFilters } from '../../../hooks/usePagedFilters';
import { ShopService, type OrdersFilters, type OrdersSummary, type OrdersView } from '../../../features/shop/services/ShopService';
import { ConfigService } from '../../../services/ConfigService';
import { Search, Plus, LayoutDashboard, Euro, Truck, CheckCircle, XCircle, Settings, Trash2, AlertTriangle, Mail, Phone, BadgeCheck, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { OrderEditModal } from '../../../features/shop/components/OrderEditModal';
import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { AdminPagination, AdminTable, type AdminTableColumn } from '../../../components/admin/common/AdminTable';
import { Modal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/Toast';
import { useConfirm } from '../../../components/common/ConfirmDialog';

import type { ShopOrder } from '../../../features/shop/types/shop';

const orderLabel = (order: ShopOrder) => `#${order.id.slice(0, 8)} · ${order.customer_name}`;

export function OrdersPage() {
    const { toast } = useToast();
    const confirm = useConfirm();

    const [orders, setOrders] = useState<ShopOrder[]>([]);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<OrdersSummary>({ pendingCount: 0, archivedCount: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
    const [view, setView] = useState<OrdersView>('active');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [years, setYears] = useState<string[]>([]);
    const [yearsReady, setYearsReady] = useState(false);

    const { page, setPage, pageSize, setPageSize } = usePagedFilters(
        `${academicYear} ${view} ${search}`
    );

    const filters: OrdersFilters = useMemo(
        () => ({ academicYear: academicYear || undefined, view, search: search || undefined }),
        [academicYear, view, search],
    );

    const fetchOrders = useCallback(async () => {
        if (!yearsReady) return;
        setLoading(true);
        try {
            const [list, stats] = await Promise.all([
                ShopService.listOrders({ page, pageSize, ...filters }),
                ShopService.getOrdersSummary(filters.academicYear),
            ]);
            setOrders(list.rows);
            setTotal(list.total);
            setSummary(stats);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No s\'han pogut carregar les comandes');
        } finally {
            setLoading(false);
        }
    }, [filters, page, pageSize, toast, yearsReady]);

    // Initialise the course selector: default to the active season's course.
    useEffect(() => {
        (async () => {
            try {
                const [list, season] = await Promise.all([
                    ShopService.getOrderAcademicYears(),
                    ConfigService.getSeasonConfig(),
                ]);
                setYears(list);
                const preferred = season?.active_year && list.includes(season.active_year)
                    ? season.active_year
                    : (list[0] || '');
                setAcademicYear(preferred);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'No s\'han pogut carregar els cursos');
            } finally {
                setYearsReady(true);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Debounce the search box so typing does not hammer the API.
    useEffect(() => {
        const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;

        try {
            const newOrder = await ShopService.createEmptyOrder(newCustomerName);
            setNewCustomerName('');
            setIsCreating(false);
            toast.success('Pedido creado');
            await fetchOrders();
            // Automatically open editor for the new order to add items
            setSelectedOrder({ ...newOrder, items: [] });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error creant la comanda');
        }
    };

    const handlePaymentUpdate = async (order: ShopOrder, status: 'paid' | 'pending') => {
        try {
            await ShopService.updatePaymentStatus(order.id, status);
            toast.success(status === 'paid' ? 'Pedido marcado como pagado' : 'Pedido marcado como pendiente');
            await fetchOrders();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error actualitzant l\'estat de pagament');
        }
    };

    const handleDeliveryUpdate = async (order: ShopOrder, status: ShopOrder['delivery_status']) => {
        try {
            await ShopService.updateDeliveryStatus(order.id, status);
            await fetchOrders();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error actualitzant l\'estat d\'entrega');
        }
    };

    const handleDeleteOrder = async (order: ShopOrder) => {
        const ok = await confirm({
            title: 'Eliminar comanda',
            message: 'Aquesta acció no es pot desfer.',
            itemName: orderLabel(order),
            destructive: true,
        });
        if (!ok) return;

        try {
            await ShopService.deleteOrder(order.id);
            toast.success('Pedido eliminado');
            await fetchOrders();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error eliminant la comanda');
        }
    };

    const columns: AdminTableColumn<ShopOrder>[] = [
        {
            key: 'order',
            header: 'Pedido',
            render: (order) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">#{order.id.slice(0, 8)}</span>
                        {order.is_member && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-admin-accent text-white px-2 py-0.5 rounded">
                                <BadgeCheck className="w-3 h-3" /> Soci
                            </span>
                        )}
                        {(order.delivery_status === 'delivered' || order.delivery_status === 'not_picked_up') && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">
                                <Archive className="w-3 h-3" /> Arxivat
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-neutral-400">
                        {format(new Date(order.created_at), 'd MMM yyyy · HH:mm', { locale: ca })}
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Cliente',
            render: (order) => (
                <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-neutral-900 truncate max-w-[220px]">{order.customer_name}</div>
                    {order.customer_email && (
                        <div className="text-xs text-neutral-500 flex items-center gap-1.5 truncate max-w-[220px]">
                            <Mail className="w-3 h-3 flex-shrink-0" /> {order.customer_email}
                        </div>
                    )}
                    {order.customer_phone && (
                        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 flex-shrink-0" /> {order.customer_phone}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'items',
            header: 'Artículos',
            render: (order) => (
                <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {order.items?.map((item) => {
                        const short = item.variant && item.variant.stock < item.quantity;
                        return (
                            <span
                                key={item.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${short
                                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                                    : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}
                            >
                                {short && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                                <span className="font-bold">{item.quantity}x</span>
                                <span>{item.variant?.product?.name}</span>
                                <span className="text-neutral-400 uppercase text-[10px] font-bold">T-{item.variant?.size}</span>
                            </span>
                        );
                    })}
                    {(!order.items || order.items.length === 0) && (
                        <span className="text-xs italic text-amber-600">Sin artículos</span>
                    )}
                </div>
            ),
        },
        {
            key: 'total',
            header: 'Total',
            className: 'whitespace-nowrap font-bold text-neutral-900',
            render: (order) => `${Number(order.total_amount || 0).toFixed(2)}€`,
        },
        {
            key: 'payment',
            header: 'Pago',
            render: (order) => (
                <button
                    type="button"
                    onClick={() => handlePaymentUpdate(order, order.payment_status === 'paid' ? 'pending' : 'paid')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wide transition-colors ${order.payment_status === 'paid'
                        ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                        : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                >
                    <Euro className="w-3.5 h-3.5" />
                    {order.payment_status === 'paid' ? 'Pagat' : 'Pendent'}
                </button>
            ),
        },
        {
            key: 'delivery',
            header: 'Entrega',
            render: (order) => (
                <div className="flex gap-1 p-1 bg-neutral-100 rounded-md w-fit">
                    <button
                        type="button"
                        onClick={() => handleDeliveryUpdate(order, 'pending')}
                        className={`p-1.5 rounded transition-colors ${order.delivery_status === 'pending' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                        title="Pendiente"
                        aria-label="Marcar como pendiente"
                    >
                        <Truck className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeliveryUpdate(order, 'delivered')}
                        className={`p-1.5 rounded transition-colors ${order.delivery_status === 'delivered' ? 'bg-green-600 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}
                        title="Entregado y archivar"
                        aria-label="Marcar como entregado"
                    >
                        <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeliveryUpdate(order, 'not_picked_up')}
                        className={`p-1.5 rounded transition-colors ${order.delivery_status === 'not_picked_up' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-neutral-600'}`}
                        title="No recogido"
                        aria-label="Marcar como no recogido"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (order) => (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 bg-neutral-100 text-neutral-600 rounded-md hover:bg-admin-accent hover:text-white transition-colors"
                        title="Gestionar artículos"
                        aria-label="Gestionar artículos"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDeleteOrder(order)}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-colors"
                        title="Eliminar pedido"
                        aria-label="Eliminar pedido"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <AdminPageHeader
                title="Pedidos y Reservas"
                subtitle="Gestión de reservas, ventas presenciales y seguimiento de entregas."
                icon={LayoutDashboard}
                loading={loading}
                onRefresh={fetchOrders}
                onCreate={() => setIsCreating(true)}
                createLabel="Nueva Venta"
                createIcon={Plus}
                actions={
                    <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/10"
                        title="Curso"
                        aria-label="Curso"
                    >
                        <option value="">Todos los cursos</option>
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                }
            />

            {/* Quick Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
                    <input
                        type="search"
                        aria-label="Buscar pedidos"
                        placeholder="Buscar por nombre, email o teléfono..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
                    />
                </div>
                <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Pendientes Entrega</span>
                    <span className="text-2xl font-black text-neutral-900">{summary.pendingCount}</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Facturación Total</span>
                    <span className="text-2xl font-black text-green-700">{summary.totalRevenue.toFixed(2)}€</span>
                </div>
            </div>

            {/* View tabs */}
            <div className="flex bg-neutral-100 p-1 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setView('active')}
                    aria-pressed={view === 'active'}
                    className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${view === 'active' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    Activos ({summary.pendingCount})
                </button>
                <button
                    type="button"
                    onClick={() => setView('archived')}
                    aria-pressed={view === 'archived'}
                    className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${view === 'archived' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    Archivo ({summary.archivedCount})
                </button>
            </div>

            <AdminTable
                columns={columns}
                rows={orders}
                keyExtractor={(order) => order.id}
                loading={loading}
                emptyMessage={search ? 'Prueba con otra búsqueda.' : view === 'archived' ? 'Todavía no hay pedidos archivados.' : 'Actualmente no hay pedidos pendientes.'}
                footer={
                    <AdminPagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                }
            />

            {/* Manual order creation */}
            <Modal
                open={isCreating}
                onClose={() => setIsCreating(false)}
                title="Nueva venta presencial"
                size="md"
                footer={
                    <>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                        >
                            Cancel·lar
                        </button>
                        <button
                            type="submit"
                            form="create-order-form"
                            disabled={!newCustomerName.trim()}
                            className="px-3.5 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50"
                        >
                            Crear Pedido
                        </button>
                    </>
                }
            >
                <form id="create-order-form" onSubmit={handleCreateOrder} className="space-y-2">
                    <label className="block text-sm font-medium text-neutral-700" htmlFor="new-customer-name">
                        Nom del client
                    </label>
                    <input
                        id="new-customer-name"
                        type="text"
                        placeholder="Introduce nombre y apellidos..."
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-colors"
                    />
                </form>
            </Modal>

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
