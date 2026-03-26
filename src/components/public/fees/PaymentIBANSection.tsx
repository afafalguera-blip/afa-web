import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, CheckCircle, Copy, HelpCircle } from 'lucide-react';
import { ConfigService, type FeesConfig } from '../../../services/ConfigService';

export function PaymentIBANSection() {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [fees, setFees] = useState<FeesConfig | null>(null);

    useEffect(() => {
        ConfigService.getFeesConfig().then(setFees);
    }, []);

    const iban = fees?.iban || "ES22 0081 1604 7400 0103 8208";

    const copyToClipboard = () => {
        navigator.clipboard.writeText(iban);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Landmark className="w-6 h-6 text-primary" />
                {t('fees_page.transfer_info_title', 'Informació per a la Transferència')}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t('fees_page.iban_label', 'codi iban')}
                        </label>
                        <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 items-center justify-between group">
                            <code className="text-lg md:text-xl font-mono font-bold text-slate-700 dark:text-slate-200 break-all">
                                {iban}
                            </code>
                            <button
                                onClick={copyToClipboard}
                                className={`ml-4 p-3 rounded-xl transition-all ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-primary hover:text-white'
                                    }`}
                                title={t('fees_page.copy_iban', 'Copiar IBAN')}
                            >
                                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex gap-4">
                        <HelpCircle className="w-6 h-6 text-amber-600 shrink-0" />
                        <div className="space-y-2">
                            <p className="font-bold text-amber-900 dark:text-amber-200 text-sm uppercase tracking-wide">
                                {t('fees_page.important_label', 'IMPORTANT')}
                            </p>
                            <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                                {t('fees_page.important_text', 'Recordeu incloure el nom de l\'alumne com a concepte.')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                            {t('fees_page.entity_label', 'Entitat')}
                        </p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{fees?.bank_name || "Banco Sabadell"}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-2">
                            {t('fees_page.holder_label', 'Titular')}
                        </p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">{fees?.account_holder || "AFA Escola Falguera"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
