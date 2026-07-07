import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { ConfigService } from '../../../services/ConfigService';
import { AdminPaymentsService, type GenerateResult } from '../../../services/admin/AdminPaymentsService';
import { useTranslation } from 'react-i18next';
import { Search, Plus, CheckCircle, XCircle, Download, Edit, Trash2, Sparkles, ChevronDown, Loader2, UploadCloud } from 'lucide-react';
import { EditPaymentModal } from '../../../components/admin/EditPaymentModal';
import { BankImportModal } from '../../../components/admin/BankImportModal';
import { ExportService } from '../../../services/ExportService';
import { PAYMENT_CONCEPTS, PAYMENT_CONCEPT_LABELS, type Payment, type PaymentConcept } from '../../../types/payment';

const CONCEPT_BADGE: Record<PaymentConcept, string> = {
  extraescolar: 'bg-indigo-50 text-indigo-700',
  acollida: 'bg-teal-50 text-teal-700',
  soci: 'bg-purple-50 text-purple-700',
  llibres: 'bg-orange-50 text-orange-700',
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

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [conceptFilter, setConceptFilter] = useState<'all' | PaymentConcept>('all');
  const [academicYear, setAcademicYear] = useState('');
  const [years, setYears] = useState<string[]>([]);

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

  // Init: resolve cohorts present in payments, default to the active season.
  useEffect(() => {
    (async () => {
      const [{ data }, season] = await Promise.all([
        supabase.from('payments').select('academic_year'),
        ConfigService.getSeasonConfig(),
      ]);
      const list = [...new Set((data || []).map(r => r.academic_year).filter(Boolean) as string[])].sort().reverse();
      // Ensure the active season is always selectable even before any payment exists for it.
      if (season?.active_year && !list.includes(season.active_year)) list.unshift(season.active_year);
      setYears(list);
      const preferred = season?.active_year && list.includes(season.active_year)
        ? season.active_year
        : (list[0] || '');
      setAcademicYear(preferred);
    })();
  }, []);

  // Reload whenever the selected cohort changes (and on first run).
  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select('*')
        .order('due_date', { ascending: false });
      if (academicYear) query = query.eq('academic_year', academicYear);
      const { data, error } = await query;

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const paymentDate = newStatus === 'paid' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus, payment_date: paymentDate })
        .eq('id', id);

      if (error) throw error;
      fetchPayments(); // Refresh list
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(t('admin.payments.update_error'));
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

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.payments.delete_confirm'))) return;
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      alert(t('admin.payments.delete_error'));
    }
  };

  const handleSavePayment = async (formData: Partial<Payment>) => {
    try {
      if (editingPayment) {
        const { error } = await supabase
          .from('payments')
          .update({
            ...formData,
          })
          .eq('id', editingPayment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payments')
          .insert([{
            ...formData,
            payment_month: new Date(formData.due_date || '').getMonth() + 1,
            payment_year: new Date(formData.due_date || '').getFullYear()
          }]);
        if (error) throw error;
      }
      fetchPayments();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // --- Generation helpers ---------------------------------------------------
  const startYear = cohortStartYear(academicYear);

  const runGen = async (label: string, fn: () => Promise<GenerateResult>) => {
    setGenerating(true);
    try {
      const r = await fn();
      if (r.success) {
        alert(`${label}: ${r.payments_generated} rebuts.`);
        await fetchPayments();
      } else {
        alert(`${label}: ${r.message}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error en generar. Revisa la consola.');
    } finally {
      setGenerating(false);
      setGenOpen(false);
      setGenMode(null);
    }
  };

  const requireCohort = (): boolean => {
    if (!academicYear) { alert('Selecciona un curs concret per generar.'); return false; }
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

  const genSoci = () => {
    if (!requireCohort()) return;
    if (!confirm(`Generar quotes de soci per al curs ${academicYear}? (una per família sòcia)`)) return;
    runGen('Quotes soci', () => AdminPaymentsService.generateSoci(startYear));
  };

  const genBooks = () => {
    if (!requireCohort()) return;
    if (!confirm(`Generar cobraments de llibres per al curs ${academicYear}? (un per alumne segons el curs)`)) return;
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

  const filteredPayments = payments.filter(p => {
    const st = getStatus(p);
    if (conceptFilter !== 'all' && (p.concept || 'extraescolar') !== conceptFilter) return false;
    if (statusFilter !== 'all' && st !== statusFilter) return false;
    if (monthFilter !== 'all' && p.payment_month !== Number(monthFilter)) return false;

    if (filterText) {
      const search = filterText.toLowerCase();
      return (
        p.student_name.toLowerCase().includes(search) ||
        p.student_surname.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Stats (over the currently filtered set, so tabs/month narrow them too).
  const totalAmount = filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const paidAmount = filteredPayments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  // Per-concept counts for the tabs.
  const conceptCount = (c: PaymentConcept) => payments.filter(p => (p.concept || 'extraescolar') === c).length;

  if (loading) return <div className="p-8 text-center">{t('admin.payments.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('admin.payments.title')}</h1>
          <p className="text-neutral-500">{t('admin.payments.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Generate dropdown */}
          <div className="relative">
            <button
              onClick={() => setGenOpen(o => !o)}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generar <ChevronDown className="w-4 h-4" />
            </button>
            {genOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setGenOpen(false)} />
                <div className="absolute right-0 mt-1 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 py-1 text-sm">
                  <button onClick={() => openGenModal('extraescolar')} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                    Extraescolars: generar mes…
                  </button>
                  <button onClick={() => openGenModal('acollida')} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                    Acollida: duplicar mes…
                  </button>
                  <button onClick={genSoci} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                    Socis: generar quotes del curs
                  </button>
                  <button onClick={genBooks} className="w-full text-left px-4 py-2 hover:bg-neutral-50">
                    Llibres: generar cobraments del curs
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-sm"
          >
            <UploadCloud className="w-4 h-4" /> Importar extracto
          </button>
          <button
            onClick={() => ExportService.exportPaymentsCSV(filteredPayments, 'pagaments')}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('admin.payments.register_button')}
          </button>
        </div>
      </div>

      {/* Concept tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-neutral-200/50 rounded-lg">
        {([{ value: 'all' as const, label: 'Tots' }, ...PAYMENT_CONCEPTS]).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setConceptFilter(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${conceptFilter === value
              ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-neutral-200'
              : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            {label}
            {value !== 'all' && (
              <span className="text-xs font-semibold text-neutral-400">{conceptCount(value as PaymentConcept)}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
          <div className="text-sm font-medium text-neutral-500">{t('admin.payments.stats.total')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 mt-2">{totalAmount.toFixed(2)}€</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
          <div className="text-sm font-medium text-neutral-500">{t('admin.payments.stats.paid')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">{paidAmount.toFixed(2)}€</div>
          <div className="text-xs text-neutral-400 mt-1">{t('admin.payments.stats.percentage_hint', { percentage: ((paidAmount / totalAmount || 0) * 100).toFixed(0) })}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
          <div className="text-sm font-medium text-neutral-500">{t('admin.payments.stats.pending')}</div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 mt-2">{pendingAmount.toFixed(2)}€</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('admin.payments.search_placeholder')}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>

        <select
          className="px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white font-medium"
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          title="Curs"
        >
          <option value="">Tots els cursos</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          className="px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white font-medium"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
        >
          <option value="all">{t('admin.payments.all_months')}</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              {monthName(i + 1)}
            </option>
          ))}
        </select>

        <select
          className="px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white font-medium"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">{t('admin.payments.status_all')}</option>
          <option value="paid">{t('admin.payments.status.paid')}</option>
          <option value="pending">{t('admin.payments.status.pending')}</option>
          <option value="overdue">{t('admin.payments.status.overdue')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
        <table className="w-full text-left min-w-[760px]">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-neutral-700 text-sm">{t('admin.payments.table.student')}</th>
              <th className="px-6 py-4 font-semibold text-neutral-700 text-sm">{t('admin.payments.table.concept')}</th>
              <th className="px-6 py-4 font-semibold text-neutral-700 text-sm">{t('admin.payments.table.amount')}</th>
              <th className="px-6 py-4 font-semibold text-neutral-700 text-sm">{t('admin.payments.table.due_date')}</th>
              <th className="px-6 py-4 font-semibold text-neutral-700 text-sm">{t('admin.payments.table.status')}</th>
              <th className="px-6 py-4 font-semibold text-neutral-700 text-sm">{t('admin.payments.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredPayments.map((payment) => {
              const st = getStatus(payment);
              const concept = (payment.concept || 'extraescolar') as PaymentConcept;
              return (
                <tr key={payment.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900">{payment.student_name} {payment.student_surname}</div>
                    <div className="text-xs text-neutral-500">{payment.course}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    <span className={`inline-block mb-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${CONCEPT_BADGE[concept]}`}>
                      {PAYMENT_CONCEPT_LABELS[concept]}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {payment.activities && Array.isArray(payment.activities) && payment.activities.map(act => (
                        <span key={act} className="text-xs bg-neutral-100 px-1 rounded">{act}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                    {Number(payment.amount).toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {new Date(payment.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${st === 'paid' ? 'bg-green-50 text-green-700' :
                      st === 'overdue' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                      {st === 'paid' ? t('admin.payments.status.paid') : st === 'overdue' ? t('admin.payments.status.overdue') : t('admin.payments.status.pending')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePaymentStatus(payment.id, payment.status)}
                        className={`p-1.5 transition-colors rounded ${payment.status === 'paid' ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                        title={payment.status === 'paid' ? "Marcar com pendent" : "Marcar com pagat"}
                      >
                        {payment.status === 'paid' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(payment)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredPayments.length === 0 && (
          <div className="p-12 text-center text-neutral-500">
            {t('admin.payments.table.no_results')}
          </div>
        )}
      </div>

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
      {genMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-5">
            <h2 className="text-lg font-bold text-neutral-900">
              {genMode === 'extraescolar' ? 'Generar mensualitats extraescolars' : 'Duplicar rebuts d\'acollida'}
            </h2>
            <p className="text-sm text-neutral-500">Curs comptable: <strong>{academicYear}</strong></p>

            {genMode === 'acollida' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Copiar del mes</label>
                <select
                  value={genFromMonth}
                  onChange={e => setGenFromMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none capitalize"
                >
                  {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {genMode === 'acollida' ? 'Al mes' : 'Mes'}
              </label>
              <select
                value={genMonth}
                onChange={e => setGenMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none capitalize"
              >
                {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setGenMode(null)}
                className="px-4 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg"
              >
                Cancel·lar
              </button>
              <button
                onClick={genMode === 'extraescolar' ? genExtraescolar : genAcollidaRollover}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
