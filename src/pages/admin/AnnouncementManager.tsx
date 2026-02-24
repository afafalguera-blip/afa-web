import { useEffect, useState } from "react";
import { AnnouncementService, type Announcement } from "../../services/AnnouncementService";
import {
    Megaphone,
    Save,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    Info,
    ExternalLink
} from "lucide-react";

export default function AnnouncementManager() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnnouncement();
    }, []);

    const fetchAnnouncement = async () => {
        setLoading(true);
        try {
            const data = await AnnouncementService.getLatest();
            setAnnouncement(data);
        } catch (err) {
            console.error(err);
            setError("Error al carregar la configuració");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcement) return;

        setSaving(true);
        setSuccess(false);
        setError(null);

        try {
            await AnnouncementService.update(announcement);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setError("Error al guardar els canvis");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async () => {
        if (!announcement) return;
        const newState = !announcement.is_active;

        try {
            await AnnouncementService.toggleActive(newState);
            setAnnouncement({ ...announcement, is_active: newState });
        } catch (err) {
            console.error(err);
            alert("Error al canviar l'estat");
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!announcement) {
        return (
            <div className="p-8 text-center text-slate-500">
                No s'ha trobat la configuració del banner.
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Banner d'Anuncis</h1>
                    <p className="text-slate-500 text-sm mt-1">Configura missatges globals a la part superior de la web.</p>
                </div>
                <button
                    onClick={toggleActive}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${announcement.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                >
                    {announcement.is_active ? (
                        <><Eye className="w-5 h-5" /> Actiu</>
                    ) : (
                        <><EyeOff className="w-5 h-5" /> Ocult</>
                    )}
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">

                    {/* Preview */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Preview del Banner</label>
                        <div className={`${{ info: 'bg-primary', warning: 'bg-amber-500', success: 'bg-emerald-500' }[announcement.type]
                            } p-3 rounded-xl text-white text-center font-bold text-sm shadow-inner flex items-center justify-center gap-2 max-w-2xl mx-auto overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700/50`}>
                            <Megaphone size={16} />
                            <span className="truncate">{announcement.message || "Escriu un missatge..."}</span>
                            {announcement.link && <ExternalLink size={14} className="opacity-70" />}
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-700" />

                    {/* Message Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Text del Missatge</label>
                        <textarea
                            required
                            value={announcement.message}
                            onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Ex: Recordeu fer el pagament de la quota abans del dia 10!"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Type Selector */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Tipus d'Alerta</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'info', label: 'Info', color: 'bg-primary' },
                                    { value: 'warning', label: 'Alerta', color: 'bg-amber-500' },
                                    { value: 'success', label: 'Èxit', color: 'bg-emerald-500' },
                                ].map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setAnnouncement({ ...announcement, type: t.value as any })}
                                        className={`px-3 py-3 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${announcement.type === t.value
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-transparent bg-slate-50 dark:bg-slate-900 text-slate-500'
                                            }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Link Input */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Enllaç (Opcional)</label>
                            <input
                                type="url"
                                value={announcement.link || ''}
                                onChange={(e) => setAnnouncement({ ...announcement, link: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                {/* Feedback Messages */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl animate-shake">
                        <AlertCircle size={20} />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-100 border border-green-200 text-green-700 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 size={20} />
                        <p className="font-medium">Canvis guardats correctament!</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 items-center">
                    <button
                        disabled={saving}
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save size={20} />
                                Guardar Configuració
                            </>
                        )}
                    </button>
                    <div className="flex items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <Info size={18} />
                        <p className="text-xs">L'actualització és instantània per a tots els usuaris.</p>
                    </div>
                </div>
            </form>
        </div>
    );
}
