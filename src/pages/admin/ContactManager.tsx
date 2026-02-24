import { useEffect, useState } from "react";
import { ContactService, type ContactMessage } from "../../services/ContactService";
import {
    Mail,
    Trash2,
    Search,
    Archive,
    CheckCircle,
    Clock,
    User,
    MessageSquare,
    ChevronRight
} from "lucide-react";

export default function ContactManager() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const data = await ContactService.getAll();
            setMessages(data);
        } catch (err) {
            console.error("Error loading messages:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (message: ContactMessage) => {
        if (message.status === 'unread') {
            try {
                await ContactService.markAsRead(message.id);
                setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'read' as const } : m));
                if (selectedMessage?.id === message.id) {
                    setSelectedMessage({ ...selectedMessage, status: 'read' as const });
                }
            } catch (err) {
                console.error("Error marking as read:", err);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Estàs segur que vols eliminar aquest missatge?")) {
            try {
                await ContactService.delete(id);
                setMessages(prev => prev.filter(m => m.id !== id));
                if (selectedMessage?.id === id) setSelectedMessage(null);
            } catch (err) {
                console.error("Error deleting message:", err);
            }
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await ContactService.archive(id);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'archived' as const } : m));
            if (selectedMessage?.id === id) {
                setSelectedMessage(prev => prev ? { ...prev, status: 'archived' as const } : null);
            }
        } catch (err) {
            console.error("Error archiving message:", err);
        }
    };

    const filteredMessages = messages.filter(m =>
        m.name.toLowerCase().includes(searchText.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchText.toLowerCase()) ||
        m.email.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Missatges de Contacte</h1>
                    <p className="text-slate-500">Gestiona les consultes rebudes a través de la web.</p>
                </div>
                <div className="flex-1 max-w-md ml-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Cerca per nom, email o assumpte..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* List Section */}
                <div className="w-1/3 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bústia d'entrada</span>
                        <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {messages.filter(m => m.status === 'unread').length} NO LLEGITS
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-4 animate-pulse space-y-2">
                                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/2"></div>
                                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded w-3/4"></div>
                                </div>
                            ))
                        ) : filteredMessages.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm italic">
                                No s'ha trobat cap missatge.
                            </div>
                        ) : (
                            filteredMessages.map(message => (
                                <button
                                    key={message.id}
                                    onClick={() => {
                                        setSelectedMessage(message);
                                        handleMarkAsRead(message);
                                    }}
                                    className={`w-full text-left p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 flex gap-3 relative ${selectedMessage?.id === message.id ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary' : ''
                                        } ${message.status === 'unread' ? 'font-bold' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${message.status === 'unread' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                        }`}>
                                        <User size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-sm truncate dark:text-white">{message.name}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {new Date(message.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate mb-1">{message.subject}</p>
                                        <p className="text-[10px] text-slate-400 line-clamp-1">{message.message}</p>
                                    </div>
                                    {message.status === 'unread' && (
                                        <div className="absolute top-4 right-1.5 w-2 h-2 bg-primary rounded-full"></div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail Section */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                    {selectedMessage ? (
                        <>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{selectedMessage.subject}</h2>
                                        <p className="text-sm text-slate-500">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleArchive(selectedMessage.id)}
                                        className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl transition-all"
                                        title="Arxivar"
                                    >
                                        <Archive size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedMessage.id)}
                                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                <div className="flex items-start gap-12">
                                    <div className="space-y-4 w-1/3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remitent</label>
                                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <User size={16} className="text-primary" /> {selectedMessage.name}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                                            <a href={`mailto:${selectedMessage.email}`} className="block font-medium text-primary hover:underline">
                                                {selectedMessage.email}
                                            </a>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estat</label>
                                            <div className="mt-1">
                                                {selectedMessage.status === 'unread' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                                        <Clock size={12} /> NO LLEGIT
                                                    </span>
                                                ) : selectedMessage.status === 'read' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                                        <CheckCircle size={12} /> LLEGIT
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                                        <Archive size={12} /> ARXIVAT
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 min-h-[200px] relative border border-slate-100 dark:border-slate-800">
                                        <MessageSquare className="absolute top-[-10px] right-[-10px] text-slate-200 dark:text-slate-800" size={64} />
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Missatge</label>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap relative z-10">
                                            {selectedMessage.message}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-100 dark:border-slate-700 flex justify-center">
                                    <a
                                        href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                                    >
                                        <ChevronRight size={18} /> Respondre per Email
                                    </a>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-slate-50/20 dark:bg-slate-900/20">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                <Mail size={40} className="text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-lg font-medium">Selecciona un missatge per llegir-ne el contingut</p>
                            <p className="text-sm max-w-xs mt-2">Pots cercar missatges per nom, correu o assumpte utilitzant la barra de cerca superior.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
