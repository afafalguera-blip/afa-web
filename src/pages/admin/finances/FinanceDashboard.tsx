import { useEffect, useState, useCallback, useMemo } from 'react';
import { usePagedFilters } from '../../../hooks/usePagedFilters';
import { useTranslation } from 'react-i18next';
import { Landmark } from 'lucide-react';
import {
  FinanceService,
  type FinanceFilters,
  type FinanceTransaction,
  type FinanceTypeFilter,
} from '../../../services/FinanceService';
import { ConfigService } from '../../../services/ConfigService';
import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { useToast } from '../../../components/common/Toast';
import { FinanceStats } from '../../../components/admin/finances/FinanceStats';
import { FinanceTransactionTable } from '../../../components/admin/finances/FinanceTransactionTable';
import { FinanceTransactionModal } from '../../../components/admin/finances/FinanceTransactionModal';

function emptyTransaction(): Partial<FinanceTransaction> {
  return {
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    description: '',
    payment_method: 'transfer',
    status: 'paid'
  };
}

export function FinanceDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [stats, setStats] = useState({ balance: 0, income: 0, expenses: 0 });
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FinanceTypeFilter>('all');
  const [years, setYears] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState<string>(''); // '' = all-time
  const [yearsReady, setYearsReady] = useState(false);

  const { page, setPage, pageSize, setPageSize } = usePagedFilters(
    `${academicYear} ${filterType} ${search}`
  );

  const [newTransaction, setNewTransaction] = useState<Partial<FinanceTransaction>>(emptyTransaction);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const filters: FinanceFilters = useMemo(
    () => ({ academicYear: academicYear || undefined, type: filterType, search: search || undefined }),
    [academicYear, filterType, search],
  );

  const loadData = useCallback(async () => {
    if (!yearsReady) return;
    try {
      setLoading(true);
      const [list, s] = await Promise.all([
        FinanceService.listTransactions({ page, pageSize, ...filters }),
        FinanceService.getStats(filters.academicYear)
      ]);
      setTransactions(list.rows);
      setTotal(list.total);
      setStats(s);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.finances.load_error', 'No s\'han pogut carregar les finances'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, toast, t, yearsReady]);

  // Initialise the year selector: default to the active season's course.
  useEffect(() => {
    (async () => {
      try {
        const [list, season] = await Promise.all([
          FinanceService.getAcademicYears(),
          ConfigService.getSeasonConfig(),
        ]);
        setYears(list);
        const preferred = season?.active_year && list.includes(season.active_year)
          ? season.active_year
          : (list[0] || '');
        setAcademicYear(preferred);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('admin.finances.load_error', 'No s\'han pogut carregar les finances'));
      } finally {
        setYearsReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the search box so typing does not hammer the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setNewTransaction(emptyTransaction());
    setUploadFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let attachment_url = '';
      if (uploadFile) {
        attachment_url = await FinanceService.uploadInvoice(uploadFile);
      }

      await FinanceService.addTransaction({
        ...newTransaction,
        attachment_url
      } as FinanceTransaction);

      setShowModal(false);
      resetForm();
      toast.success(t('admin.finances.save_success', 'Transacció desada'));
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.finances.save_error', 'Error guardant la transacció'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.finances.title', 'Finances')}
        subtitle={t('admin.finances.subtitle', 'Gestió econòmica i historial de transaccions')}
        icon={Landmark}
        loading={loading}
        onRefresh={loadData}
        onCreate={() => setShowModal(true)}
        createLabel={t('admin.finances.new_transaction', 'Nova Transacció')}
        actions={
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            aria-label={t('admin.finances.accounting_year', 'Curs comptable')}
            title={t('admin.finances.accounting_year', 'Curs comptable')}
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            <option value="">{t('admin.finances.all_years', 'Tots els cursos')}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      />

      <FinanceStats stats={stats} />

      <FinanceTransactionTable
        transactions={transactions}
        loading={loading}
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        filterType={filterType}
        onFilterChange={setFilterType}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <FinanceTransactionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        onSubmit={handleSubmit}
        transaction={newTransaction}
        setTransaction={setNewTransaction}
        uploadFile={uploadFile}
        setUploadFile={setUploadFile}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
