import { useTranslation } from 'react-i18next';

export function FeeHighlightCard() {
    const { t } = useTranslation();

    return (
        <div className="bg-gradient-to-br from-secondary to-green-600 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-center items-center text-center">
            <span className="text-secondary-foreground/80 font-bold uppercase tracking-widest text-sm mb-2">
                {t('fees_page.annual_quota', 'Quota Anual')}
            </span>
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-6xl font-black">26</span>
                <span className="text-2xl font-bold">€</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed max-w-[240px]">
                {t('fees_page.single_payment', 'Pagament únic per família')}
            </p>
            <div className="mt-8 pt-6 border-t border-white/20 w-full">
                <p className="text-xs font-medium text-white/60 mb-1 italics">
                    {t('fees_page.payment_ref_label', 'Concepte de transferència:')}
                </p>
                <p className="text-sm font-bold">
                    {t('fees_page.payment_ref_value', 'ALTA [NOM ALUMNE]')}
                </p>
            </div>
        </div>
    );
}
