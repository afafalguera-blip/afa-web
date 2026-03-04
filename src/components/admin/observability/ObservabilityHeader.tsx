import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';

export function ObservabilityHeader() {
    const { t } = useTranslation();

    return (
        <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <History className="w-6 h-6 text-primary" />
                </div>
                {t('admin.observability.title', 'Auditoria del Sistema')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {t('admin.observability.subtitle', 'Rastreig de canvis i accions realitzades a la plataforma.')}
            </p>
        </div>
    );
}
