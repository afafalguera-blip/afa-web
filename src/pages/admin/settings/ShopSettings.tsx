import { Globe, ShoppingBag, Users, Plus, Trash2 } from "lucide-react";
import type { ShopConfig } from "../../../services/ConfigService";
import { useSettingsT } from "./useSettingsT";

interface ShopSettingsProps {
    shop: ShopConfig;
    setShop: (shop: ShopConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

const LANG_NAMES: Record<'ca' | 'es' | 'en', { key: string; fallback: string }> = {
    ca: { key: 'admin.settings.lang.ca', fallback: 'Català' },
    es: { key: 'admin.settings.lang.es', fallback: 'Castellà' },
    en: { key: 'admin.settings.lang.en', fallback: 'Anglès' }
};

export function ShopSettings({ shop, setShop, activeLang, setActiveLang }: ShopSettingsProps) {
    const t = useSettingsT();
    const langName = t(LANG_NAMES[activeLang].key, LANG_NAMES[activeLang].fallback);

    return (
        <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <h3 className="text-lg font-bold text-neutral-900">
                    {t('admin.settings.shop.title', 'Configuració de la botiga (reserves)')}
                </h3>

                <div className="flex p-1 bg-neutral-100 rounded-lg w-fit">
                    {(['ca', 'es', 'en'] as const).map((lang) => (
                        <button
                            key={lang}
                            type="button"
                            onClick={() => setActiveLang(lang)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeLang === lang
                                ? 'bg-white text-neutral-900 shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <Globe size={18} aria-hidden="true" />
                    <p className="text-xs font-medium">
                        {t('admin.settings.editing_lang', 'Estàs editant la versió en')}{' '}
                        <span className="font-bold underline">{langName}</span>
                    </p>
                </div>

                <div className="space-y-2">
                    <label htmlFor="shop-confirmation" className="block text-sm font-bold text-neutral-700">
                        {t('admin.settings.shop.confirmation_message', 'Missatge de confirmació de reserva')}
                    </label>
                    <p className="text-xs text-neutral-500 italic">
                        {t('admin.settings.shop.confirmation_hint', "Aquest missatge apareixerà a la web un cop l'usuari finalitzi la seva reserva.")}
                    </p>
                    <textarea
                        id="shop-confirmation"
                        required
                        value={shop.translations?.[activeLang] || ""}
                        onChange={(e) => {
                            const newTranslations = { ...shop.translations };
                            newTranslations[activeLang] = e.target.value;
                            setShop({ ...shop, translations: newTranslations });
                        }}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-neutral-300 outline-none transition-all text-sm leading-relaxed"
                        placeholder={t('admin.settings.shop.confirmation_placeholder', 'Ex: Pots passar a recollir la teva comanda...')}
                    />
                </div>

                <hr className="border-neutral-100" />

                {/* Admin notification emails */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                            <Users size={16} aria-hidden="true" />
                            {t('admin.settings.shop.notification_emails', 'Emails per notificacions')}
                        </h4>
                        <button
                            type="button"
                            onClick={() => setShop({ ...shop, admin_emails: [...(shop.admin_emails || []), ""] })}
                            className="text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} /> {t('admin.settings.shop.add_email', 'Afegir email')}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {(shop.admin_emails || []).map((email, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    aria-label={`${t('admin.settings.shop.email', 'Email')} ${idx + 1}`}
                                    onChange={(e) => {
                                        const newEmails = [...shop.admin_emails];
                                        newEmails[idx] = e.target.value;
                                        setShop({ ...shop, admin_emails: newEmails });
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
                                    placeholder="admin@exemple.com"
                                />
                                <button
                                    type="button"
                                    aria-label={t('common.delete', 'Eliminar')}
                                    onClick={() => setShop({ ...shop, admin_emails: shop.admin_emails.filter((_, i) => i !== idx) })}
                                    className="p-2 text-neutral-400 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {(shop.admin_emails || []).length === 0 && (
                            <p className="text-xs text-neutral-400 italic">
                                {t('admin.settings.shop.no_emails', 'No hi ha emails configurats.')}
                            </p>
                        )}
                    </div>
                </div>

                <hr className="border-neutral-100" />

                {/* Product categories */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                            <ShoppingBag size={16} aria-hidden="true" />
                            {t('admin.settings.shop.categories', 'Categories de productes')}
                        </h4>
                        <button
                            type="button"
                            onClick={() => setShop({
                                ...shop,
                                categories: [
                                    ...(shop.categories || []),
                                    { id: `cat-${Date.now()}`, translations: { ca: "", es: "", en: "" } }
                                ]
                            })}
                            className="text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} /> {t('admin.settings.shop.add_category', 'Afegir categoria')}
                        </button>
                    </div>
                    <div className="space-y-4">
                        {(shop.categories || []).map((cat, idx) => (
                            <div key={cat.id} className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase">
                                            {t('admin.settings.shop.slug', 'Slug / ID')}
                                        </label>
                                        <input
                                            type="text"
                                            value={cat.id}
                                            onChange={(e) => {
                                                const newCats = [...shop.categories];
                                                newCats[idx] = { ...cat, id: e.target.value.toLowerCase().replace(/\s+/g, '-') };
                                                setShop({ ...shop, categories: newCats });
                                            }}
                                            className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-mono"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={t('common.delete', 'Eliminar')}
                                        onClick={() => setShop({ ...shop, categories: shop.categories.filter((_, i) => i !== idx) })}
                                        className="p-2 text-neutral-400 hover:text-red-500 self-end"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {(['ca', 'es', 'en'] as const).map(lang => (
                                        <div key={lang} className="space-y-1">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase">{lang.toUpperCase()}</label>
                                            <input
                                                type="text"
                                                value={cat.translations[lang]}
                                                onChange={(e) => {
                                                    const newCats = [...shop.categories];
                                                    newCats[idx] = { ...cat, translations: { ...cat.translations, [lang]: e.target.value } };
                                                    setShop({ ...shop, categories: newCats });
                                                }}
                                                className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs"
                                                placeholder={lang === 'ca' ? t('admin.settings.shop.category_name', 'Nom...') : ""}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {(shop.categories || []).length === 0 && (
                            <p className="text-xs text-neutral-400 italic">
                                {t('admin.settings.shop.no_categories', 'No hi ha categories configurades.')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
