/**
 * @fileoverview Types for Inscriptions module
 * Defines the data structures for student inscriptions in extracurricular activities
 */

/** Status of an inscription */
export type InscriptionStatus = 'active' | 'baja' | 'pending' | 'suspended';

/** Student information within an inscription */
export interface Student {
  name: string;
  surname: string;
  course: string;
  activities: string[];
}

/** Raw inscription data from Supabase */
export interface InscriptionRaw {
  id: number;
  created_at: string;
  parent_phone: string;
  parent_email: string;
  afa_member: boolean;
  /** New format: array of students */
  students?: Student[];
  /** Legacy format: single student fields */
  student_name?: string;
  student_surname?: string;
  student_course?: string;
  selected_activities?: string | string[];
  status?: InscriptionStatus;
  suspended?: boolean;
}

/** Flattened/normalized inscription for display in tables */
export interface InscriptionFlat {
  inscription_id: number;
  created_at: string;
  parent_phone: string;
  parent_email: string;
  afa_member: boolean;
  name: string;
  surname: string;
  course: string;
  activities: string | string[];
  status: InscriptionStatus;
  suspended: boolean;
}

/** Filters for inscription list */
export interface InscriptionFilters {
  course: string;
  activity: string;
  status: 'all' | InscriptionStatus;
  search: string;
}
