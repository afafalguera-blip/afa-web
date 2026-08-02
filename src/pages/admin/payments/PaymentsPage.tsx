import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagedFilters } from '../../../hooks/usePagedFilters';
import { ConfigService } from '../../../services/ConfigService';
import {
  AdminPaymentsService,
  type GenerateResult,
  type PaymentsFilters,
  type PaymentsSummary,
  type PaymentStatusFilter,
} from '../../../services/admin/AdminPaymentsService';
import { useTranslation } from 'react-i18next';
import { Search, CheckCircle, XCircle, Download, Edit, Trash2, Sparkles, ChevronDown, Loader2, UploadCloud, Wallet } from 'lucide-react';
import { EditPaymentModal } from '../../../components/admin/EditPaymentModal';
import { BankImportModal } from '../../../components/admin/BankImportModal';
import { AdminPageHeader } from '../../../components/admin/common/AdminPageHeader';
import { AdminPagination, AdminTable, type AdminTableColumn } from '../../../components/admin/common/AdminTable';
import { Modal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/Toast';
import { useConfirm } from '../../../components/common/ConfirmDialog';
import { ExportService } from '../../../services/ExportService';
import { PAYMENT_CONCEPTS, PAYMENT_CONCEPT_LABELS, type Payment, type PaymentConcept } from '../../../types/payment';

const CONCEPT_BADGE: Record<PaymentConcept, string> = {
  extraescolar: 'bg-indigo-50 text-indigo-700',
  acollida: 'bg-teal-50 text-teal-700',
  soci: 'bg-purple-50 text-purple-700',
  llibres: 'bg-orange-50 text-orange-700',
};

const EMPTY_CONCEPT_COUNTS: Record<PaymentConcept, number> = {
  extraescolar: 0,
  acollida: 0,
  soci: 0,
  llibres: 0,
};

// "2026-27" -> 2026. Falls back to the current calendar year.
function cohortStartYear(ay: string): number {
  const y = parseInt((ay || '').slice(0, 4), 10);
  return Number.isFinite(y) ? y : new Date().getFullYear();
}
// Spanish school year runs Sept..Aug: months 9-12 belong to startYear, 1-8 to the next.
function yearForMonth(month: number, startYear: number): number {
  return month >= 9 ? startYear : startYear + 1;
}

type GenMode = null | 'extraescolar' | 'acollida';

const SELECT_CLASS =
  'px-4 py-2 border border-neutral-200 rounded-lg bg-white font-medium text-neutral-800 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors';

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<PaymentsSummary>({ total: 0, paid: 0, pending: 0 });
  const [conceptCounts, setConceptCounts] = useState<Record<PaymentConcept, number>>(EMPTY_CONCEPT_COUNTS);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filterText, setFilterText] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [conceptFilter, setConceptFilter] = useState<'all' | PaymentConcept>('all');
  const [academicYear, setAcademicYear] = useState('');
  const [years, setYears] = useState<string[]>([]);
  const [yearsReady, setYearsReady] = useState(false);

  const { page, setPage, pageSize, setPageSize } = usePagedFilters(
    `${academicYear} ${conceptFilter} ${statusFilter} ${monthFilter} ${search}`
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>(undefined);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Generation State
  const [genOpen, setGenOpen] = useState(false);          // dropdown
  const [genMode, setGenMode] = useState<GenMode>(null);  // month-picker modal
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genFromMonth, setGenFromMonth] = useState(new Date().getMonth() + 1);
  const [generating, setGenerating] = useState(false);

  const filters: PaymentsFilters = useMemo(
    () => ({
      academicYear: academicYear || undefined,
      concept: conceptFilter,
      status: statusFilter,
      month: monthFilter === 'all' ? undefined : Number(monthFilter),
      search: search || undefined,
    }),
    [academicYear, conceptFilter, statusFilter, monthFilter, search],
  );

  // Init: resolve cohorts present in payments, default to the active season.
  useEffect(() => {
    (async () => {
      try {
        const [list, season] = await Promise.all([
          AdminPaymentsService.listAcademicYears(),
          ConfigService.getSeasonConfig(),
        ]);
        // Ensure the active season is always selectable even before any payment exists for it.
        if (season?.active_year && !list.includes(season.active_year)) list.unshift(season.active_year);
        setYears(list);
        const preferred = season?.active_year && list.includes(season.active_year)
          ? season.active_year
          : (list[0] || '');
        setAcademicYear(preferred);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('admin.payments.load_error', 'No s\'han pogut carregar els pagaments'));
      } finally {
        setYearsReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the search box so typing does not hammer the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(filterText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [filterText]);

  const fetchPayments = useCallback(async () => {
    if (!yearsReady) return;
    setLoading(true);
    try {
      const [list, stats, counts] = await Promise.all([
        AdminPaymentsService.listPayments({ page, pageSize, ...filters }),
        AdminPaymentsService.getPaymentsSummary(filters),
        AdminPaymentsService.countByConcept(filters.academicYear),
      ]);
      setPayments(list.rows);
      setTotal(list.total);
      setSummary(stats);
      setConceptCounts(counts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.payments.load_error', 'No s\'han pogut carregar els pagaments'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, toast, t, yearsReady]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const togglePaymentStatus = async (payment: Payment) => {
    const newStatus = payment.status === 'paid' ? 'pending' : 'paid';
    try {
      await AdminPaymentsService.setPaymentStatus(payment.id, newStatus);
      toast.success(
        newStatus === 'paid'
          ? t('admin.payments.marked_paid', 'Rebut marcat com a pagat')
          : t('admin.payments.marked_pending', 'Rebut marcat com a pendent'),
      );
      await fetchPayments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.payments.update_error'));
    }
  };

  const handleCreate = () => {
    setEditingPayment(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setIsModalOpen(true);
  };

  const handleDelete = async (payment: Payment) => {
    const ok = await confirm({
      title: t('admin.payments.delete_title', 'Eliminar rebut'),
      message: t('admin.payments.delete_confirm'),
      itemName: `${payment.student_name} ${payment.student_surname} · ${PAYMENT_CONCEPT_LABELS[(payment.concept || 'extraescolar') as PaymentConcept]} · ${Number(payment.amount).toFixed(2)}€`,
      destructive: true,
    });
    if (!ok) return;

    try {
      await AdminPaymentsService.deletePayment(payment.id);
      toast.success(t('admin.payments.delete_success', 'Rebut eliminat'));
      await fetchPayments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.payments.delete_error'));
    }
  };

  const handleSavePayment = async (formData: Partial<Payment>) => {
    if (editingPayment) {
      await AdminPaymentsService.updatePayment(editingPayment.id, formData);
    } else {
      await AdminPaymentsService.createPayment(formData);
    }
    toast.success(t('admin.payments.save_success', 'Pagament desat'));
    await fetchPayments();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Export the full filtered set, not just the visible page.
      const rows = await AdminPaymentsService.listPaymentsForExport(filters);
      ExportService.exportPaymentsCSV(rows, 'pagaments');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.payments.export_error', 'No s\'ha pogut exportar el CSV'));
    } finally {
      setExporting(false);
    }
  };

  // --- Generation helpers ---------------------------------------------------
  const startYear = cohortStartYear(academicYear);

  const runGen = async (label: string, fn: () => Promise<GenerateResult>) => {
    setGenerating(true);
    try {
      const r = await fn();
      if (r.success) {
        toast.success(`${label}: ${r.payments_generated} rebuts.`);
        await fetchPayments();
      } else {
        toast.error(`${label}: ${r.message}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('admin.payments.generate_error', 'Error en generar els rebuts'));
    } finally {
      setGenerating(false);
      setGenOpen(false);
      setGenMode(null);
    }
  };

  const requireCohort = (): boolean => {
    if (!academicYear) {
      toast.info(t('admin.payments.select_cohort', 'Selecciona un curs concret per generar.'));
      return false;
    }
    return true;
  };

  const genExtraescolar = () => {
    const year = yearForMonth(genMonth, startYear);
    runGen('Extraescolars', () => AdminPaymentsService.generateExtraescolar(genMonth, year));
  };

  const genAcollidaRollover = () => {
    const toMonth = genMonth;
    const fromMonth = genFromMonth;
    runGen('Acollida', () => AdminPaymentsService.rolloverAcollida(
      fromMonth, yearForMonth(fromMonth, startYear),
      toMonth, yearForMonth(toMonth, startYear),
    ));
  };

  const genSoci = async () => {
    if (!requireCohort()) return;
    setGenOpen(false);
    const ok = await confirm({
      title: t('admin.payments.generate_soci_title', 'Generar quotes de soci'),
      message: t('admin.payments.generate_soci_message', 'Es crearà una quota per cada família sòcia del curs seleccionat.'),
      itemName: academicYear,
    });
    if (!ok) return;
    runGen('Quotes soci', () => AdminPaymentsService.generateSoci(startYear));
  };

  const genBooks = async () => {
    if (!requireCohort()) return;
    setGenOpen(false);
    const ok = await confirm({
      title: t('admin.payments.generate_books_title', 'Generar cobraments de llibres'),
      message: t('admin.payments.generate_books_message', 'Es crearà un cobrament per cada alumne segons el seu curs.'),
      itemName: academicYear,
    });
    if (!ok) return;
    runGen('Llibres', () => AdminPaymentsService.generateBooks(startYear));
  };

  const openGenModal = (mode: Exclude<GenMode, null>) => {
    if (!requireCohort()) return;
    setGenOpen(false);
    setGenMode(mode);
  };

  const isOverdue = (p: Payment) => {
    if (p.status === 'paid') return false;
    if (!p.due_date) return false;
    return new Date(p.due_date) < new Date();
  };

  const getStatus = (p: Payment) => {
    if (p.status === 'paid') return 'paid';
    if (isOverdue(p)) return 'overdue';
    return 'pending';
  };

  const monthName = (m: number) =>
    new Date(0, m - 1).toLocaleString(i18n.language === 'es' ? 'es-ES' : 'ca-ES', { month: 'long' });

  const columns: AdminTableColumn<Payment>[] = [
    {
      key: 'student',
      header: t('admin.payments.table.student'),
      render: (payment) => (
        <div>
          <div className="font-medium text-neutral-900">{payment.student_name} {payment.student_surname}</div>
          <div className="text-xs text-neutral-500">{payment.course}</div>
        </div>
      ),
    },
    {
      key: 'concept',
      header: t('admin.payments.table.concept'),
      render: (payment) => {
        const concept = (payment.concept || 'extraescolar') as PaymentConcept;
        return (
          <div>
            <span className={`inline-block mb-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${CONCEPT_BADGE[concept]}`}>
              {PAYMENT_CONCEPT_LABELS[concept]}
            </span>
            <div className="flex flex-wrap gap-1">
              {payment.activities && Array.isArray(payment.activities) && payment.activities.map(act => (
                <span key={act} className="text-xs bg-neutral-100 px-1 rounded">{act}</span>
              ))}
            </div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: t('admin.payments.table.amount'),
      className: 'whitespace-nowrap font-medium text-neutral-900',
      render: (payment) => `${Number(payment.amount).toFixed(2)}€`,
    },
    {
      key: 'due_date',
      header: t('admin.payments.table.due_date'),
      className: 'whitespace-nowrap',
      render: (payment) => (payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '—'),
    },
    {
      key: 'status',
      header: t('admin.payments.table.status'),
      render: (payment) => {
        const st = getStatus(payment);
        return (
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${st === 'paid' ? 'bg-green-50 text-green-700' :
            st === 'overdue' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}>
            {st === 'paid' ? t('admin.payments.status.paid') : st === 'overdue' ? t('admin.payments.status.overdue') : t('admin.payments.status.pending')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: t('admin.payments.table.actions'),
      render: (payment) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => togglePaymentStatus(payment)}
            className={`p-1.5 transition-colors rounded ${payment.status === 'paid' ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
            title={payment.status === 'paid' ? 'Marcar com pendent' : 'Marcar com pagat'}
            aria-label={payment.status === 'paid' ? 'Marcar com pendent' : 'Marcar com pagat'}
          >
            {payment.status === 'paid' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => handleEdit(payment)}
            className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
            title="Editar"
            aria-label="Editar"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(payment)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AdminPageHeader
        title={t('admin.payments.title')}
        subtitle={t('admin.payments.subtitle')}
        icon={Wallet}
        loading={loading}
        onRefresh={fetchPayments}
        onCreate={handleCreate}
        createLabel={t('admin.payments.register_button')}
        actions={
          <>
            {/* Generate dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setGenOpen(o => !o)}
                disabled={generating}
                aria-haspopup="menu"
                aria-expanded={genOpen}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-200 bg-white text-neutral-700 text-[13px] font-medium hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {t('admin.payments.generate', 'Generar')} <ChevronDown className="w-4 h-4" />
              </button>
              {genOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setGenOpen(false)} />
                  <div role="menu" className="absolute right-0 mt-1 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 py-1 text-sm">
                    <button type="button" role="menuitem" onClick={() => openGenModal('extraescolar')} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                      Extraescolars: generar mes…
                    </button>
                    <button type="button" role="menuitem" onClick={() => openGenModal('acollida')} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                      Acollida: duplicar mes…
                    </button>
                    <button type="button" role="menuitem" onClick={genSoci} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                      Socis: generar quotes del curs
                    </button>
                    <button type="button" role="menuitem" onClick={genBooks} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                      Llibres: generar cobraments del curs
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-200 bg-white text-neutral-700 text-[13px] font-medium hover:bg-neutral-100 transition-colors"
            >
              <UploadCloud className="w-4 h-4" /> {t('admin.payments.import_statement', 'Importar extracte')}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-neutral-200 bg-white text-neutral-700 text-[13px] font-medium hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} CSV
            </button>
          </>
        }
      />

      {/* Concept tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-neutral-100 rounded-lg">
        {([{ value: 'all' as const, label: t('admin.payments.concept_all', 'Tots') }, ...PAYMENT_CONCEPTS]).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setConceptFilter(value)}
            aria-pressed={conceptFilter === value}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${conceptFilter === value
              ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200'
              : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {label}
            {value !== 'all' && (
              <span className="text-xs font-semibold text-neutral-400">{conceptCounts[value as PaymentConcept]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Cards — computed server-side over the whole filtered set */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="text-sm font-medium text-neutral-500">{t('admin.payments.stats.total')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 mt-2">{summary.total.toFixed(2)}€</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="text-sm font-medium text-neutral-500">{t('admin.payments.stats.paid')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">{summary.paid.toFixed(2)}€</div>
          <div className="text-xs text-neutral-400 mt-1">
            {t('admin.payments.stats.percentage_hint', { percentage: ((summary.paid / summary.total || 0) * 100).toFixed(0) })}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="text-sm font-medium text-neutral-500">{t('admin.payments.stats.pending')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 mt-2">{summary.pending.toFixed(2)}€</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            type="search"
            aria-label={t('admin.payments.search_placeholder')}
            placeholder={t('admin.payments.search_placeholder')}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>

        <select
          className={SELECT_CLASS}
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          aria-label={t('admin.payments.course', 'Curs')}
          title={t('admin.payments.course', 'Curs')}
        >
          <option value="">{t('admin.payments.all_courses', 'Tots els cursos')}</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          className={SELECT_CLASS}
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          aria-label={t('admin.payments.all_months')}
        >
          <option value="all">{t('admin.payments.all_months')}</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              {monthName(i + 1)}
            </option>
          ))}
        </select>

        <select
          className={SELECT_CLASS}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as PaymentStatusFilter)}
          aria-label={t('admin.payments.status_all')}
        >
          <option value="all">{t('admin.payments.status_all')}</option>
          <option value="paid">{t('admin.payments.status.paid')}</option>
          <option value="pending">{t('admin.payments.status.pending')}</option>
          <option value="overdue">{t('admin.payments.status.overdue')}</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        rows={payments}
        keyExtractor={(payment) => payment.id}
        loading={loading}
        emptyMessage={t('admin.payments.table.no_results')}
        footer={
          <AdminPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        }
      />

      <EditPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePayment}
        payment={editingPayment}
        defaultConcept={conceptFilter === 'all' ? 'extraescolar' : conceptFilter}
      />

      <BankImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onApplied={fetchPayments}
      />

      {/* Generation month-picker modal (extraescolar / acollida) */}
      <Modal
        open={genMode !== null}
        onClose={() => setGenMode(null)}
        title={genMode === 'acollida' ? 'Duplicar rebuts d\'acollida' : 'Generar mensualitats extraescolars'}
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setGenMode(null)}
              className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Cancel·lar
            </button>
            <button
              type="button"
              onClick={genMode === 'extraescolar' ? genExtraescolar : genAcollidaRollover}
              disabled={generating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-admin-accent hover:bg-admin-accent-hover text-white text-[13px] font-medium transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {t('admin.payments.generate', 'Generar')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-neutral-500">Curso contable: <strong className="text-neutral-900">{academicYear}</strong></p>

          {genMode === 'acollida' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="gen-from-month">Copiar del mes</label>
              <select
                id="gen-from-month"
                value={genFromMonth}
                onChange={e => setGenFromMonth(Number(e.target.value))}
                className={`${SELECT_CLASS} w-full capitalize`}
              >
                {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="gen-month">
              {genMode === 'acollida' ? 'Al mes' : 'Mes'}
            </label>
            <select
              id="gen-month"
              value={genMonth}
              onChange={e => setGenMonth(Number(e.target.value))}
              className={`${SELECT_CLASS} w-full capitalize`}
            >
              {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
