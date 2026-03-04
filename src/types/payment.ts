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
  notes?: string;
  bank_reference?: string;
}
