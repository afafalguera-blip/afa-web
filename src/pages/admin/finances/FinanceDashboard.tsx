import { useEffect, useState, useCallback } from 'react';
import { FinanceService, type FinanceTransaction } from '../../../services/FinanceService';
import { FinanceHeader } from '../../../components/admin/finances/FinanceHeader';
import { FinanceStats } from '../../../components/admin/finances/FinanceStats';
import { FinanceTransactionTable } from '../../../components/admin/finances/FinanceTransactionTable';
import { FinanceTransactionModal } from '../../../components/admin/finances/FinanceTransactionModal';

export function FinanceDashboard() {
  const [stats, setStats] = useState({ balance: 0, income: 0, expenses: 0 });
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const [newTransaction, setNewTransaction] = useState<Partial<FinanceTransaction>>({
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    description: '',
    payment_method: 'transfer',
    status: 'paid'
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [t, s] = await Promise.all([
        FinanceService.getTransactions(),
        FinanceService.getStats()
      ]);
      setTransactions(t);
      setStats(s);
    } catch (e) {
      console.error('Error loading finance data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      await loadData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error guardant transacció. Si us plau, revisa la consola.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTransaction({
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: '',
      description: '',
      payment_method: 'transfer',
      status: 'paid'
    });
    setUploadFile(null);
  };

  return (
    <div className="animate-in fade-in duration-700">
      <FinanceHeader onNewTransaction={() => setShowModal(true)} />

      <FinanceStats stats={stats} />

      <FinanceTransactionTable
        transactions={transactions}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
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
