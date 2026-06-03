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
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {t('admin.finances.title', 'Finances')}
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400">
                    {t('admin.finances.subtitle', 'Gestió econòmica i historial de transaccions')}
                </p>
            </div>
            <button
                onClick={onNewTransaction}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm hover:shadow-sm active:scale-95"
            >
                <Plus className="w-4 h-4" />
                <span className="font-medium">{t('admin.finances.new_transaction', 'Nova Transacció')}</span>
            </button>
        </div>
    );
}
