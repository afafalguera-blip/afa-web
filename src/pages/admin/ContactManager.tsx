import { useCallback, useEffect, useState } from "react";
import { usePagedFilters } from "../../hooks/usePagedFilters";
import { useTranslation } from "react-i18next";
import {
    ContactService,
    type ContactMessage,
    type ContactStatusFilter
} from "../../services/ContactService";
import {
    Mail,
    Trash2,
    Search,
    Archive,
    CheckCircle,
    Clock,
    User,
    MessageSquare,
    ChevronRight,
    ChevronLeft
} from "lucide-react";
import { AdminPageHeader } from "../../components/admin/common/AdminPageHeader";
import { AdminPagination } from "../../components/admin/common/AdminTable";
import { useToast } from "../../components/common/Toast";
import { useConfirm } from "../../components/common/ConfirmDialog";

const SEARCH_DEBOUNCE_MS = 350;

const STATUS_TABS: { value: ContactStatusFilter; labelKey: string; fallback: string }[] = [
    { value: 'all', labelKey: 'admin.contact.filter.all', fallback: 'Tots' },
    { value: 'unread', labelKey: 'admin.contact.filter.unread', fallback: 'No llegits' },
    { value: 'read', labelKey: 'admin.contact.filter.read', fallback: 'Llegits' },
    { value: 'archived', labelKey: 'admin.contact.filter.archived', fallback: 'Arxivats' }
];

export default function ContactManager() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState<ContactStatusFilter>('all');
    const { page, setPage, pageSize, setPageSize } = usePagedFilters(
        `${debouncedSearch} ${status}`
    );
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(searchText.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [searchText]);

    const refreshUnreadCount = useCallback(async () => {
        try {
            setUnreadCount(await ContactService.countUnread());
        } catch (err) {
            console.error("Error counting unread messages:", err);
        }
    }, []);

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const { rows, total: count } = await ContactService.list({
                page,
                pageSize,
                search: debouncedSearch || undefined,
                status
            });
            setMessages(rows);
            setTotal(count);
        } catch (err) {
            console.error("Error loading messages:", err);
            toast.error(t('admin.contact.load_error', 'No s\'han pogut carregar els missatges.'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch, status, toast, t]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    useEffect(() => {
        refreshUnreadCount();
    }, [refreshUnreadCount]);

    const handleMarkAsRead = async (message: ContactMessage) => {
        if (message.status !== 'unread') return;
        try {
            await ContactService.markAsRead(message.id);
            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'read' as const } : m));
            setSelectedMessage(prev => prev?.id === message.id ? { ...prev, status: 'read' as const } : prev);
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Error marking as read:", err);
            toast.error(t('admin.contact.mark_read_error', 'No s\'ha pogut marcar com a llegit.'));
        }
    };

    const handleDelete = async (message: ContactMessage) => {
        const ok = await confirm({
            title: t('admin.contact.delete_title', 'Eliminar missatge'),
            message: t('admin.contact.delete_message', 'Aquesta acció no es pot desfer.'),
            itemName: `${message.name} — ${message.subject}`,
            destructive: true
        });
        if (!ok) return;

        try {
            await ContactService.delete(message.id);
            if (selectedMessage?.id === message.id) setSelectedMessage(null);
            if (message.status === 'unread') setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success(t('admin.contact.delete_success', 'Missatge eliminat.'));
            fetchMessages();
        } catch (err) {
            console.error("Error deleting message:", err);
            toast.error(t('admin.contact.delete_error', 'No s\'ha pogut eliminar el missatge.'));
        }
    };

    const handleArchive = async (message: ContactMessage) => {
        try {
            await ContactService.archive(message.id);
            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'archived' as const } : m));
            setSelectedMessage(prev => prev?.id === message.id ? { ...prev, status: 'archived' as const } : prev);
            if (message.status === 'unread') setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success(t('admin.contact.archive_success', 'Missatge arxivat.'));
        } catch (err) {
            console.error("Error archiving message:", err);
            toast.error(t('admin.contact.archive_error', 'No s\'ha pogut arxivar el missatge.'));
        }
    };

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-4">
            <AdminPageHeader
                title={t('admin.contact.title', 'Missatges de Contacte')}
                subtitle={t('admin.contact.subtitle', 'Gestiona les consultes rebudes a través de la web.')}
                icon={Mail}
                loading={loading}
                onRefresh={() => { fetchMessages(); refreshUnreadCount(); }}
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('admin.contact.search_placeholder', 'Cerca per nom, email o assumpte...')}
                        className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg bg-white outline-none focus:ring-1 focus:ring-neutral-400"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>
                <div className="flex gap-1 p-1 bg-neutral-200/50 rounded-lg">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setStatus(tab.value)}
                            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${status === tab.value
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-500 hover:text-neutral-700'
                                }`}
                        >
                            {t(tab.labelKey, tab.fallback)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
                {/* List Section — on mobile, hidden once a message is selected (master/detail) */}
                <div className={`w-full lg:w-1/3 bg-white rounded-lg border border-neutral-200 overflow-hidden flex-col ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                            {t('admin.contact.inbox', "Bústia d'entrada")}
                        </span>
                        <span className="bg-neutral-900 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {t('admin.contact.unread_count', '{{count}} NO LLEGITS', { count: unreadCount })}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-4 animate-pulse space-y-2">
                                    <div className="h-4 bg-neutral-100 rounded w-1/2"></div>
                                    <div className="h-3 bg-neutral-100 rounded w-3/4"></div>
                                </div>
                            ))
                        ) : messages.length === 0 ? (
                            <div className="p-8 text-center text-neutral-500 text-sm italic">
                                {t('admin.contact.empty', "No s'ha trobat cap missatge.")}
                            </div>
                        ) : (
                            messages.map(message => (
                                <button
                                    key={message.id}
                                    onClick={() => {
                                        setSelectedMessage(message);
                                        handleMarkAsRead(message);
                                    }}
                                    className={`w-full text-left p-4 transition-colors hover:bg-neutral-50 flex gap-3 relative ${selectedMessage?.id === message.id ? 'bg-neutral-100 border-l-4 border-neutral-900' : ''
                                        } ${message.status === 'unread' ? 'font-bold' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${message.status === 'unread' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
                                        }`}>
                                        <User size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-sm truncate">{message.name}</span>
                                            <span className="text-[10px] text-neutral-400 font-medium">
                                                {new Date(message.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-600 truncate mb-1">{message.subject}</p>
                                        <p className="text-[10px] text-neutral-400 line-clamp-1">{message.message}</p>
                                    </div>
                                    {message.status === 'unread' && (
                                        <div className="absolute top-4 right-1.5 w-2 h-2 bg-neutral-900 rounded-full"></div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                    <div className="p-3 border-t border-neutral-200 bg-neutral-50">
                        <AdminPagination
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                        />
                    </div>
                </div>

                {/* Detail Section — on mobile, hidden until a message is selected */}
                <div className={`flex-1 bg-white rounded-lg border border-neutral-200 overflow-hidden flex-col ${selectedMessage ? 'flex' : 'hidden lg:flex'}`}>
                    {selectedMessage ? (
                        <>
                            <div className="p-4 sm:p-6 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <button
                                        onClick={() => setSelectedMessage(null)}
                                        className="lg:hidden p-2 -ml-1 text-neutral-500 hover:text-neutral-800 shrink-0"
                                        title={t('common.back', 'Tornar')}
                                    >
                                        <ChevronLeft size={22} />
                                    </button>
                                    <div className="w-12 h-12 bg-neutral-900 text-white rounded-lg flex items-center justify-center">
                                        <Mail size={24} />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-bold text-neutral-900 leading-tight truncate">{selectedMessage.subject}</h2>
                                        <p className="text-sm text-neutral-500">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleArchive(selectedMessage)}
                                        className="p-2.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                        title={t('admin.contact.archive', 'Arxivar')}
                                    >
                                        <Archive size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedMessage)}
                                        className="p-2.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title={t('common.delete', 'Eliminar')}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
                                <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-12">
                                    <div className="space-y-4 w-full lg:w-1/3">
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                                {t('admin.contact.sender', 'Remitent')}
                                            </label>
                                            <p className="font-bold text-neutral-900 flex items-center gap-2">
                                                <User size={16} className="text-neutral-500" /> {selectedMessage.name}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Email</label>
                                            <a href={`mailto:${selectedMessage.email}`} className="block font-medium text-neutral-900 underline hover:no-underline">
                                                {selectedMessage.email}
                                            </a>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                                {t('admin.contact.status', 'Estat')}
                                            </label>
                                            <div className="mt-1">
                                                {selectedMessage.status === 'unread' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-900 text-white">
                                                        <Clock size={12} /> {t('admin.contact.filter.unread', 'NO LLEGIT')}
                                                    </span>
                                                ) : selectedMessage.status === 'read' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                                        <CheckCircle size={12} /> {t('admin.contact.filter.read', 'LLEGIT')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600">
                                                        <Archive size={12} /> {t('admin.contact.filter.archived', 'ARXIVAT')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-neutral-50 rounded-lg p-6 min-h-[200px] relative border border-neutral-200 overflow-hidden">
                                        <MessageSquare className="absolute top-[-10px] right-[-10px] text-neutral-200" size={64} />
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-4">
                                            {t('admin.contact.message', 'Missatge')}
                                        </label>
                                        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap relative z-10">
                                            {selectedMessage.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-neutral-200 flex justify-center">
                                    <a
                                        href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                                        className="bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                    >
                                        <ChevronRight size={18} /> {t('admin.contact.reply', 'Respondre per Email')}
                                    </a>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-12 text-center">
                            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                                <Mail size={40} className="text-neutral-300" />
                            </div>
                            <p className="text-lg font-medium">
                                {t('admin.contact.empty_detail', 'Selecciona un missatge per llegir-ne el contingut')}
                            </p>
                            <p className="text-sm max-w-xs mt-2">
                                {t('admin.contact.empty_detail_hint', 'Pots cercar missatges per nom, correu o assumpte utilitzant la barra de cerca superior.')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
