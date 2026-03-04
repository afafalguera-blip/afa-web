import { supabase } from '../../lib/supabase';
import type { Inscription, InscriptionStatus, InscriptionStudent } from '../../types/inscription';

export type AdminUpdatePayload = Partial<Inscription> & {
    name?: string;
    surname?: string;
    course?: string;
    activities?: string[];
    parent_phone?: string;
    parent_email?: string;
};

export const AdminInscriptionsService = {
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
        .update({ students: students as unknown })
        .eq('id', id);

      if (error) throw error;
    } else {
      // Handle legacy flat data update
      const legacyUpdates: Record<string, unknown> = {};
      if (updates.name) legacyUpdates.student_name = updates.name;
      if (updates.surname) legacyUpdates.student_surname = updates.surname;
      if (updates.course) legacyUpdates.student_course = updates.course;
      if (updates.activities) legacyUpdates.selected_activities = updates.activities;
      if (updates.parent_phone) legacyUpdates.parent_phone = updates.parent_phone;
      if (updates.parent_email) legacyUpdates.parent_email = updates.parent_email;
      if (updates.afa_member !== undefined) legacyUpdates.afa_member = updates.afa_member;
      if (updates.status) legacyUpdates.status = updates.status;

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
  }
};
