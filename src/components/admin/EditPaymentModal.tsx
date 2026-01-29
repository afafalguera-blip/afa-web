
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Payment {
  id?: string;
  student_name: string;
  student_surname: string;
  course: string;
  activities: string[];
  amount: number;
  due_date: string;
  payment_date?: string | null;
  status: 'paid' | 'pending' | 'overdue';
  payment_month?: number;
  payment_year?: number;
  notes?: string;
  bank_reference?: string;
}

interface EditPaymentModalProps {
  payment?: Payment;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Payment) => Promise<void>;
}

export function EditPaymentModal({ payment, isOpen, onClose, onSave }: EditPaymentModalProps) {
  const [formData, setFormData] = useState<Payment>({
    student_name: '',
    student_surname: '',
    course: '',
    activities: [],
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]); // For search

  useEffect(() => {
    if (payment) {
      setFormData({
        ...payment,
        payment_date: payment.payment_date 
            ? new Date(payment.payment_date).toISOString().split('T')[0] 
            : '',
        due_date: payment.due_date 
            ? new Date(payment.due_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
      });
    } else {
      // Reset for new entry
      setFormData({
        student_name: '',
        student_surname: '',
        course: '',
        activities: [],
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        payment_month: new Date().getMonth() + 1,
        payment_year: new Date().getFullYear()
      });
      // Load students for autocomplete if creating
      fetchStudents();
    }
  }, [payment, isOpen]);

  const fetchStudents = async () => {
    // Only fetch if we need to search (for new payments)
    if (students.length > 0) return;
    
    const { data } = await supabase
      .from('inscripcions')
      .select('students')
      .eq('status', 'alta');
      
    if (data) {
        // Flatten students
        const allStudents = data.flatMap((ins: any) => {
            return (ins.students || []).map((s: any) => ({
                name: s.name,
                surname: s.surname,
                course: s.course,
                activities: s.activities || []
            }));
        });
        setStudents(allStudents);
    }
  };

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = Number(e.target.value);
      if (idx >= 0 && students[idx]) {
          const s = students[idx];
          setFormData(prev => ({
              ...prev,
              student_name: s.name,
              student_surname: s.surname,
              course: s.course,
              activities: s.activities
          }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el pagament');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-gray-900">
             {payment ? 'Editar Pagament' : 'Registrar Nou Pagament'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Student Selection (Only if Creating) */}
          {!payment && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cercar Alumne (Opcional)</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={handleStudentSelect}
                    defaultValue=""
                  >
                      <option value="">-- Seleccionar Alumne --</option>
                      {students.map((s, idx) => (
                          <option key={idx} value={idx}>
                              {s.name} {s.surname} ({s.course})
                          </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Seleccionar un alumne omplirà automàticament les dades.</p>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom Alumne</label>
              <input
                type="text"
                required
                value={formData.student_name}
                onChange={e => setFormData({...formData, student_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cognoms</label>
              <input
                type="text"
                required
                value={formData.student_surname}
                onChange={e => setFormData({...formData, student_surname: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curs</label>
              <input
                type="text"
                value={formData.course}
                onChange={e => setFormData({...formData, course: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Import (€)</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Data Venciment</label>
               <input
                type="date"
                required
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none"
              />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Estat</label>
               <select
                 value={formData.status}
                 onChange={e => setFormData({...formData, status: e.target.value as any})}
                 className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none font-medium ${
                     formData.status === 'paid' ? 'text-green-600 bg-green-50' : 
                     formData.status === 'overdue' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
                 }`}
               >
                   <option value="pending">Pendent</option>
                   <option value="paid">Pagat</option>
                   <option value="overdue">Vençut</option>
               </select>
             </div>
             {formData.status === 'paid' && (
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Pagament</label>
                    <input
                        type="date"
                        value={formData.payment_date || ''}
                        onChange={e => setFormData({...formData, payment_date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none"
                    />
                 </div>
             )}
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Activitats (separades per coma)</label>
             <input
                type="text"
                value={formData.activities.join(', ')}
                onChange={e => setFormData({...formData, activities: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none text-sm"
                placeholder="Ex: Futbol, Anglès"
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Observacions</label>
            <textarea
                rows={3}
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none text-sm"
            />
          </div>

        </form>
        
        <div className="p-6 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel·lar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardant...' : 'Guardar Pagament'}
          </button>
        </div>
      </div>
    </div>
  );
}
