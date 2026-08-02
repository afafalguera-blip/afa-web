/**
 * Inscription domain model.
 *
 * Canonical entity: `Inscription` (one row of `inscripcions`, one family,
 * N children in the `students` JSONB array).
 * `InscriptionFlat` is the ONLY derived shape (one row per child) and is
 * produced exclusively by `toFlat()` in `src/logic/inscriptionFilters.ts` —
 * never by hand-written duplication.
 */

export interface InscriptionStudent {
  name: string;
  surname: string;
  /** Course code as persisted by the public form: see `src/constants/courses.ts`. */
  course: string;
  activities: string[];
  suspended?: boolean;
  // Per-child additional info (moved out of the global inscription level).
  health_info?: string;
  image_auth_consent?: string; // 'si' | 'no'
  can_leave_alone?: boolean;
  is_falguera?: boolean;       // pertenece a la Escola Falguera (false = externo)
  external_school?: string | null; // escuela de procedencia si es externo
}

export type InscriptionStatus = 'active' | 'alta' | 'pending' | 'baja' | 'suspended';

/**
 * WHY THIS EXISTS: `inscripcions` predates the `students` JSONB column. Rows
 * created before that migration still store a single child in flat
 * `student_*` / `selected_activities` columns and the contact in
 * `parent_phone` / `parent_email` (no `_1` suffix).
 *
 * It is the INPUT contract of `normalizeInscription()` only. No component,
 * hook or service should consume `InscriptionRaw` directly — read
 * `Inscription` instead.
 */
export interface InscriptionRaw {
  id: string | number;
  created_at?: string;

  parent_name?: string;
  parent_dni?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_phone_1?: string;
  parent_email_1?: string;
  parent_phone_2?: string;
  parent_email_2?: string;

  status?: InscriptionStatus;
  afa_member?: boolean;

  students?: InscriptionStudent[];
  student_name?: string;
  student_surname?: string;
  student_course?: string;
  selected_activities?: string[];
  suspended?: boolean;

  image_auth_consent?: string;
  can_leave_alone?: boolean;
  authorized_pickup?: string;
  health_info?: string;
  conditions_accepted?: boolean;
  form_language?: string;
  academic_year?: string;
  extra_answers?: Record<string, string>;
}

/**
 * Canonical inscription. `id` is always a string: the service stringifies it at
 * the DB boundary so every consumer (React keys, `.eq('id', …)`, comparisons)
 * uses one type regardless of whether the column is bigint or uuid.
 */
export interface Inscription {
  id: string;
  created_at: string;
  parent_name: string;
  parent_dni: string;
  parent_phone_1: string;
  parent_email_1: string;
  parent_phone_2?: string;
  parent_email_2?: string;

  status: InscriptionStatus;

  /** JSONB array; always an array after normalisation (never undefined). */
  students: InscriptionStudent[];

  afa_member: boolean;
  image_auth_consent?: string;
  can_leave_alone?: boolean;
  authorized_pickup?: string;
  health_info?: string;
  conditions_accepted?: boolean;
  form_language?: string;
  academic_year?: string;
  extra_answers?: Record<string, string>;
}

/**
 * Derived view: one row per child. Built by `toFlat()`; used by exports, the
 * details modal and the pure filtering helpers.
 */
export interface InscriptionFlat {
  inscription_id: string;
  student_index: number;
  created_at: string;
  parent_name: string;
  parent_dni: string;
  parent_phone: string;
  parent_email: string;
  afa_member: boolean;
  name: string;
  surname: string;
  course: string;
  activities: string[];
  status: InscriptionStatus;
  suspended: boolean;
  // Per-child additional info (carried through for exports).
  health_info?: string;
  image_auth_consent?: string;
  can_leave_alone?: boolean;
  is_falguera?: boolean;
  external_school?: string | null;
  authorized_pickup?: string;
  extra_answers?: Record<string, string>;
}

/** Filters shared by the admin listing and the pure filtering helpers. */
export interface InscriptionFilters {
  course: string;
  activity: string;
  status: string;
  search: string;
}
