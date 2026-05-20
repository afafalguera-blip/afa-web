export type FormFieldType =
  | 'text' | 'long_text'
  | 'select' | 'checkbox' | 'radio'
  | 'file'
  | 'date' | 'email' | 'phone' | 'number'
  | 'section_header';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  logic?: {
    dependsOn?: string;
    value?: string;
  };
}

export const FORM_FOLDERS = [
  'Inscripcions',
  'Extraescolars',
  'Menjador',
  'Acollida',
  'General',
] as const;

export type FormFolder = (typeof FORM_FOLDERS)[number];

export type SupportedLang = 'es' | 'ca' | 'en';

export const SUPPORTED_LANGS: SupportedLang[] = ['es', 'ca', 'en'];

/** Translation payload per non-source language ('ca' and 'en'; 'es' lives in the top-level columns). */
export interface FormTranslation {
  title?: string;
  description?: string;
  fields?: Record<string, FieldTranslation>;
}

export interface FieldTranslation {
  label?: string;
  placeholder?: string;
  options?: string[];
}

export interface FormTemplate {
  id?: string;
  title: string;
  description: string;
  slug: string;
  header_image_url?: string;
  folder?: string | null;
  closes_at?: string | null;
  fields_schema: FormField[];
  is_active: boolean;
  /** Translations for ca and en. Source ('es') lives in top-level columns. */
  translations?: Partial<Record<SupportedLang, FormTranslation>>;
  created_at?: string;
  updated_at?: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  submitted_by_user_id?: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
}
