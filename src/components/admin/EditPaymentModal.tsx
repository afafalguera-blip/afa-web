import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { useDirtyGuard } from '../../hooks/useDirtyGuard';
import { AdminPaymentsService } from '../../services/admin/AdminPaymentsService';
import type { InscriptionStudent } from '../../types/inscription';
import { getRegionalLanguageTag } from '../../utils/locale';
import { PAYMENT_CONCEPTS, type PaymentConcept } from '../../types/payment';

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
  concept?: PaymentConcept;
  notes?: string;
  bank_reference?: string;
}

interface EditPaymentModalProps {
  payment?: Payment;
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Payment) => Promise<void>;
  // Concept preselected for new payments (e.g. the active tab in PaymentsPage).
  defaultConcept?: PaymentConcept;
}

const FIELD_CLASS =
  'w-full px-3 py-2 border border-neutral-200 rounded-lg bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 outline-none transition-colors';
const LABEL_CLASS = 'block text-sm font-medium text-neutral-700 mb-1';

function emptyPayment(concept: PaymentConcept): Payment {
  return {
    student_name: '',
    student_surname: '',
    course: '',
    activities: [],
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    concept,
    payment_month: new Date().getMonth() + 1,
    payment_year: new Date().getFullYear()
  };
}

export function EditPaymentModal({ payment, isOpen, onClose, onSave, defaultConcept = 'extraescolar' }: EditPaymentModalProps) {
  const { toast } = useToast();
  const nativeDateLocale = getRegionalLanguageTag(
    typeof document !== 'undefined' ? document.documentElement.lang : undefined
  );
  const [formData, setFormData] = useState<Payment>(() => emptyPayment(defaultConcept));
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<InscriptionStudent[]>([]); // For search

  const isDirty = useMemo(
    () => !loading && JSON.stringify(formData) !== initialSnapshot,
    [formData, initialSnapshot, loading]
  );
  const { confirmDiscard } = useDirtyGuard(isOpen && isDirty);

  useEffect(() => {
    if (!isOpen) return;

    const next: Payment = payment
      ? {
          ...payment,
          concept: payment.concept ?? 'extraescolar',
          payment_date: payment.payment_date
            ? new Date(payment.payment_date).toISOString().split('T')[0]
            : '',
          due_date: payment.due_date
            ? new Date(payment.due_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        }
      : emptyPayment(defaultConcept);

    setFormData(next);
    setInitialSnapshot(JSON.stringify(next));
  }, [payment, isOpen, defaultConcept]);

  useEffect(() => {
    // Autocomplete list is only needed when creating a receipt from scratch.
    if (!isOpen || payment || students.length > 0) return;
    let cancelled = false;
    AdminPaymentsService.listActiveStudents()
      .then((list) => {
        if (!cancelled) setStudents(list);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'No s\'han pogut carregar els alumnes');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, payment, students.length, toast]);

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

  const requestClose = useCallback(async () => {
    if (await confirmDiscard()) onClose();
  }, [confirmDiscard, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar el pagament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={requestClose}
      title={payment ? 'Editar Pagament' : 'Registrar Nou Pagament'}
      size="lg"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={requestClose}
            className="px-3.5 py-2 rounded-md border border-neutral-300 bg-white text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancel·lar
          </button>
          <button
            type="submit"
            form="edit-payment-form"
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Guardant...' : 'Guardar Pagament'}
          </button>
        </>
      }
    >
      <form id="edit-payment-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Concept */}
        <div>
          <label className={LABEL_CLASS} htmlFor="payment-concept">Concepte</label>
          <select
            id="payment-concept"
            value={formData.concept ?? 'extraescolar'}
            onChange={e => setFormData({ ...formData, concept: e.target.value as PaymentConcept })}
            className={`${FIELD_CLASS} font-medium`}
          >
            {PAYMENT_CONCEPTS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Student Selection (Only if Creating) */}
        {!payment && (
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <label className={LABEL_CLASS} htmlFor="payment-student">Cercar Alumne (Opcional)</label>
            <select
              id="payment-student"
              className={FIELD_CLASS}
              onChange={handleStudentSelect}
              defaultValue=""
            >
              <option value="">-- Seleccionar Alumne --</option>
              {students.map((s, idx) => (
                <option key={`${s.name}-${s.surname}-${idx}`} value={idx}>
                  {s.name} {s.surname} ({s.course})
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-1">Seleccionar un alumne omplirà automàticament les dades.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="payment-name">Nom Alumne</label>
            <input
              id="payment-name"
              type="text"
              required
              value={formData.student_name}
              onChange={e => setFormData({ ...formData, student_name: e.target.value })}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="payment-surname">Cognoms</label>
            <input
              id="payment-surname"
              type="text"
              required
              value={formData.student_surname}
              onChange={e => setFormData({ ...formData, student_surname: e.target.value })}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="payment-course">Curs</label>
            <input
              id="payment-course"
              type="text"
              value={formData.course}
              onChange={e => setFormData({ ...formData, course: e.target.value })}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="payment-amount">Import (€)</label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              className={`${FIELD_CLASS} font-medium`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLASS} htmlFor="payment-due-date">Data Venciment</label>
            <input
              id="payment-due-date"
              type="date"
              lang={nativeDateLocale}
              required
              value={formData.due_date}
              onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor="payment-status">Estat</label>
            <select
              id="payment-status"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as Payment['status'] })}
              className={`${FIELD_CLASS} font-medium ${formData.status === 'paid' ? 'text-green-700 bg-green-50' :
                formData.status === 'overdue' ? 'text-red-700 bg-red-50' : 'text-amber-700 bg-amber-50'
                }`}
            >
              <option value="pending">Pendent</option>
              <option value="paid">Pagat</option>
              <option value="overdue">Vençut</option>
            </select>
          </div>
          {formData.status === 'paid' && (
            <div>
              <label className={LABEL_CLASS} htmlFor="payment-paid-date">Data Pagament</label>
              <input
                id="payment-paid-date"
                type="date"
                lang={nativeDateLocale}
                value={formData.payment_date || ''}
                onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                className={FIELD_CLASS}
              />
            </div>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="payment-activities">
            {formData.concept === 'extraescolar'
              ? 'Activitats (separades per coma)'
              : 'Concepte / Detall (separat per coma)'}
          </label>
          <input
            id="payment-activities"
            type="text"
            value={formData.activities.join(', ')}
            onChange={e => setFormData({ ...formData, activities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            className={`${FIELD_CLASS} text-sm`}
            placeholder={formData.concept === 'acollida' ? 'Ex: Acollida matí' : formData.concept === 'llibres' ? 'Ex: Llibres socialització' : 'Ex: Futbol, Anglès'}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="payment-notes">Notes / Observacions</label>
          <textarea
            id="payment-notes"
            rows={3}
            value={formData.notes || ''}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className={`${FIELD_CLASS} text-sm`}
          />
        </div>
      </form>
    </Modal>
  );
}
