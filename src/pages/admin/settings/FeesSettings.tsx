import { CreditCard, Plus, Trash2 } from "lucide-react";
import type { FeesConfig, PricingConfig } from "../../../services/ConfigService";
import { SettingsSectionNote, ExternalPricesNote } from "./PricingNotices";
import { useSettingsT } from "./useSettingsT";

interface FeesSettingsProps {
    fees: FeesConfig;
    setFees: (fees: FeesConfig) => void;
    pricing: PricingConfig;
    setPricing: (pricing: PricingConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

export function FeesSettings({ fees, setFees, pricing, setPricing, activeLang, setActiveLang }: FeesSettingsProps) {
    const t = useSettingsT();

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-6">
                <div className="border-b border-neutral-100 pb-4">
                    <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <CreditCard size={18} className="text-neutral-700" />
                        {t('admin.settings.fees.title', 'Quota anual i dades bancàries')}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                        {t('admin.settings.fees.subtitle', "Import de soci i compte on es cobren les quotes.")}
                    </p>
                </div>

                <SettingsSectionNote
                    title={t('admin.settings.fees.note_title', "Quota anual de soci de l'AFA")}
                    body={t(
                        'admin.settings.fees.note_body',
                        "L'import i les dades bancàries es mostren al formulari d'inscripció públic i als correus de pagament. No intervé en la quota mensual de les extraescolars."
                    )}
                    consumedBy={t('admin.settings.fees.note_consumer', "Formulari d'inscripció i comunicacions de pagament")}
                />

                {/* Bank Details */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                        {t('admin.settings.fees.bank_section', 'Dades bancàries')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500">
                                {t('admin.settings.fees.iban', 'IBAN')}
                            </label>
                            <input
                                type="text"
                                value={fees.iban}
                                onChange={(e) => setFees({ ...fees, iban: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm font-mono"
                                placeholder="ES00 0000 0000 0000 0000 0000"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500">
                                {t('admin.settings.fees.annual_amount', 'Quota anual (€)')}
                            </label>
                            <input
                                type="number"
                                value={fees.annual_fee_amount}
                                onChange={(e) => setFees({ ...fees, annual_fee_amount: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
                                min={0}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500">
                                {t('admin.settings.fees.bank_name', 'Entitat bancària')}
                            </label>
                            <input
                                type="text"
                                value={fees.bank_name}
                                onChange={(e) => setFees({ ...fees, bank_name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500">
                                {t('admin.settings.fees.account_holder', 'Titular del compte')}
                            </label>
                            <input
                                type="text"
                                value={fees.account_holder}
                                onChange={(e) => setFees({ ...fees, account_holder: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500">
                            {t('admin.settings.fees.reference_template', 'Plantilla concepte de transferència')}
                        </label>
                        <input
                            type="text"
                            value={fees.payment_reference_template}
                            onChange={(e) => setFees({ ...fees, payment_reference_template: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
                            placeholder="ALTA [NOM ALUMNE]"
                        />
                    </div>
                </div>
            </div>

            {/* Pricing tiers — public display only */}
            <div className="bg-white rounded-xl p-6 border border-neutral-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-100 pb-4">
                    <div>
                        <h4 className="text-lg font-bold text-neutral-900">
                            {t('admin.settings.fees.tiers_title', 'Taula de preus publicada')}
                        </h4>
                        <p className="text-xs text-neutral-500 mt-1">
                            {t('admin.settings.fees.tiers_subtitle', "Text informatiu que es mostra a la web pública.")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex p-1 bg-neutral-100 rounded-lg">
                            {(['ca', 'es', 'en'] as const).map((lang) => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => setActiveLang(lang)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeLang === lang
                                        ? 'bg-white text-neutral-900 shadow-sm'
                                        : 'text-neutral-400 hover:text-neutral-600'
                                        }`}
                                >
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const newTier = {
                                    id: `tier-${Date.now()}`,
                                    label: { ca: "", es: "", en: "" },
                                    schedule: "",
                                    member_price: 0,
                                    non_member_price: 0
                                };
                                setPricing({ ...pricing, tiers: [...pricing.tiers, newTier] });
                            }}
                            className="text-xs font-bold text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} /> {t('admin.settings.fees.add_tier', 'Afegir')}
                        </button>
                    </div>
                </div>

                <SettingsSectionNote
                    title={t('admin.settings.fees.tiers_note_title', 'Atenció: aquests preus són només informatius')}
                    body={t(
                        'admin.settings.fees.tiers_note_body',
                        "Serveixen per pintar la taula de preus de la web pública. NO s'utilitzen per calcular cap rebut: els imports que es cobren surten del preu de cada activitat i de les regles de quota mensual."
                    )}
                    consumedBy={t('admin.settings.fees.tiers_note_consumer', 'Pàgina pública de preus / activitats')}
                />

                <div className="space-y-4">
                    {pricing.tiers.map((tier, idx) => (
                        <div key={tier.id} className="p-5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
                            <div className="flex items-center justify-between">
                                <input
                                    type="text"
                                    value={tier.label[activeLang]}
                                    onChange={(e) => {
                                        const newTiers = [...pricing.tiers];
                                        newTiers[idx] = { ...tier, label: { ...tier.label, [activeLang]: e.target.value } };
                                        setPricing({ ...pricing, tiers: newTiers });
                                    }}
                                    className="font-bold text-sm bg-transparent border-b border-dashed border-neutral-300 outline-none pb-1 flex-1 mr-4"
                                    placeholder={`${t('admin.settings.fees.tier_name', "Nom de l'activitat")} (${activeLang.toUpperCase()})`}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPricing({ ...pricing, tiers: pricing.tiers.filter((_, i) => i !== idx) });
                                    }}
                                    className="p-1.5 text-neutral-400 hover:text-red-500"
                                    aria-label={t('common.delete', 'Eliminar')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                                        {t('admin.settings.fees.tier_member', 'Preu soci (€)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={tier.member_price}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, member_price: Number(e.target.value) };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm"
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                                        {t('admin.settings.fees.tier_non_member', 'Preu no soci (€)')}
                                    </label>
                                    <input
                                        type="number"
                                        value={tier.non_member_price}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, non_member_price: Number(e.target.value) };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm"
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                                        {t('admin.settings.fees.tier_schedule', 'Horari')}
                                    </label>
                                    <input
                                        type="text"
                                        value={tier.schedule}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, schedule: e.target.value };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm"
                                        placeholder="16:30-18:00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase">
                                        {t('admin.settings.fees.tier_note', 'Nota')} ({activeLang.toUpperCase()})
                                    </label>
                                    <input
                                        type="text"
                                        value={tier.note?.[activeLang] || ""}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, note: { ...(tier.note || { ca: "", es: "", en: "" }), [activeLang]: e.target.value } };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm"
                                        placeholder="+ material"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ExternalPricesNote />
        </div>
    );
}
