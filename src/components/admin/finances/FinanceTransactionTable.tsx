import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { FileText, Search, Filter } from 'lucide-react';
import type { FinanceTransaction } from '../../../services/FinanceService';

interface FinanceTransactionTableProps {
    transactions: FinanceTransaction[];
    loading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filterType: 'all' | 'income' | 'expense';
    onFilterChange: (type: 'all' | 'income' | 'expense') => void;
}

export function FinanceTransactionTable({
    transactions,
    loading,
    searchQuery,
    onSearchChange,
    filterType,
    onFilterChange,
}: FinanceTransactionTableProps) {
    const { t } = useTranslation();

    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || tx.type === filterType;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Table Controls */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('admin.finances.search_placeholder', 'Cerca per descripció o categoria...')}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="text-slate-400 w-4 h-4 mr-1" />
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto">
                        {(['all', 'income', 'expense'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => onFilterChange(type)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === type
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {t(`admin.finances.filter_${type}`, type.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table content */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 font-bold">{t('admin.finances.date', 'Data')}</th>
                            <th className="px-6 py-4 font-bold">{t('admin.finances.description', 'Descripció')}</th>
                            <th className="px-6 py-4 font-bold">{t('admin.finances.category', 'Categoria')}</th>
                            <th className="px-6 py-4 font-bold text-right">{t('admin.finances.amount', 'Import')}</th>
                            <th className="px-6 py-4 font-bold text-center">{t('admin.finances.document', 'Doc')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-6 py-4 h-12 bg-slate-50/50 dark:bg-slate-800/50" />
                                </tr>
                            ))
                        ) : filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    {t('admin.finances.no_results', 'No s\'han trobat transaccions.')}
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        {format(new Date(tx.date), 'dd MMM yyyy', { locale: ca })}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                        {tx.description}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                            {tx.category}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`}>
                                        {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toFixed(2)}€
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {tx.attachment_url ? (
                                            <a
                                                href={tx.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                                                title={t('admin.finances.view_document', 'Veure document')}
                                            >
                                                <FileText className="w-4 h-4" />
                                            </a>
                                        ) : (
                                            <span className="text-slate-300 dark:text-slate-600">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
