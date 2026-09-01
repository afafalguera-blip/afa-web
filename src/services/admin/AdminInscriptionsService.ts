import { supabase } from '../../lib/supabase';
import {
  collectActivityOptions,
  filterInscriptionList,
  normalizeInscriptions,
} from '../../logic/inscriptionFilters';
import { findDuplicates, type DuplicateMap } from '../../logic/inscriptionDuplicates';
import { INSCRIPTION_STATUS, STATUS_FILTER } from '../../constants/status';
import type { Inscription, InscriptionRaw, InscriptionStatus } from '../../types/inscription';

export interface GetInscriptionsParams {
  academicYear?: string;
  /** 1-based. */
  page?: number;
  pageSize?: number;
  search?: string;
  /** 'all' (default) or an `InscriptionStatus`. */
  status?: string;
  activity?: string;
  course?: string;
}

export interface GetInscriptionsResult {
  rows: Inscription[];
  total: number;
  /**
   * True when the page was produced in memory because a client-only filter was
   * active (see CLIENT-SIDE FILTERS below). Exposed so the UI can explain the
   * slower path if it ever needs to.
   */
  clientFiltered: boolean;
}

/**
 * CLIENT-SIDE FILTERS — documented limitation.
 *
 * `academic_year` and `status` are plain columns, so they are pushed to
 * Postgres together with `.range()` + `count: 'exact'`: the default listing
 * never downloads more than one page.
 *
 * `course`, `activity` and the free-text `search` are NOT: courses and
 * activities live inside the `students` JSONB array, and PostgREST cannot run
 * `ilike` over the elements of a JSON array (no cast is allowed in filters and
 * `cs.` only does exact containment). Restricting the search to the parent
 * columns would silently drop "search by child name", which the admin relies
 * on.
 *
 * So when any of those three is active we fetch the cohort ONCE with the
 * server-side filters applied, filter in memory and slice the page here. The
 * reported `total` is the post-filter count, so the pagination footer is never
 * out of sync with the rows on screen.
 */
const usesClientFilters = (params: GetInscriptionsParams): boolean =>
  Boolean(params.search?.trim() || params.activity || params.course);

/** Lo que se sabe del curso escolar entero, más allá de la página visible. */
export interface CohortIndex {
  /** Etiquetas de actividad distintas, para el desplegable del filtro. */
  activityOptions: string[];
  /** Inscripciones repetidas, por id. Solo lleva las que lo están. */
  duplicates: DuplicateMap;
}

export interface InscriptionStats {
  /** Number of `inscripcions` rows (families), not children. */
  totalInscriptions: number;
  activeStudents: number;
  bajaStudents: number;
  afaMemberStudents: number;
  topActivity: { name: string; count: number } | null;
}

const DEFAULT_PAGE_SIZE = 25;

type InscriptionsTableName = 'inscripcions' | 'inscriptions';
let detectedTable: InscriptionsTableName | null = null;

const isMissingRelationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  return err.code === '42P01' || (err.message || '').toLowerCase().includes('does not exist');
};

const runWithTableFallback = async <T>(
  operation: (table: InscriptionsTableName) => Promise<{ data: T; error: unknown }>
): Promise<T> => {
  const candidates: InscriptionsTableName[] = detectedTable
    ? [detectedTable, detectedTable === 'inscripcions' ? 'inscriptions' : 'inscripcions']
    : ['inscripcions', 'inscriptions'];

  let lastError: unknown = null;

  for (const table of candidates) {
    const { data, error } = await operation(table);
    if (!error) {
      detectedTable = table;
      return data;
    }

    lastError = error;
    if (!isMissingRelationError(error)) {
      throw error;
    }
  }

  throw lastError;
};

interface ServerFilter {
  column: string;
  op: 'eq' | 'neq';
  value: string;
}

/**
 * Columns Postgres can filter on directly (everything else lives in JSONB).
 *
 * `STATUS_FILTER.ACTIVE` NO es un valor de la columna: la base solo guarda
 * 'alta' y 'baja' (`inscripcions_status_check`), y 'active' significa
 * «cualquiera que no sea baja» — así lo entienden `filterInscriptions` y
 * `filterInscriptionList`. Empujarlo como `.eq('status','active')` devolvía
 * cero filas sin ningún error: un listado vacío que parece un curso sin
 * inscripciones. Se traduce a `.neq('status','baja')`, que es lo que quiere
 * decir.
 */
const serverFilters = (params: GetInscriptionsParams): ServerFilter[] => {
  const filters: ServerFilter[] = [];
  if (params.academicYear) {
    filters.push({ column: 'academic_year', op: 'eq', value: params.academicYear });
  }
  if (params.status && params.status !== STATUS_FILTER.ALL) {
    filters.push(
      params.status === STATUS_FILTER.ACTIVE
        ? { column: 'status', op: 'neq', value: INSCRIPTION_STATUS.BAJA }
        : { column: 'status', op: 'eq', value: params.status }
    );
  }
  return filters;
};


export const AdminInscriptionsService = {
  /**
   * Paginated listing. Returns `{ rows, total }`; `total` always matches the
   * filters actually applied (server-side or in memory).
   */
  async getInscriptions(params: GetInscriptionsParams = {}): Promise<GetInscriptionsResult> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE);

    if (usesClientFilters(params)) {
      const all = await this.getAllInscriptions(params);
      const from = (page - 1) * pageSize;
      return { rows: all.slice(from, from + pageSize), total: all.length, clientFiltered: true };
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const result = await runWithTableFallback<{ rows: InscriptionRaw[]; count: number }>(
      async (table) => {
        let query = supabase.from(table).select('*', { count: 'exact' });
        for (const filter of serverFilters(params)) {
          query = filter.op === 'neq'
            ? query.neq(filter.column, filter.value)
            : query.eq(filter.column, filter.value);
        }

        const response = await query.order('created_at', { ascending: false }).range(from, to);
        return {
          data: { rows: (response.data || []) as InscriptionRaw[], count: response.count ?? 0 },
          error: response.error,
        };
      }
    );

    return {
      rows: normalizeInscriptions(result.rows),
      total: result.count,
      clientFiltered: false,
    };
  },

  /**
   * Full result set for the active filters (no pagination). Used by the export
   * modal — the admin expects the export to cover every filtered record, not
   * just the visible page.
   */
  async getAllInscriptions(params: GetInscriptionsParams = {}): Promise<Inscription[]> {
    const rows = await runWithTableFallback<InscriptionRaw[]>(async (table) => {
      let query = supabase.from(table).select('*');
      for (const filter of serverFilters(params)) {
        query = filter.op === 'neq'
          ? query.neq(filter.column, filter.value)
          : query.eq(filter.column, filter.value);
      }
      const response = await query.order('created_at', { ascending: false });
      return { data: (response.data || []) as InscriptionRaw[], error: response.error };
    });

    const inscriptions = normalizeInscriptions(rows);
    return filterInscriptionList(inscriptions, {
      course: params.course ?? '',
      activity: params.activity ?? '',
      status: STATUS_FILTER.ALL, // already applied server-side
      search: params.search ?? '',
    });
  },

  /**
   * Lo que hay que saber del curso escolar entero, no de la página visible:
   * las actividades que existen (para el desplegable) y qué inscripciones están
   * repetidas (para avisar antes de borrar).
   *
   * Va en UNA consulta y con las cinco columnas justas: la detección de
   * repetidas necesita mirar todo el curso —dos envíos de la misma familia con
   * días de diferencia caen en páginas distintas— y hacerlo con `select('*')`
   * significaría descargar los datos de salud de todas las criaturas para
   * pintar dos etiquetas.
   */
  async getCohortIndex(academicYear?: string): Promise<CohortIndex> {
    const rows = await runWithTableFallback<InscriptionRaw[]>(async (table) => {
      let query = supabase.from(table).select('id, created_at, parent_dni, parent_email_1, students');
      if (academicYear) query = query.eq('academic_year', academicYear);
      const response = await query;
      return { data: (response.data || []) as InscriptionRaw[], error: response.error };
    });

    const inscriptions = normalizeInscriptions(rows);
    return {
      activityOptions: collectActivityOptions(inscriptions),
      duplicates: findDuplicates(inscriptions),
    };
  },

  /**
   * Aggregated counters for the dashboard. Selects only the three columns it
   * needs so the dashboard no longer downloads every inscription just to count.
   */
  async getInscriptionStats(academicYear?: string): Promise<InscriptionStats> {
    const rows = await runWithTableFallback<InscriptionRaw[]>(async (table) => {
      let query = supabase.from(table).select('students, status, afa_member');
      if (academicYear) query = query.eq('academic_year', academicYear);
      const response = await query;
      return { data: (response.data || []) as InscriptionRaw[], error: response.error };
    });

    const stats: InscriptionStats = {
      totalInscriptions: rows.length,
      activeStudents: 0,
      bajaStudents: 0,
      afaMemberStudents: 0,
      topActivity: null,
    };
    const activityCount = new Map<string, number>();

    for (const inscription of normalizeInscriptions(rows)) {
      const studentCount = inscription.students.length;
      if (inscription.status === 'baja') {
        stats.bajaStudents += studentCount;
        continue;
      }
      stats.activeStudents += studentCount;
      if (inscription.afa_member) stats.afaMemberStudents += studentCount;
      for (const student of inscription.students) {
        for (const activity of student.activities || []) {
          if (activity) activityCount.set(activity, (activityCount.get(activity) ?? 0) + 1);
        }
      }
    }

    for (const [name, count] of activityCount) {
      if (!stats.topActivity || count > stats.topActivity.count) stats.topActivity = { name, count };
    }

    return stats;
  },

  async getAcademicYears(): Promise<string[]> {
    const data = await runWithTableFallback<{ academic_year?: string }[]>(async (table) => {
      const result = await supabase.from(table).select('academic_year');
      return { data: (result.data || []) as { academic_year?: string }[], error: result.error };
    });
    const years = new Set<string>();
    for (const r of data) if (r.academic_year) years.add(r.academic_year);
    return Array.from(years).sort().reverse();
  },

  /**
   * Cuántos pagos apuntan a esta inscripción. Se consulta ANTES de ofrecer el
   * borrado: desde 20260901120000_inscripcions_integritat.sql la clave ajena
   * es ON DELETE RESTRICT, así que borrar una inscripción con pagos falla en
   * Postgres. Preguntarlo antes convierte un error críptico en una frase que
   * dice qué pasa y qué hacer en su lugar.
   */
  async countPaymentsFor(inscriptionId: string): Promise<number> {
    const { count, error } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('inscripcion_id', inscriptionId);

    if (error) throw error;
    return count ?? 0;
  },

  async deleteInscription(id: string) {
    await runWithTableFallback<null>(async (table) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      return { data: null, error };
    });
    return true;
  },

  async updateStatus(id: string, status: InscriptionStatus) {
    await runWithTableFallback<null>(async (table) => {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      return { data: null, error };
    });
    return true;
  },

  /**
   * Updates an inscription. Only whitelisted columns are written, so passing a
   * whole `Inscription` (as the edit modal does) never tries to write `id` or
   * `created_at`.
   */
  async updateInscription(id: string, updates: Partial<Inscription>) {
    const UPDATABLE: (keyof Inscription)[] = [
      'parent_name',
      'parent_dni',
      'parent_phone_1',
      'parent_email_1',
      'parent_phone_2',
      'parent_email_2',
      'status',
      'students',
      'afa_member',
      'image_auth_consent',
      'can_leave_alone',
      'authorized_pickup',
      'health_info',
      'extra_answers',
    ];

    const payload: Record<string, unknown> = {};
    for (const field of UPDATABLE) {
      if (updates[field] !== undefined) payload[field] = updates[field];
    }
    if (Object.keys(payload).length === 0) return true;

    await runWithTableFallback<null>(async (table) => {
      const { error } = await supabase.from(table).update(payload).eq('id', id);
      return { data: null, error };
    });
    return true;
  },

  async toggleAfaMember(id: string, currentStatus: boolean) {
    await runWithTableFallback<null>(async (table) => {
      const { error } = await supabase
        .from(table)
        .update({ afa_member: !currentStatus })
        .eq('id', id);
      return { data: null, error };
    });
    return true;
  },
};
