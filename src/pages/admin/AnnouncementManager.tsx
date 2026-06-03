import { useEffect, useState } from "react";
import { AnnouncementService, type Announcement } from "../../services/AnnouncementService";
import { TranslationService } from "../../services/TranslationService";
import {
    Megaphone,
    Save,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    Info,
    ExternalLink,
    Languages
} from "lucide-react";

export default function AnnouncementManager() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('ca');

    useEffect(() => {
        fetchAnnouncement();
    }, []);

    const fetchAnnouncement = async () => {
        setLoading(true);
        try {
            const data = await AnnouncementService.getLatest();
            if (data && !data.translations) {
                data.translations = {
                    ca: data.message,
                    es: data.message,
                    en: data.message
                };
            }
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
            const sourceText = announcement.translations?.[activeLang] || announcement.message || '';
            const targetLangs = (['ca', 'es', 'en'] as const).filter(l => l !== activeLang);

            let translations = { ...(announcement.translations || { ca: sourceText, es: sourceText, en: sourceText }) };

            if (sourceText.trim()) {
                const result = await TranslationService.translateBulk(
                    { message: sourceText },
                    activeLang,
                    targetLangs,
                );
                for (const lang of targetLangs) {
                    translations[lang] = result[lang]?.message ?? translations[lang];
                }
                translations[activeLang] = sourceText;
            }

            const updatedAnnouncement = {
                ...announcement,
                translations,
                message: translations[activeLang] || announcement.message,
            };
            await AnnouncementService.update(updatedAnnouncement);
            setAnnouncement(updatedAnnouncement);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            setError("Error al guardar els canvis.");
        } finally {
            setSaving(false);
        }
    };

    const handleMessageChange = (val: string) => {
        if (!announcement) return;
        const newTranslations = {
            ...(announcement.translations || { ca: announcement.message, es: announcement.message, en: announcement.message }),
            [activeLang]: val
        };
        setAnnouncement({
            ...announcement,
            translations: newTranslations
        });
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
            <div className="p-8 text-center text-neutral-500">
                No s'ha trobat la configuració del banner.
            </div>
        );
    }

    const previewMessage = announcement.translations?.[activeLang] || announcement.message;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-800 dark:text-white">Banner d'Anuncis</h1>
                    <p className="text-neutral-500 text-sm mt-1">Configura missatges globals a la part superior de la web.</p>
                </div>
                <button
                    onClick={toggleActive}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm ${announcement.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
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
                <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-6">

                    {/* Preview */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Preview del Banner ({activeLang.toUpperCase()})</label>
                        <div className={`${{ info: 'bg-primary', warning: 'bg-amber-500', success: 'bg-emerald-500' }[announcement.type]
                            } p-3 rounded-lg text-white text-center font-bold text-sm shadow-inner flex items-center justify-center gap-2 max-w-2xl mx-auto overflow-hidden ring-4 ring-neutral-100 dark:ring-neutral-700/50`}>
                            <Megaphone size={16} />
                            <span className="truncate">{previewMessage || "Escriu un missatge..."}</span>
                            {announcement.link && <ExternalLink size={14} className="opacity-70" />}
                        </div>
                    </div>

                    <hr className="border-neutral-100 dark:border-neutral-700" />

                    {/* Language Selector */}
                    <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg">
                        {(['ca', 'es', 'en'] as const).map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => setActiveLang(lang)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeLang === lang
                                    ? 'bg-white dark:bg-neutral-800 text-primary shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                                    }`}
                            >
                                <Languages size={16} />
                                {lang === 'ca' ? 'Català' : lang === 'es' ? 'Castellano' : 'English'}
                            </button>
                        ))}
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-200 text-left">Text del Missatge ({activeLang.toUpperCase()})</label>
                        <textarea
                            required
                            value={announcement.translations?.[activeLang] || ''}
                            onChange={(e) => handleMessageChange(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder={`Missatge en ${activeLang === 'ca' ? 'Català' : activeLang === 'es' ? 'Castellano' : 'English'}...`}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Type Selector */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-200">Tipus d'Alerta</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'info', label: 'Info', color: 'bg-primary' },
                                    { value: 'warning', label: 'Alerta', color: 'bg-amber-500' },
                                    { value: 'success', label: 'Èxit', color: 'bg-emerald-500' },
                                ].map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setAnnouncement({ ...announcement, type: t.value as Announcement['type'] })}
                                        className={`px-3 py-3 rounded-lg font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${announcement.type === t.value
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-transparent bg-neutral-50 dark:bg-neutral-900 text-neutral-500'
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
                            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-200">Enllaç (Opcional)</label>
                            <input
                                type="url"
                                value={announcement.link || ''}
                                onChange={(e) => setAnnouncement({ ...announcement, link: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                {/* Feedback Messages */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg animate-shake">
                        <AlertCircle size={20} />
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-100 border border-green-200 text-green-700 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 size={20} />
                        <p className="font-medium">Canvis guardats correctament!</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 items-center">
                    <button
                        disabled={saving}
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 shadow-sm shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
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
                    <div className="flex items-center gap-2 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
                        <Info size={18} />
                        <p className="text-xs">L'actualització és instantània per a tots els usuaris.</p>
                    </div>
                </div>
            </form>
        </div>
    );
}
