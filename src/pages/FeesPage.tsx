import { useTranslation } from 'react-i18next';
import { CreditCard, CheckCircle, Info, Heart } from 'lucide-react';
import { FeeHighlightCard } from '../components/public/fees/FeeHighlightCard';
import { PaymentIBANSection } from '../components/public/fees/PaymentIBANSection';

export default function FeesPage() {
    const { t } = useTranslation();

    // Ensuring correct type for translations array
    const purposeList = t('fees_page.purpose_list', { returnObjects: true });
    const items = Array.isArray(purposeList) ? purposeList : [];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 pt-4">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-secondary/10 rounded-full mb-2">
                    <CreditCard className="w-8 h-8 text-secondary" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {t('fees_page.title', 'Cuota de Soci AFA')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                    {t('fees_page.subtitle', 'Ajuada\'ns a millorar l\'escola per als nostres fills i filles.')}
                </p>
            </div>

            {/* Main Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Heart className="w-24 h-24" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-secondary" /> {t('fees_page.purpose_title', 'Per a què serveix?')}
                    </h2>
                    <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        <p>
                            {t('fees_page.purpose_text', 'La quota del AFA es destina íntegrament a projectes que beneficien a tota la comunitat escolar:')}
                        </p>
                        <ul className="space-y-2">
                            {items.map((item: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <FeeHighlightCard />
            </div>

            {/* Payment Information */}
            <PaymentIBANSection />

            {/* Footer Note */}
            <div className="text-center py-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 text-xs font-medium italic">
                    {t('fees_page.footer_note', 'Tots els pagaments es revisen manualment. Pels dubtes, contacteu amb l\'AFA.')}
                </p>
            </div>
        </div>
    );
}
