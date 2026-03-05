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


// Filters for dashboard
export interface InscriptionFilters {
  course: string;
  activity: string;
  status: string;
  search: string;
}
