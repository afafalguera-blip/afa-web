import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { FileText, Search, Filter } from 'lucide-react';
import type { FinanceTransaction, FinanceTypeFilter } from '../../../services/FinanceService';
import { AdminPagination, AdminTable, type AdminTableColumn } from '../common/AdminTable';

interface FinanceTransactionTableProps {
    transactions: FinanceTransaction[];
    loading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filterType: FinanceTypeFilter;
    onFilterChange: (type: FinanceTypeFilter) => void;
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}

export function FinanceTransactionTable({
    transactions,
    loading,
    searchQuery,
    onSearchChange,
    filterType,
    onFilterChange,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
}: FinanceTransactionTableProps) {
    const { t } = useTranslation();

    const columns: AdminTableColumn<FinanceTransaction>[] = [
        {
            key: 'date',
            header: t('admin.finances.date', 'Data'),
            className: 'whitespace-nowrap text-neutral-600',
            render: (tx) => format(new Date(tx.date), 'dd MMM yyyy', { locale: ca }),
        },
        {
            key: 'description',
            header: t('admin.finances.description', 'Descripció'),
            className: 'font-semibold text-neutral-900',
            render: (tx) => tx.description,
        },
        {
            key: 'category',
            header: t('admin.finances.category', 'Categoria'),
            render: (tx) => (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                    {tx.category}
                </span>
            ),
        },
        {
            key: 'amount',
            header: t('admin.finances.amount', 'Import'),
            className: 'text-right whitespace-nowrap',
            render: (tx) => (
                <span className={`font-black ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {tx.type === 'income' ? '+' : '-'}{Number(tx.amount).toFixed(2)}€
                </span>
            ),
        },
        {
            key: 'document',
            header: t('admin.finances.document', 'Doc'),
            className: 'text-center',
            render: (tx) => (tx.attachment_url ? (
                <a
                    href={tx.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center p-2 rounded-md text-neutral-700 hover:bg-neutral-100 transition-colors"
                    title={t('admin.finances.view_document', 'Veure document')}
                >
                    <FileText className="w-4 h-4" />
                </a>
            ) : (
                <span className="text-neutral-300">-</span>
            )),
        },
    ];

    return (
        <div className="space-y-4">
            {/* Table Controls */}
            <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <input
                        type="search"
                        aria-label={t('admin.finances.search_placeholder', 'Cerca per descripció o categoria...')}
                        placeholder={t('admin.finances.search_placeholder', 'Cerca per descripció o categoria...')}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="text-neutral-400 w-4 h-4 mr-1" aria-hidden="true" />
                    <div className="flex bg-neutral-100 p-1 rounded-lg w-full sm:w-auto">
                        {(['all', 'income', 'expense'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => onFilterChange(type)}
                                aria-pressed={filterType === type}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${filterType === type
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700'
                                    }`}
                            >
                                {t(`admin.finances.filter_${type}`, type.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <AdminTable
                columns={columns}
                rows={transactions}
                keyExtractor={(tx) => tx.id ?? `${tx.date}-${tx.description}`}
                loading={loading}
                emptyMessage={t('admin.finances.no_results', 'No s\'han trobat transaccions.')}
                footer={
                    <AdminPagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={onPageChange}
                        onPageSizeChange={onPageSizeChange}
                    />
                }
            />
        </div>
    );
}
