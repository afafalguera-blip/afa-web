export interface InscriptionStudent {
  name: string;
  surname: string;
  course: string;
  activities: string[];
  suspended?: boolean;
}

export type InscriptionStatus = 'alta' | 'pending' | 'baja' | 'suspended';

export interface Inscription {
  id: string; // Most of the time it's treated as string in components despite being integer in DB
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

// Payload for creating via public form
export type CreateInscriptionPayload = Omit<Inscription, 'id' | 'created_at'>;

// Hook and dashboard specific legacy types
export interface InscriptionRaw {
  id: string | number;
  created_at?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_name?: string;
  parent_dni?: string;
  parent_phone_1?: string;
  parent_email_1?: string;
  student_name?: string;
  student_surname?: string;
  student_course?: string;
  selected_activities?: string[];
  status?: string;
  suspended?: boolean;
  afa_member?: boolean;
  students?: {
    name: string;
    surname: string;
    course: string;
    activities: string[];
  }[];
  // Internal properties that are sometimes unpacked
  [key: string]: any;
}

export interface InscriptionFlat {
  inscription_id: string | number;
  created_at?: string;
  parent_phone?: string;
  parent_email?: string;
  afa_member: boolean;
  name: string;
  surname: string;
  course: string;
  activities: string[];
  status: string;
  suspended: boolean;
}

export interface InscriptionFilters {
  course: string;
  activity: string;
  status: string;
  search: string;
}
