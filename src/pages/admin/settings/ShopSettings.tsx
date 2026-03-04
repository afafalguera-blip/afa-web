import { Globe, ShoppingBag, Users, Plus, Trash2 } from "lucide-react";
import type { ShopConfig } from "../../../services/ConfigService";

interface ShopSettingsProps {
    shop: ShopConfig;
    setShop: (shop: ShopConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

export function ShopSettings({ shop, setShop, activeLang, setActiveLang }: ShopSettingsProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-700 pb-4 mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    Configuració de la Botiga (Reserves)
                </h3>

                {/* Language Switcher */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit">
                    {(['ca', 'es', 'en'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLang(lang)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeLang === lang
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20 mb-4">
                    <Globe size={18} />
                    <p className="text-xs font-medium">Estàs editant la versió en <span className="font-bold underline">{activeLang === 'ca' ? 'Català' : activeLang === 'es' ? 'Castellà' : 'Anglès'}</span></p>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Missatge de Confirmació de Reserva</label>
                    <p className="text-xs text-slate-500 mb-2 italic">Aquest missatge apareixerà a la web un cop l'usuari finalitzi la seva reserva.</p>
                    <textarea
                        required
                        value={shop.translations?.[activeLang] || ""}
                        onChange={(e) => {
                            const newTranslations = { ...shop.translations };
                            newTranslations[activeLang] = e.target.value;
                            setShop({ ...shop, translations: newTranslations });
                        }}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none transition-all text-sm leading-relaxed"
                        placeholder="Ex: Pots passar a recollir la teva comanda..."
                    />
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* Admin Emails Management */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Users size={16} /> Emails per Notificacions
                        </h4>
                        <button
                            type="button"
                            onClick={() => {
                                const newEmails = [...(shop.admin_emails || []), ""];
                                setShop({ ...shop, admin_emails: newEmails });
                            }}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} /> Afegir email
                        </button>
                    </div>
                    <div className="space-y-2">
                        {(shop.admin_emails || []).map((email, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        const newEmails = [...shop.admin_emails];
                                        newEmails[idx] = e.target.value;
                                        setShop({ ...shop, admin_emails: newEmails });
                                    }}
                                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
                                    placeholder="admin@exemple.com"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newEmails = shop.admin_emails.filter((_, i) => i !== idx);
                                        setShop({ ...shop, admin_emails: newEmails });
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(shop.admin_emails || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic">No hi ha emails configurats.</p>
                        )}
                    </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* Categories Management */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <ShoppingBag size={16} /> Categories de Productes
                        </h4>
                        <button
                            type="button"
                            onClick={() => {
                                const newCategories = [
                                    ...(shop.categories || []),
                                    { id: `cat-${Date.now()}`, translations: { ca: "", es: "", en: "" } }
                                ];
                                setShop({ ...shop, categories: newCategories });
                            }}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} /> Afegir categoria
                        </button>
                    </div>
                    <div className="space-y-4">
                        {(shop.categories || []).map((cat, idx) => (
                            <div key={cat.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Slug / ID</label>
                                        <input
                                            type="text"
                                            value={cat.id}
                                            onChange={(e) => {
                                                const newCats = [...shop.categories];
                                                newCats[idx] = { ...cat, id: e.target.value.toLowerCase().replace(/\s+/g, '-') };
                                                setShop({ ...shop, categories: newCats });
                                            }}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newCats = shop.categories.filter((_, i) => i !== idx);
                                            setShop({ ...shop, categories: newCats });
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-500 self-end"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['ca', 'es', 'en'] as const).map(lang => (
                                        <div key={lang} className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">{lang.toUpperCase()}</label>
                                            <input
                                                type="text"
                                                value={cat.translations[lang]}
                                                onChange={(e) => {
                                                    const newCats = [...shop.categories];
                                                    const newTrans = { ...cat.translations, [lang]: e.target.value };
                                                    newCats[idx] = { ...cat, translations: newTrans };
                                                    setShop({ ...shop, categories: newCats });
                                                }}
                                                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                                                placeholder={lang === 'ca' ? "Nom..." : ""}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {(shop.categories || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic">No hi ha categories configurades.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
