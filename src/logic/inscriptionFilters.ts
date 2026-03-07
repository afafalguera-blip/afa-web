/**
 * @fileoverview Pure logic functions for inscription filtering
 * These functions are framework-agnostic and can be easily tested
 */

import type {
  Inscription,
  InscriptionRaw,
  InscriptionFlat,
  InscriptionFilters,
  InscriptionStudent,
} from '../types/inscription';
import { INSCRIPTION_STATUS, STATUS_FILTER } from '../constants/status';

/**
 * Flattens raw inscription data into a normalized format for display
 * Handles both new format (students array) and legacy format (single student fields)
 *
 * @param inscriptions - Raw inscription data from Supabase
 * @returns Flattened array with one row per student
 */
export function flattenInscriptions(inscriptions: (Inscription | InscriptionRaw)[]): InscriptionFlat[] {
  return inscriptions.flatMap((item) => {
    // Normalize parent info (handle _1 suffix in Inscription vs optional in InscriptionRaw)
    const phone = ('parent_phone_1' in item ? item.parent_phone_1 : item.parent_phone) ?? '';
    const email = ('parent_email_1' in item ? item.parent_email_1 : item.parent_email) ?? '';

    // New format: inscription has students array
    if (Array.isArray(item.students) && item.students.length > 0) {
      const normalizedStatus = (item.status ?? INSCRIPTION_STATUS.ACTIVE) as InscriptionFlat['status'];

      return item.students.map((student: InscriptionStudent, studentIndex: number) => ({
        inscription_id: item.id,
        student_index: studentIndex,
        created_at: item.created_at || '',
        parent_phone: phone,
        parent_email: email,
        afa_member: item.afa_member ?? false,
        name: student.name,
        surname: student.surname,
        course: student.course,
        activities: Array.isArray(student.activities) ? student.activities : [],
        status: normalizedStatus,
        suspended: student.suspended ?? false,
      }));
    }

    // Legacy format: single student fields directly on inscription (mostly from InscriptionRaw)
    const legacy = item as InscriptionRaw;
    return [{
      inscription_id: item.id,
      created_at: item.created_at || '',
      parent_phone: phone,
      parent_email: email,
      afa_member: item.afa_member ?? false,
      name: legacy.student_name ?? '',
      surname: legacy.student_surname ?? '',
      course: legacy.student_course ?? '',
      activities: Array.isArray(legacy.selected_activities) ? legacy.selected_activities : [],
      status: (legacy.status ?? INSCRIPTION_STATUS.ACTIVE) as InscriptionFlat['status'],
      suspended: legacy.suspended ?? false,
    }];
  });
}

/**
 * Filters flattened inscriptions based on provided criteria
 *
 * @param data - Flattened inscription data
 * @param filters - Filter criteria (course, activity, status, search)
 * @returns Filtered array of inscriptions
 */
export function filterInscriptions(
  data: InscriptionFlat[],
  filters: InscriptionFilters
): InscriptionFlat[] {
  const { course, activity, status, search } = filters;
  const searchLower = search.toLowerCase();

  return data.filter((item) => {
    // Course filter
    const matchesCourse = !course || item.course === course;

    // Activity filter
    const matchesActivity = !activity || item.activities.includes(activity);

    // Status filter
    const matchesStatus = status === STATUS_FILTER.ALL || (
      status === STATUS_FILTER.BAJA
        ? item.status === INSCRIPTION_STATUS.BAJA
        : item.status !== INSCRIPTION_STATUS.BAJA
    );

    // Search filter (name, surname, email)
    const matchesSearch = !search || (
      item.name?.toLowerCase().includes(searchLower) ||
      item.surname?.toLowerCase().includes(searchLower) ||
      item.parent_email?.toLowerCase().includes(searchLower)
    );

    return matchesCourse && matchesActivity && matchesStatus && matchesSearch;
  });
}
