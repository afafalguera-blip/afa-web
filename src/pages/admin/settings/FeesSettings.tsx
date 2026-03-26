import { CreditCard, Plus, Trash2 } from "lucide-react";
import type { FeesConfig, PricingConfig } from "../../../services/ConfigService";

interface FeesSettingsProps {
    fees: FeesConfig;
    setFees: (fees: FeesConfig) => void;
    pricing: PricingConfig;
    setPricing: (pricing: PricingConfig) => void;
    activeLang: 'ca' | 'es' | 'en';
    setActiveLang: (lang: 'ca' | 'es' | 'en') => void;
}

export function FeesSettings({ fees, setFees, pricing, setPricing, activeLang, setActiveLang }: FeesSettingsProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="border-b border-slate-50 dark:border-slate-700 pb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <CreditCard size={20} className="text-primary" />
                    Quotes i Preus
                </h3>
                <p className="text-xs text-slate-500 mt-1">Configura la informació bancària i els preus de les activitats.</p>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Dades Bancàries</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">IBAN</label>
                        <input
                            type="text"
                            value={fees.iban}
                            onChange={(e) => setFees({ ...fees, iban: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-mono"
                            placeholder="ES00 0000 0000 0000 0000 0000"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Quota Anual (€)</label>
                        <input
                            type="number"
                            value={fees.annual_fee_amount}
                            onChange={(e) => setFees({ ...fees, annual_fee_amount: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
                            min={0}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Entitat Bancària</label>
                        <input
                            type="text"
                            value={fees.bank_name}
                            onChange={(e) => setFees({ ...fees, bank_name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Titular del Compte</label>
                        <input
                            type="text"
                            value={fees.account_holder}
                            onChange={(e) => setFees({ ...fees, account_holder: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Plantilla Concepte Transferència</label>
                    <input
                        type="text"
                        value={fees.payment_reference_template}
                        onChange={(e) => setFees({ ...fees, payment_reference_template: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
                        placeholder="ALTA [NOM ALUMNE]"
                    />
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700" />

            {/* Pricing Tiers */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Preus Activitats</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Configura els preus per soci / no-soci de cada tipus d'activitat.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Language Switcher */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                            {(['ca', 'es', 'en'] as const).map((lang) => (
                                <button
                                    key={lang}
                                    type="button"
                                    onClick={() => setActiveLang(lang)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeLang === lang
                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
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
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} /> Afegir
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {pricing.tiers.map((tier, idx) => (
                        <div key={tier.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                            <div className="flex items-center justify-between">
                                <input
                                    type="text"
                                    value={tier.label[activeLang]}
                                    onChange={(e) => {
                                        const newTiers = [...pricing.tiers];
                                        newTiers[idx] = { ...tier, label: { ...tier.label, [activeLang]: e.target.value } };
                                        setPricing({ ...pricing, tiers: newTiers });
                                    }}
                                    className="font-bold text-sm bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 outline-none pb-1 flex-1 mr-4"
                                    placeholder={`Nom de l'activitat (${activeLang.toUpperCase()})`}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPricing({ ...pricing, tiers: pricing.tiers.filter((_, i) => i !== idx) });
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Preu Soci (€)</label>
                                    <input
                                        type="number"
                                        value={tier.member_price}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, member_price: Number(e.target.value) };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Preu No Soci (€)</label>
                                    <input
                                        type="number"
                                        value={tier.non_member_price}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, non_member_price: Number(e.target.value) };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Horari</label>
                                    <input
                                        type="text"
                                        value={tier.schedule}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, schedule: e.target.value };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                                        placeholder="16:30-18:00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nota ({activeLang.toUpperCase()})</label>
                                    <input
                                        type="text"
                                        value={tier.note?.[activeLang] || ""}
                                        onChange={(e) => {
                                            const newTiers = [...pricing.tiers];
                                            newTiers[idx] = { ...tier, note: { ...(tier.note || { ca: "", es: "", en: "" }), [activeLang]: e.target.value } };
                                            setPricing({ ...pricing, tiers: newTiers });
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                                        placeholder="+ material"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
