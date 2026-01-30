import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Search, Plus, CheckCircle, XCircle, Download, Edit, Trash2 } from 'lucide-react';
import { EditPaymentModal } from '../../../components/admin/EditPaymentModal';
import { ExportService } from '../../../services/ExportService';

interface Payment {
  id: string;
  student_name: string;
  student_surname: string;
  course: string;
  activities: string[];
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: 'paid' | 'pending' | 'overdue';
  payment_month: number;
  payment_year: number;
  notes?: string;
  bank_reference?: string;
}

export function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>(undefined);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('due_date', { ascending: false });

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

  const handleSavePayment = async (formData: any) => {
      try {
          if (editingPayment) {
              const { error } = await supabase
                .from('payments')
                .update({ 
                    ...formData, 
                    // Ensure arrays and dates are formatted if needed by Supabase (usually auto)
                 })
                .eq('id', editingPayment.id);
               if (error) throw error;
          } else {
              const { error } = await supabase
                .from('payments')
                .insert([{
                    ...formData,
                    payment_month: new Date(formData.due_date).getMonth() + 1,
                    payment_year: new Date(formData.due_date).getFullYear()
                }]);
               if (error) throw error;
          }
          fetchPayments();
      } catch (err) {
          console.error(err);
          throw err;
      }
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

  // Stats
  const totalAmount = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const paidAmount = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  const filteredPayments = payments.filter(p => {
    const st = getStatus(p);
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

  if (loading) return <div className="p-8 text-center">{t('admin.payments.loading')}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('admin.payments.title')}</h1>
          <p className="text-slate-500">{t('admin.payments.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
                onClick={() => ExportService.exportPaymentsCSV(payments, 'pagaments')}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500">{t('admin.payments.stats.total')}</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{totalAmount.toFixed(2)}€</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500">{t('admin.payments.stats.paid')}</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{paidAmount.toFixed(2)}€</div>
          <div className="text-xs text-slate-400 mt-1">{t('admin.payments.stats.percentage_hint', { percentage: ((paidAmount/totalAmount || 0)*100).toFixed(0) })}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500">{t('admin.payments.stats.pending')}</div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{pendingAmount.toFixed(2)}€</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder={t('admin.payments.search_placeholder')} 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>

        <select 
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white font-medium"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
        >
          <option value="all">{t('admin.payments.all_months')}</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              {new Date(0, i).toLocaleString(i18n.language === 'es' ? 'es-ES' : 'ca-ES', { month: 'long' })}
            </option>
          ))}
        </select>
        
        <select 
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white font-medium"
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700 text-sm">{t('admin.payments.table.student')}</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-sm">{t('admin.payments.table.concept')}</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-sm">{t('admin.payments.table.amount')}</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-sm">{t('admin.payments.table.due_date')}</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-sm">{t('admin.payments.table.status')}</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-sm">{t('admin.payments.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPayments.map((payment) => {
                const st = getStatus(payment);
                return (
              <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{payment.student_name} {payment.student_surname}</div>
                  <div className="text-xs text-slate-500">{payment.course}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  <div className="flex flex-wrap gap-1">
                    {payment.activities && Array.isArray(payment.activities) && payment.activities.map(act => (
                        <span key={act} className="text-xs bg-slate-100 px-1 rounded">{act}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {Number(payment.amount).toFixed(2)}€
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(payment.due_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    st === 'paid' ? 'bg-green-50 text-green-700' :
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
            )})}
          </tbody>
        </table>
        {filteredPayments.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            {t('admin.payments.table.no_results')}
          </div>
        )}
      </div>

      <EditPaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePayment}
        payment={editingPayment}
      />
    </div>
  );
}
