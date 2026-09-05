/**
 * Acollida domain model.
 *
 * One `AcollidaInscription` row = ONE CHILD. A family with two children signing
 * up sends two rows sharing the same parent columns; that is deliberate, since
 * every listing the AFA actually needs (who comes on Tuesday, how many in I3,
 * receipts for October) is a per-child listing.
 *
 * Every value that has to be filtered, grouped or counted is canonical and
 * language-independent: `course` is a code from `constants/courses.ts`,
 * `weekdays` are the numbers 1..5, `modality` and `status` are fixed keys. The
 * visitor's language only decides what is displayed, never what is stored.
 */

export interface AcollidaRate {
  id: string;
  /** Display label of the time slot, e.g. "7:30H A 9H". Translatable. */
  horari: string;
  horari_ca?: string | null;
  horari_es?: string | null;
  horari_en?: string | null;
  /** Euros. Numeric since 2026-09-05 (they used to be text: '64€'). */
  preu_soci_mes: number;
  preu_soci_ocasional: number | null;
  preu_no_soci_mes: number;
  preu_no_soci_ocasional: number | null;
  order_index: number;
  /** Offered on the public form. A rate with sign-ups is deactivated, not deleted. */
  active: boolean;
  capacity_group: AcollidaCapacityGroup;
}

/** Seats of one room. Raising it is how an exception gets in, on the record. */
export interface AcollidaCapacity {
  capacity_group: AcollidaCapacityGroup;
  seats: number;
  /** Euros a month. Fixed: it does not move with how many children come. */
  monthly_cost: number;
  updated_at?: string;
}

/** One row of `acollida_occupancy()`: how full a room is on a given day. */
export interface AcollidaOccupancyDay {
  day: string;
  capacity_group: AcollidaCapacityGroup;
  monthly: number;
  occasional: number;
  total: number;
  seats: number;
  free: number;
}

export type AcollidaModality = 'mensual' | 'ocasional';
export type AcollidaStatus = 'pendent' | 'confirmada' | 'baixa' | 'llista_espera';

/**
 * Which room a time slot shares. The three morning slots all end at 9H, so
 * between 8:30 and 9 they are the same ten children in the same room: seats
 * belong to the group, never to the slot.
 */
export type AcollidaCapacityGroup = 'mati' | 'tarda';

export const ACOLLIDA_MODALITIES: AcollidaModality[] = ['mensual', 'ocasional'];
export const ACOLLIDA_STATUSES: AcollidaStatus[] = ['pendent', 'confirmada', 'llista_espera', 'baixa'];
export const ACOLLIDA_CAPACITY_GROUPS: AcollidaCapacityGroup[] = ['mati', 'tarda'];

/** Monday..Friday. Stored as numbers so a listing by day is language-proof. */
export const ACOLLIDA_WEEKDAYS = [1, 2, 3, 4, 5] as const;
export type AcollidaWeekday = (typeof ACOLLIDA_WEEKDAYS)[number];

/**
 * i18n keys for the weekday numbers. `as const` on purpose: `t()` is typed
 * against the key catalogue, and a plain `string` here would not type-check.
 */
export const WEEKDAY_I18N_KEYS = {
  1: 'acollida_form.weekday.mon',
  2: 'acollida_form.weekday.tue',
  3: 'acollida_form.weekday.wed',
  4: 'acollida_form.weekday.thu',
  5: 'acollida_form.weekday.fri',
} as const satisfies Record<AcollidaWeekday, string>;

export interface AcollidaInscription {
  id: string;
  created_at: string;
  updated_at: string;
  academic_year: string;

  child_name: string;
  child_surname: string;
  /** Course code (I3..6PRI), see `constants/courses.ts`. */
  course: string;

  rate_id: string;
  modality: AcollidaModality;
  /** 1..5, monday..friday. Empty for an occasional sign-up. */
  weekdays: AcollidaWeekday[];
  /** ISO dates (yyyy-mm-dd). Only for `modality === 'ocasional'`. */
  occasional_dates: string[];
  start_month: number | null;
  start_year: number | null;

  parent_name: string;
  parent_email: string;
  parent_phone: string;
  afa_member: boolean;

  notes: string | null;
  status: AcollidaStatus;
  form_language: string;
}

/**
 * What the public form sends. The database fills in `academic_year`,
 * `start_month`/`start_year` and the timestamps, so the family never has to
 * answer "which school year is this".
 */
export type AcollidaInscriptionInput = Pick<
  AcollidaInscription,
  | 'child_name'
  | 'child_surname'
  | 'course'
  | 'rate_id'
  | 'modality'
  | 'weekdays'
  | 'occasional_dates'
  | 'parent_name'
  | 'parent_email'
  | 'parent_phone'
  | 'afa_member'
  | 'form_language'
> & { notes?: string | null };

/** Filters shared by the admin listing, its service and the pure helpers. */
export interface AcollidaFilters {
  search: string;
  course: string;
  rateId: string;
  modality: string;
  /** '' = any day; otherwise a weekday number as a string. */
  weekday: string;
  /** '' = every status. */
  status: string;
}

export const EMPTY_ACOLLIDA_FILTERS: AcollidaFilters = {
  search: '',
  course: '',
  rateId: '',
  modality: '',
  weekday: '',
  status: '',
};

/**
 * A day with no school. Lives at centre level, not inside the acollida: the
 * same closed day rules out the menjador and the extraescolars too.
 */
export type SchoolClosureKind = 'festiu' | 'lliure_disposicio' | 'vacances' | 'altres';

export const SCHOOL_CLOSURE_KINDS: SchoolClosureKind[] = [
  'festiu',
  'lliure_disposicio',
  'vacances',
  'altres',
];

export interface SchoolClosedDay {
  day: string;
  kind: SchoolClosureKind;
  label: string | null;
  academic_year: string | null;
}

/** One child in the centre's roll. The only list of children that exists. */
export interface Child {
  id: string;
  name: string;
  surname: string;
  course: string;
  family_email: string | null;
  family_phone: string | null;
  afa_member: boolean | null;
  active: boolean;
  source: 'manual' | 'import' | 'acollida' | 'inscripcions';
  notes: string | null;
}

/** A row of the monitor's list for one day. Names only — never contact data. */
export interface AcollidaRosterRow {
  child_id: string;
  name: string;
  surname: string;
  course: string;
  expected: boolean;
  present: boolean;
  rate_id: string | null;
  slot: string | null;
  modality: AcollidaModality | null;
}

/** A password-less link that opens the day's list. Revocable, never reused. */
export interface AcollidaMonitorLink {
  id: string;
  token: string;
  label: string;
  capacity_group: AcollidaCapacityGroup;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
}

/** A child who came without a confirmed sign-up, for the AFA to sort out. */
export interface AcollidaUnbilledRow {
  child_id: string;
  name: string;
  surname: string;
  course: string;
  days: number;
  first_day: string;
  last_day: string;
}
