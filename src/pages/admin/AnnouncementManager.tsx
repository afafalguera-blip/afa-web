import { useEffect, useMemo, useState } from "react";
import { AnnouncementService, type Announcement } from "../../services/AnnouncementService";
import { TranslationService } from "../../services/TranslationService";
import {
    Megaphone,
    Save,
    Info,
    ExternalLink,
    Languages
} from "lucide-react";
import { AdminPageHeader } from "../../components/admin/common/AdminPageHeader";
import { VisibilityToggleButton } from "../../components/admin/news/ContentStatusBadge";
import { useToast } from "../../components/common/Toast";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";

export default function AnnouncementManager() {
    const { toast } = useToast();

    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [snapshot, setSnapshot] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeLang, setActiveLang] = useState<'ca' | 'es' | 'en'>('ca');

    const isDirty = useMemo(
        () => Boolean(announcement) && JSON.stringify(announcement) !== snapshot,
        [announcement, snapshot]
    );
    useDirtyGuard(isDirty);

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
            setSnapshot(JSON.stringify(data));
        } catch (err) {
            console.error(err);
            toast.error("Error al carregar la configuració");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcement) return;

        setSaving(true);

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
            setSnapshot(JSON.stringify(updatedAnnouncement));
            toast.success("Canvis guardats correctament.");
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar els canvis.");
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
            const next = { ...announcement, is_active: newState };
            setAnnouncement(next);
            setSnapshot(JSON.stringify(next));
            toast.success(newState ? "Banner actiu." : "Banner ocult.");
        } catch (err) {
            console.error(err);
            toast.error("Error al canviar l'estat");
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-neutral-300 border-t-neutral-900 rounded-full animate-spin"></div>
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
        <div className="max-w-4xl mx-auto">
            <AdminPageHeader
                title="Banner d'Anuncis"
                subtitle="Configura missatges globals a la part superior de la web."
                icon={Megaphone}
                actions={
                    <VisibilityToggleButton
                        visible={announcement.is_active}
                        hiddenKind="inactive"
                        onToggle={toggleActive}
                    />
                }
            />

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-100 space-y-6">

                    {/* Preview */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Preview del Banner ({activeLang.toUpperCase()})</label>
                        <div className={`${{ info: 'bg-primary', warning: 'bg-amber-500', success: 'bg-emerald-500' }[announcement.type]
                            } p-3 rounded-lg text-white text-center font-bold text-sm shadow-inner flex items-center justify-center gap-2 max-w-2xl mx-auto overflow-hidden ring-4 ring-neutral-100`}>
                            <Megaphone size={16} />
                            <span className="truncate">{previewMessage || "Escriu un missatge..."}</span>
                            {announcement.link && <ExternalLink size={14} className="opacity-70" />}
                        </div>
                    </div>

                    <hr className="border-neutral-100" />

                    {/* Language Selector */}
                    <div className="flex bg-neutral-100 p-1 rounded-lg">
                        {(['ca', 'es', 'en'] as const).map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => setActiveLang(lang)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeLang === lang
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700'
                                    }`}
                            >
                                <Languages size={16} />
                                {lang === 'ca' ? 'Català' : lang === 'es' ? 'Castellano' : 'English'}
                            </button>
                        ))}
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-neutral-700 text-left">Text del Missatge ({activeLang.toUpperCase()})</label>
                        <textarea
                            required
                            value={announcement.translations?.[activeLang] || ''}
                            onChange={(e) => handleMessageChange(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder={`Missatge en ${activeLang === 'ca' ? 'Català' : activeLang === 'es' ? 'Castellano' : 'English'}...`}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Type Selector */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-neutral-700">Tipus d'Alerta</label>
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
                                            : 'border-transparent bg-neutral-50 text-neutral-500'
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
                            <label className="block text-sm font-bold text-neutral-700">Enllaç (Opcional)</label>
                            <input
                                type="url"
                                value={announcement.link || ''}
                                onChange={(e) => setAnnouncement({ ...announcement, link: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 items-center">
                    <button
                        disabled={saving}
                        type="submit"
                        className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
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
                    <div className="flex items-center gap-2 p-4 bg-neutral-100 rounded-lg border border-neutral-200 text-neutral-500">
                        <Info size={18} />
                        <p className="text-xs">L'actualització és instantània per a tots els usuaris.</p>
                    </div>
                </div>
            </form>
        </div>
    );
}
