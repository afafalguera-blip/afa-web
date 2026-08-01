/**
 * Single source of truth for school course codes.
 * `code` is what the public inscription form persists and what the payment
 * generators (book prices, fees) key on — do not rename without a data migration.
 */
export const COURSE_CODES = ['I3', 'I4', 'I5', '1PRI', '2PRI', '3PRI', '4PRI', '5PRI', '6PRI'] as const;

export type CourseCode = (typeof COURSE_CODES)[number];

export type CourseStage = 'infantil' | 'primaria';

export interface Course {
  code: CourseCode;
  /** Catalan label as displayed today in the admin (BooksSettings / dashboard filters). */
  label: string;
  /** Translation key used by the public inscription form (public/locales). */
  i18nKey: string;
  stage: CourseStage;
}

export const COURSES: Course[] = [
  { code: 'I3', label: 'I3 (Infantil)', i18nKey: 'inscription.courses.i3', stage: 'infantil' },
  { code: 'I4', label: 'I4 (Infantil)', i18nKey: 'inscription.courses.i4', stage: 'infantil' },
  { code: 'I5', label: 'I5 (Infantil)', i18nKey: 'inscription.courses.i5', stage: 'infantil' },
  { code: '1PRI', label: '1r Primària', i18nKey: 'inscription.courses.1pri', stage: 'primaria' },
  { code: '2PRI', label: '2n Primària', i18nKey: 'inscription.courses.2pri', stage: 'primaria' },
  { code: '3PRI', label: '3r Primària', i18nKey: 'inscription.courses.3pri', stage: 'primaria' },
  { code: '4PRI', label: '4t Primària', i18nKey: 'inscription.courses.4pri', stage: 'primaria' },
  { code: '5PRI', label: '5è Primària', i18nKey: 'inscription.courses.5pri', stage: 'primaria' },
  { code: '6PRI', label: '6è Primària', i18nKey: 'inscription.courses.6pri', stage: 'primaria' }
];

export const COURSE_BY_CODE: Record<CourseCode, Course> = COURSES.reduce(
  (acc, course) => {
    acc[course.code] = course;
    return acc;
  },
  {} as Record<CourseCode, Course>
);

export function isCourseCode(value: string): value is CourseCode {
  return (COURSE_CODES as readonly string[]).includes(value);
}
