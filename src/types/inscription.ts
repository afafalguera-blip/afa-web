export interface InscriptionStudent {
  name: string;
  surname: string;
  course: string;
  activities: string[];
  suspended?: boolean;
}

export type InscriptionStatus = 'active' | 'alta' | 'pending' | 'baja' | 'suspended';

/**
 * Raw/legacy shape used in parts of the admin dashboard and tests.
 * Supports both old flat student fields and new JSON students[] format.
 */
export interface InscriptionRaw {
  id: string | number;
  created_at: string;

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
}

export interface Inscription {
  id: string | number; // Treated as string/number across different admin flows
  created_at: string;
  parent_name: string;
  parent_dni: string;
  parent_phone_1: string;
  parent_email_1: string;
  parent_phone_2?: string;
  parent_email_2?: string;

  status: InscriptionStatus;

  // students is a JSONB array.
  students: InscriptionStudent[];

  // Extras
  afa_member: boolean;
  image_auth_consent?: string;
  can_leave_alone?: boolean;
  authorized_pickup?: string;
  health_info?: string;
  conditions_accepted?: boolean;
  form_language?: string;
}

/**
 * Flattened row used by dashboard tables (one row per student).
 */
export interface InscriptionFlat {
  inscription_id: string | number;
  student_index?: number;
  created_at: string;
  parent_phone: string;
  parent_email: string;
  afa_member: boolean;
  name: string;
  surname: string;
  course: string;
  activities: string[];
  status: InscriptionStatus;
  suspended: boolean;
}

// Filters for dashboard
export interface InscriptionFilters {
  course: string;
  activity: string;
  status: string;
  search: string;
}
