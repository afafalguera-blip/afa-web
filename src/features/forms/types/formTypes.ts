export type FormFieldType =
  | 'text' | 'long_text'
  | 'select' | 'checkbox' | 'radio'
  | 'file'
  | 'date' | 'email' | 'phone' | 'number'
  | 'weekdays'
  | 'section_header';

/** Source-language (es) labels for the seven weekdays. Used by the 'weekdays' field type
 * as the default options pool. Real labels live in field.options (translatable via TranslationsPanel). */
export const WEEKDAY_LABELS_ES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export type WeekdayLabelEs = (typeof WEEKDAY_LABELS_ES)[number];

/** Defaults pre-selected when adding a new 'weekdays' field (school case: mon-fri). */
export const WEEKDAY_DEFAULTS_ES: WeekdayLabelEs[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

/** Helper: returns true when a parent value satisfies a logic.value condition. Arrays match via .includes(). */
export const logicMatches = (parentValue: unknown, expected: string | undefined): boolean => {
  if (expected === undefined || expected === '') return false;
  if (Array.isArray(parentValue)) return parentValue.includes(expected);
  return parentValue === expected;
};

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
