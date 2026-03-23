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

type InscriptionsTableName = 'inscripcions' | 'inscriptions';
let detectedTable: InscriptionsTableName | null = null;

const isMissingRelationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  return err.code === '42P01' || (err.message || '').toLowerCase().includes('does not exist');
};

const runWithTableFallback = async <T>(
  operation: (table: InscriptionsTableName) => Promise<{ data: T; error: unknown }>
): Promise<T> => {
  const candidates: InscriptionsTableName[] = detectedTable
    ? [detectedTable, detectedTable === 'inscripcions' ? 'inscriptions' : 'inscripcions']
    : ['inscripcions', 'inscriptions'];

  let lastError: unknown = null;

  for (const table of candidates) {
    const { data, error } = await operation(table);
    if (!error) {
      detectedTable = table;
      return data;
    }

    lastError = error;
    if (!isMissingRelationError(error)) {
      throw error;
    }
  }

  throw lastError;
};

export const AdminInscriptionsService = {
  async getInscriptions(): Promise<Inscription[]> {
    const fetchTable = async (table: InscriptionsTableName) => {
      const result = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      return { data: (result.data || []) as Inscription[], error: result.error };
    };

    if (detectedTable) {
      const detectedResult = await fetchTable(detectedTable);
      if (!detectedResult.error) {
        return detectedResult.data;
      }

      if (!isMissingRelationError(detectedResult.error)) {
        throw detectedResult.error;
      }

      detectedTable = null;
    }

    const first = await fetchTable('inscripcions');
    if (!first.error && first.data.length > 0) {
      detectedTable = 'inscripcions';
      return first.data;
    }

    const second = await fetchTable('inscriptions');
    if (!second.error && second.data.length > 0) {
      detectedTable = 'inscriptions';
      return second.data;
    }

    if (!first.error && first.data.length === 0) {
      detectedTable = 'inscripcions';
      return first.data;
    }

    if (!second.error && second.data.length === 0) {
      detectedTable = 'inscriptions';
      return second.data;
    }

    if (first.error && !isMissingRelationError(first.error)) throw first.error;
    if (second.error && !isMissingRelationError(second.error)) throw second.error;

    const data = await runWithTableFallback<Inscription[] | null>(async (table) => {
      const result = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      return { data: result.data as Inscription[] | null, error: result.error };
    });

    return (data || []) as Inscription[];
  },

  async deleteInscription(id: number | string) {
    await runWithTableFallback<null>(async (table) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      return { data: null, error };
    });
    return true;
  },

  async updateStatus(id: number | string, status: InscriptionStatus) {
    await runWithTableFallback<null>(async (table) => {
      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq('id', id);

      return { data: null, error };
    });
    return true;
  },

  async updateInscription(id: number | string, updates: AdminUpdatePayload, studentIndex?: number) {
    if (studentIndex !== undefined && studentIndex >= 0) {
      // Handle JSON array update
      const currentData = await runWithTableFallback<{ students?: InscriptionStudent[] } | null>(async (table) => {
        const { data, error } = await supabase
          .from(table)
          .select('students')
          .eq('id', id)
          .single();

        return { data: data as { students?: InscriptionStudent[] } | null, error };
      });
      
      const students = (currentData?.students || []) as InscriptionStudent[];
      if (students[studentIndex]) {
        students[studentIndex] = { ...students[studentIndex], ...updates as Partial<InscriptionStudent> };
      }

      await runWithTableFallback<null>(async (table) => {
        const { error } = await supabase
          .from(table)
          .update({ students: students as unknown })
          .eq('id', id);

        return { data: null, error };
      });
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

      await runWithTableFallback<null>(async (table) => {
        const { error } = await supabase
          .from(table)
          .update(legacyUpdates)
          .eq('id', id);

        return { data: null, error };
      });
    }
    return true;
  },

  async toggleAfaMember(id: number | string, currentStatus: boolean) {
    await runWithTableFallback<null>(async (table) => {
      const { error } = await supabase
        .from(table)
        .update({ afa_member: !currentStatus })
        .eq('id', id);

      return { data: null, error };
    });
    return true;
  }
};
