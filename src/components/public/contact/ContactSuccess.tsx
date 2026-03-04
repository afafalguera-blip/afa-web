import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';

interface ContactSuccessProps {
    onReset: () => void;
}

export function ContactSuccess({ onReset }: ContactSuccessProps) {
    const { t } = useTranslation();

    return (
        <div className="h-full flex flex-col items-center justify-center text-center py-8 md:py-12">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <CheckCircle2 size={24} className="md:w-8 md:h-8" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('contact_page.form_success', 'Missatge enviat correctament!')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                {t('contact_page.form_success_desc', 'Ens posarem en contacte amb tu el més aviat possible.')}
            </p>
            <button
                onClick={onReset}
                className="text-primary font-semibold hover:underline"
            >
                {t('contact_page.send_another', 'Enviar un altre missatge')}
            </button>
        </div>
    );
}
