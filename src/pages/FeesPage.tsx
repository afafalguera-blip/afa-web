import { useTranslation } from 'react-i18next';
import { CreditCard, Copy, CheckCircle, Info, Landmark, HelpCircle, Heart } from 'lucide-react';
import { useState } from 'react';

export default function FeesPage() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const IBAN = "ES22 0081 1604 7400 0103 8208";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(IBAN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const purposeList = t('fees_page.purpose_list', { returnObjects: true }) as string[];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 pt-4">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-secondary/10 rounded-full mb-2">
            <CreditCard className="w-8 h-8 text-secondary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('fees_page.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
          {t('fees_page.subtitle')}
        </p>
      </div>

      {/* Main Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Heart className="w-24 h-24" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-secondary" /> {t('fees_page.purpose_title')}
            </h2>
            <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                    {t('fees_page.purpose_text')}
                </p>
                <ul className="space-y-2">
                    {Array.isArray(purposeList) && purposeList.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        <div className="bg-gradient-to-br from-secondary to-green-600 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center items-center text-center">
            <span className="text-secondary-foreground/80 font-bold uppercase tracking-widest text-sm mb-2">{t('fees_page.annual_quota')}</span>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-6xl font-black">26</span>
                <span className="text-2xl font-bold">€</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed max-w-[240px]">
                {t('fees_page.single_payment')}
            </p>
            <div className="mt-8 pt-6 border-t border-white/20 w-full">
                <p className="text-xs font-medium text-white/60 mb-1 italics">{t('fees_page.payment_ref_label')}</p>
                <p className="text-sm font-bold">{t('fees_page.payment_ref_value')}</p>
            </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" /> {t('fees_page.transfer_info_title')}
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('fees_page.iban_label')}</label>
                    <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 items-center justify-between group">
                        <code className="text-lg md:text-xl font-mono font-bold text-slate-700 dark:text-slate-200 break-all">
                            {IBAN}
                        </code>
                        <button 
                            onClick={copyToClipboard}
                            className={`ml-4 p-3 rounded-xl transition-all ${
                                copied 
                                ? 'bg-green-500 text-white' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-primary hover:text-white'
                            }`}
                            title={t('fees_page.copy_iban')}
                        >
                            {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex gap-4">
                    <HelpCircle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div className="space-y-2">
                        <p className="font-bold text-amber-900 dark:text-amber-200 text-sm uppercase tracking-wide">{t('fees_page.important_label')}</p>
                        <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                            {t('fees_page.important_text')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">{t('fees_page.entity_label')}</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200">Banco Sabadell</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">{t('fees_page.holder_label')}</p>
                    <p className="font-bold text-slate-700 dark:text-slate-200">AFA Escola Falguera</p>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center py-6 border-t border-slate-100 dark:border-slate-800">
          <p className="text-slate-400 text-xs font-medium italic">
              {t('fees_page.footer_note')}
          </p>
      </div>
    </div>
  );
}
