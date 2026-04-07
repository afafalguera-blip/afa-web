import { Wrench, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MAINTENANCE_EMAIL } from '../../utils/maintenance';

interface MaintenancePlaceholderProps {
    compact?: boolean;
}

export function MaintenancePlaceholder({ compact = false }: MaintenancePlaceholderProps) {
    const { t } = useTranslation();

    if (compact) {
        return (
            <div className="col-span-full py-8 text-center bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-dashed border-amber-200 dark:border-amber-800">
                <Wrench className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    {t('maintenance.section_unavailable')}
                </p>
                <a
                    href={`mailto:${MAINTENANCE_EMAIL}`}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-1 inline-flex items-center gap-1"
                >
                    <Mail size={10} />
                    {MAINTENANCE_EMAIL}
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center mb-6">
                <Wrench className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-3 text-center">
                {t('maintenance.page_title')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
                {t('maintenance.page_description')}
            </p>
            <a
                href={`mailto:${MAINTENANCE_EMAIL}`}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors shadow-lg shadow-amber-500/20"
            >
                <Mail size={16} />
                {MAINTENANCE_EMAIL}
            </a>
        </div>
    );
}
