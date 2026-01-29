/**
 * @fileoverview Pure logic functions for inscription filtering
 * These functions are framework-agnostic and can be easily tested
 */

import type { InscriptionRaw, InscriptionFlat, InscriptionFilters } from '../types/inscription';
import { INSCRIPTION_STATUS, STATUS_FILTER } from '../constants/status';

/**
 * Flattens raw inscription data into a normalized format for display
 * Handles both new format (students array) and legacy format (single student fields)
 * 
 * @param inscriptions - Raw inscription data from Supabase
 * @returns Flattened array with one row per student
 */
export function flattenInscriptions(inscriptions: InscriptionRaw[]): InscriptionFlat[] {
  return inscriptions.flatMap((item) => {
    // New format: inscription has students array
    if (item.students && item.students.length > 0) {
      return item.students.map((student) => ({
        inscription_id: item.id,
        created_at: item.created_at,
        parent_phone: item.parent_phone,
        parent_email: item.parent_email,
        afa_member: item.afa_member,
        name: student.name,
        surname: student.surname,
        course: student.course,
        activities: student.activities,
        status: INSCRIPTION_STATUS.ACTIVE as InscriptionFlat['status'],
        suspended: false,
      }));
    }

    // Legacy format: single student fields directly on inscription
    return [{
      inscription_id: item.id,
      created_at: item.created_at,
      parent_phone: item.parent_phone,
      parent_email: item.parent_email,
      afa_member: item.afa_member,
      name: item.student_name ?? '',
      surname: item.student_surname ?? '',
      course: item.student_course ?? '',
      activities: item.selected_activities ?? [],
      status: (item.status ?? INSCRIPTION_STATUS.ACTIVE) as InscriptionFlat['status'],
      suspended: item.suspended ?? false,
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
    const matchesActivity = !activity || (
      Array.isArray(item.activities)
        ? item.activities.includes(activity)
        : item.activities === activity
    );

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
