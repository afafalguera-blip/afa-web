import { useEffect, useState } from 'react';
import { FinanceService, type FinanceTransaction } from '../../../services/FinanceService';
import { TrendingUp, TrendingDown, Wallet, Plus, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
// import { ca } from 'date-fns/locale';

export function FinanceDashboard() {
  const [stats, setStats] = useState({ balance: 0, income: 0, expenses: 0 });
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState<Partial<FinanceTransaction>>({
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: '',
    description: '',
    payment_method: 'cash',
    status: 'paid'
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const loadData = async () => {
    try {
      const t = await FinanceService.getTransactions();
      const s = await FinanceService.getStats();
      setTransactions(t);
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setNewTransaction({ type: 'income', date: new Date().toISOString().split('T')[0] });
      setUploadFile(null);
      loadData();
    } catch (error) {
      console.error(error);
      alert('Error guardant transacció');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Finances</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Nova Transacció
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Balanç Total</p>
            <p className="text-2xl font-bold">{stats.balance.toFixed(2)}€</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Ingressos</p>
            <p className="text-2xl font-bold">{stats.income.toFixed(2)}€</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-full bg-red-100 text-red-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Despeses</p>
            <p className="text-2xl font-bold">{stats.expenses.toFixed(2)}€</p>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Descripció</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Categoria</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Import</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregant...</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-sm text-slate-600">
                  {format(new Date(t.date), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{t.description}</td>
                <td className="px-6 py-4 text-sm text-slate-500 capitalize">{t.category}</td>
                <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{Number(t.amount).toFixed(2)}€
                </td>
                <td className="px-6 py-4 text-center">
                  {t.attachment_url && (
                    <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      <FileText className="w-4 h-4 mx-auto" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal - Basic Implementation */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nova Transacció</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipus</label>
                  <select 
                    className="w-full border rounded-lg p-2"
                    value={newTransaction.type}
                    onChange={e => setNewTransaction({...newTransaction, type: e.target.value as any})}
                  >
                    <option value="income">Ingrés</option>
                    <option value="expense">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data</label>
                  <input 
                    type="date"
                    className="w-full border rounded-lg p-2"
                    value={newTransaction.date}
                    onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripció</label>
                <input 
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={newTransaction.description}
                  onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Import (€)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full border rounded-lg p-2"
                    value={newTransaction.amount}
                    onChange={e => setNewTransaction({...newTransaction, amount: Number(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <input 
                    type="text"
                    list="categories"
                    className="w-full border rounded-lg p-2"
                    value={newTransaction.category}
                    onChange={e => setNewTransaction({...newTransaction, category: e.target.value})}
                    required
                  />
                  <datalist id="categories">
                    <option value="shop">Botiga</option>
                    <option value="invoice">Factura</option>
                    <option value="supplies">Material</option>
                    <option value="grant">Subvenció</option>
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Adjuntar Factura/Rebut (PDF/Img)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
                    <input 
                        type="file" 
                        accept="image/*,.pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    />
                    <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">
                        {uploadFile ? uploadFile.name : 'Click per pujar arxiu'}
                    </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel·lar</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
