import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

interface FinanceHeaderProps {
    onNewTransaction: () => void;
}

export function FinanceHeader({ onNewTransaction }: FinanceHeaderProps) {
    const { t } = useTranslation();

    return (
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t('admin.finances.title', 'Finances')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {t('admin.finances.subtitle', 'Gestió econòmica i historial de transaccions')}
                </p>
            </div>
            <button
                onClick={onNewTransaction}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm hover:shadow-md active:scale-95"
            >
                <Plus className="w-4 h-4" />
                <span className="font-medium">{t('admin.finances.new_transaction', 'Nova Transacció')}</span>
            </button>
        </div>
    );
}
