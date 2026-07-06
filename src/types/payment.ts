export type PaymentConcept = 'extraescolar' | 'acollida' | 'soci' | 'llibres';

// Concepts in tab/generator order. Labels are Spanish (admin is forced to 'es').
export const PAYMENT_CONCEPTS: { value: PaymentConcept; label: string }[] = [
  { value: 'extraescolar', label: 'Extraescolares' },
  { value: 'acollida', label: 'Acollida' },
  { value: 'soci', label: 'Cuota socio' },
  { value: 'llibres', label: 'Libros' },
];

export const PAYMENT_CONCEPT_LABELS: Record<PaymentConcept, string> = {
  extraescolar: 'Extraescolares',
  acollida: 'Acollida',
  soci: 'Cuota socio',
  llibres: 'Libros',
};

export interface Payment {
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
  concept?: PaymentConcept;
  academic_year?: string;
  notes?: string;
  bank_reference?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
}
