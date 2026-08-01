/**
 * @fileoverview Pure logic for the inscription domain: legacy-row
 * normalisation, flattening and filtering. Framework-agnostic and unit-tested
 * in `src/tests/inscriptionFilters.test.ts`.
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
 * Converts a DB row (new `students` JSONB format or legacy flat `student_*`
 * columns) into the canonical `Inscription`.
 */
export function normalizeInscription(row: InscriptionRaw): Inscription {
  const students: InscriptionStudent[] =
    Array.isArray(row.students) && row.students.length > 0
      ? row.students.map((student) => ({
          ...student,
          activities: Array.isArray(student.activities) ? student.activities : [],
          // Legacy rows kept these at inscription level; fall back so the UI
          // and the exports never lose the data.
          health_info: student.health_info ?? row.health_info,
          image_auth_consent: student.image_auth_consent ?? row.image_auth_consent,
          can_leave_alone: student.can_leave_alone ?? row.can_leave_alone,
        }))
      : row.student_name || row.student_surname || row.student_course
        ? [
            {
              name: row.student_name ?? '',
              surname: row.student_surname ?? '',
              course: row.student_course ?? '',
              activities: Array.isArray(row.selected_activities) ? row.selected_activities : [],
              suspended: row.suspended ?? false,
              health_info: row.health_info,
              image_auth_consent: row.image_auth_consent,
              can_leave_alone: row.can_leave_alone,
            },
          ]
        : [];

  return {
    id: String(row.id),
    created_at: row.created_at ?? '',
    parent_name: row.parent_name ?? '',
    parent_dni: row.parent_dni ?? '',
    parent_phone_1: row.parent_phone_1 ?? row.parent_phone ?? '',
    parent_email_1: row.parent_email_1 ?? row.parent_email ?? '',
    parent_phone_2: row.parent_phone_2,
    parent_email_2: row.parent_email_2,
    status: row.status ?? INSCRIPTION_STATUS.ACTIVE,
    students,
    afa_member: row.afa_member ?? false,
    image_auth_consent: row.image_auth_consent,
    can_leave_alone: row.can_leave_alone,
    authorized_pickup: row.authorized_pickup,
    health_info: row.health_info,
    conditions_accepted: row.conditions_accepted,
    form_language: row.form_language,
    academic_year: row.academic_year,
    extra_answers: row.extra_answers,
  };
}

export function normalizeInscriptions(rows: InscriptionRaw[]): Inscription[] {
  return rows.map(normalizeInscription);
}

/**
 * Explodes inscriptions into one row per child. Single source of the flat
 * shape — replaces the interface duplication that used to exist.
 */
export function toFlat(inscriptions: Inscription[]): InscriptionFlat[] {
  return inscriptions.flatMap((item) =>
    item.students.map((student, studentIndex) => ({
      inscription_id: item.id,
      student_index: studentIndex,
      created_at: item.created_at,
      parent_name: item.parent_name,
      parent_dni: item.parent_dni,
      parent_phone: item.parent_phone_1,
      parent_email: item.parent_email_1,
      afa_member: item.afa_member,
      name: student.name,
      surname: student.surname,
      course: student.course,
      activities: Array.isArray(student.activities) ? student.activities : [],
      status: item.status,
      suspended: student.suspended ?? false,
      health_info: student.health_info ?? item.health_info,
      image_auth_consent: student.image_auth_consent ?? item.image_auth_consent,
      can_leave_alone: student.can_leave_alone ?? item.can_leave_alone,
      is_falguera: student.is_falguera,
      external_school: student.external_school,
      authorized_pickup: item.authorized_pickup,
      extra_answers: item.extra_answers,
    }))
  );
}

/** Convenience: DB rows straight to flat rows. */
export function flattenInscriptions(rows: InscriptionRaw[]): InscriptionFlat[] {
  return toFlat(normalizeInscriptions(rows));
}

function matchesStatusFilter(status: string, value: string): boolean {
  if (value === STATUS_FILTER.ALL || !value) return true;
  if (value === STATUS_FILTER.BAJA) return status === INSCRIPTION_STATUS.BAJA;
  if (value === STATUS_FILTER.ACTIVE) return status !== INSCRIPTION_STATUS.BAJA;
  return status === value;
}

/** Filters flattened rows (one per child). Used by exports and tests. */
export function filterInscriptions(
  data: InscriptionFlat[],
  filters: InscriptionFilters
): InscriptionFlat[] {
  const { course, activity, status, search } = filters;
  const searchLower = (search || '').toLowerCase();

  return data.filter((item) => {
    const matchesCourse = !course || item.course === course;
    const matchesActivity = !activity || item.activities.includes(activity);
    const matchesStatus = matchesStatusFilter(item.status, status);
    const matchesSearch =
      !searchLower ||
      item.name?.toLowerCase().includes(searchLower) ||
      item.surname?.toLowerCase().includes(searchLower) ||
      item.parent_name?.toLowerCase().includes(searchLower) ||
      item.parent_dni?.toLowerCase().includes(searchLower) ||
      item.parent_email?.toLowerCase().includes(searchLower) ||
      item.parent_phone?.toLowerCase().includes(searchLower);

    return matchesCourse && matchesActivity && matchesStatus && matchesSearch;
  });
}

/**
 * Filters at inscription level (the granularity of the admin listing and of
 * server-side pagination). An inscription matches when ANY of its children
 * matches the child-scoped criteria (course, activity) and the search term
 * hits either the family or any child.
 */
export function filterInscriptionList(
  inscriptions: Inscription[],
  filters: InscriptionFilters
): Inscription[] {
  const { course, activity, status, search } = filters;
  const searchLower = (search || '').toLowerCase();

  return inscriptions.filter((item) => {
    if (!matchesStatusFilter(item.status, status)) return false;

    if (course && !item.students.some((s) => s.course === course)) return false;
    if (activity && !item.students.some((s) => (s.activities || []).includes(activity))) return false;

    if (!searchLower) return true;

    const parentHit = [
      item.parent_name,
      item.parent_dni,
      item.parent_email_1,
      item.parent_email_2,
      item.parent_phone_1,
      item.parent_phone_2,
    ].some((value) => value?.toLowerCase().includes(searchLower));
    if (parentHit) return true;

    return item.students.some((s) =>
      [s.name, s.surname, s.course, ...(s.activities || [])].some((value) =>
        value?.toLowerCase().includes(searchLower)
      )
    );
  });
}

/** Distinct activity labels present in a set of inscriptions, sorted (ca). */
export function collectActivityOptions(inscriptions: Inscription[]): string[] {
  const set = new Set<string>();
  for (const inscription of inscriptions) {
    for (const student of inscription.students) {
      for (const activity of student.activities || []) {
        if (activity) set.add(activity);
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ca'));
}
