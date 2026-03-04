import { supabase } from '../lib/supabase';
import type { Inscription, InscriptionStatus, InscriptionStudent } from '../types/inscription';

export type AdminUpdatePayload = Partial<Inscription> & {
    name?: string;
    surname?: string;
    course?: string;
    activities?: string[];
    parent_phone?: string;
    parent_email?: string;
};

export const AdminService = {
  async getInscriptions(): Promise<Inscription[]> {
    const { data, error } = await supabase
      .from('inscripcions')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    return (data || []) as Inscription[];
  },

  async deleteInscription(id: number | string) {
    const { error } = await supabase
      .from('inscripcions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async updateStatus(id: number | string, status: InscriptionStatus) {
    const { error } = await supabase
      .from('inscripcions')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async updateInscription(id: number | string, updates: AdminUpdatePayload, studentIndex?: number) {
    if (studentIndex !== undefined && studentIndex >= 0) {
      // Handle JSON array update
      const { data: currentData, error: fetchError } = await supabase
        .from('inscripcions')
        .select('students')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const students = (currentData.students || []) as InscriptionStudent[];
      if (students[studentIndex]) {
        students[studentIndex] = { ...students[studentIndex], ...updates as Partial<InscriptionStudent> };
      }
      
      const { error } = await supabase
        .from('inscripcions')
        .update({ students: students as unknown }) // Use unknown instead of any to satisfy linting while maintaining Supabase compatibility for JSONB
        .eq('id', id);

      if (error) throw error;
    } else {
      // Handle legacy flat data update
      // Map 'name', 'surname' etc from updates to legacy columns if needed
      // The updates object is expected to have generic keys like name, surname.
      // We need to map them to student_name, student_surname if that's what legacy uses.
      // Based on previous files, legacy uses: student_name, student_surname, student_course, selected_activities (or similar)
      
      const legacyUpdates: Record<string, unknown> = {};
      if (updates.name) legacyUpdates.student_name = updates.name;
      if (updates.surname) legacyUpdates.student_surname = updates.surname;
      if (updates.course) legacyUpdates.student_course = updates.course;
      if (updates.activities) legacyUpdates.selected_activities = updates.activities;
      if (updates.parent_phone) legacyUpdates.parent_phone = updates.parent_phone;
      if (updates.parent_email) legacyUpdates.parent_email = updates.parent_email;
      if (updates.afa_member !== undefined) legacyUpdates.afa_member = updates.afa_member;
      if (updates.status) legacyUpdates.status = updates.status;

      // Add direct fields that might be in Partial<Inscription>
      const directFields: (keyof Inscription)[] = [
        'parent_name', 'parent_dni', 'parent_phone_1', 'parent_email_1',
        'parent_phone_2', 'parent_email_2', 'image_auth_consent',
        'can_leave_alone', 'authorized_pickup', 'health_info'
      ];
      
      directFields.forEach(field => {
        if (updates[field] !== undefined) {
          legacyUpdates[field] = updates[field];
        }
      });

      const { error } = await supabase
        .from('inscripcions')
        .update(legacyUpdates)
        .eq('id', id);

      if (error) throw error;
    }
    return true;
  },

  async toggleAfaMember(id: number | string, currentStatus: boolean) {
    const { error } = await supabase
      .from('inscripcions')
      .update({ afa_member: !currentStatus })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async generateMonthlyPayments(month: number, year: number) {
    // 1. Generate payments via RPC
    const { data, error } = await supabase.rpc('generate_monthly_payments_only_active', {
      p_month: month,
      p_year: year
    });
    if (error) throw error;

    // 2. Remove payments for students in 'baja' status
    await supabase.rpc('remove_baja_payments_for_month', {
      p_month: month,
      p_year: year
    });
    
    return data;
  },

  async deleteMonthlyPayments(month: number, year: number) {
    // Get IDs first to clean history
    const { data: payments, error: fetchError } = await supabase
      .from('payments')
      .select('id')
      .eq('payment_year', year)
      .eq('payment_month', month);
    
    if (fetchError) throw fetchError;
    const paymentIds = (payments || []).map(p => p.id);

    if (paymentIds.length > 0) {
       // Delete history
       await supabase
         .from('payment_history')
         .delete()
         .in('payment_id', paymentIds);
    }

    // Delete payments
    const { error: payError } = await supabase
      .from('payments')
      .delete()
      .eq('payment_year', year)
      .eq('payment_month', month);
    if (payError) throw payError;

    // Delete generation record
    await supabase
      .from('monthly_payment_generation')
      .delete()
      .eq('year', year)
      .eq('month', month);
    
    return true;
  }
};

