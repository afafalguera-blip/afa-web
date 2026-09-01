/**
 * @fileoverview Single source of state for the admin inscriptions screen
 * (`/admin/inscriptions`): server-side pagination, filters, cohort selection
 * and CRUD. The dashboard no longer keeps a parallel copy of this logic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AdminInscriptionsService,
  type GetInscriptionsParams,
} from '../services/admin/AdminInscriptionsService';
import { ConfigService } from '../services/ConfigService';
import { useToast } from '../components/common/Toast';
import { useConfirm } from '../components/common/ConfirmDialog';
import { STATUS_FILTER } from '../constants/status';
import type { DuplicateMap } from '../logic/inscriptionDuplicates';
import type { Inscription, InscriptionFilters, InscriptionStatus } from '../types/inscription';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 350;

/** Constante de módulo: un `{}` en línea cambiaría de identidad en cada render. */
const NO_DUPLICATES: DuplicateMap = {};

const EMPTY_FILTERS: InscriptionFilters = {
  course: '',
  activity: '',
  status: STATUS_FILTER.ALL,
  search: '',
};

export interface UseInscriptionsReturn {
  /** Current page of inscriptions (one entry per family). */
  inscriptions: Inscription[];
  /** Total matching the active filters — drives the pagination footer. */
  total: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;

  isLoading: boolean;
  error: string | null;

  filters: InscriptionFilters;
  setFilter: <K extends keyof InscriptionFilters>(key: K, value: InscriptionFilters[K]) => void;
  resetFilters: () => void;

  /** Selected academic-year cohort ('' = all). Server-side filter. */
  academicYear: string;
  setAcademicYear: (year: string) => void;
  academicYears: string[];

  /** Distinct activity labels of the cohort, for the activity dropdown. */
  activityOptions: string[];
  /**
   * Inscripciones repetidas del curso escolar entero, por id. Distingue el
   * duplicado exacto (mismo formulario dos veces) de la misma familia con
   * inscripciones distintas — que es lo que se confunde y se borra.
   */
  duplicates: DuplicateMap;
  /** Labels of the configurable custom questions, keyed by question key. */
  customLabels: Record<string, string>;

  reload: () => Promise<void>;
  removeInscription: (inscription: Inscription) => Promise<boolean>;
  saveInscription: (id: string, updates: Partial<Inscription>) => Promise<boolean>;
  changeStatus: (id: string, status: InscriptionStatus) => Promise<boolean>;
  /** Full filtered set, ignoring pagination — used by the export modal. */
  fetchAllFiltered: () => Promise<Inscription[]>;
}

export function useInscriptions(): UseInscriptionsReturn {
  const { t } = useTranslation();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [academicYear, setAcademicYearState] = useState('');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [cohortReady, setCohortReady] = useState(false);

  const [filters, setFilters] = useState<InscriptionFilters>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [activityOptions, setActivityOptions] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateMap>(NO_DUPLICATES);
  const [cohortVersion, setCohortVersion] = useState(0);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  // Resolve the cohort list once and default to the active season.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, season] = await Promise.all([
          AdminInscriptionsService.getAcademicYears(),
          ConfigService.getSeasonConfig(),
        ]);
        if (cancelled) return;
        setAcademicYears(list);
        const preferred =
          season?.active_year && list.includes(season.active_year) ? season.active_year : list[0] || '';
        setAcademicYearState(preferred);
      } catch (err) {
        console.error('Error loading academic years:', err);
      } finally {
        if (!cancelled) setCohortReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    ConfigService.getInscriptionFormConfig()
      .then((cfg) => {
        if (!cfg) return;
        const map: Record<string, string> = {};
        (cfg.customQuestions || []).forEach((q) => {
          map[q.key] = q.label.ca || q.label.es || q.key;
        });
        setCustomLabels(map);
      })
      .catch((err) => console.error('Error loading inscription form config:', err));
  }, []);

  // Debounce the free-text search: it triggers a full-cohort fetch (the
  // students JSONB cannot be searched server-side, see AdminInscriptionsService).
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const queryParams = useMemo<GetInscriptionsParams>(
    () => ({
      academicYear: academicYear || undefined,
      status: filters.status,
      activity: filters.activity || undefined,
      course: filters.course || undefined,
      search: debouncedSearch.trim() || undefined,
    }),
    [academicYear, filters.status, filters.activity, filters.course, debouncedSearch]
  );

  // Any filter change invalidates the current page number.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setPage(1);
  }, [queryParams, pageSize]);

  const load = useCallback(async () => {
    if (!cohortReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await AdminInscriptionsService.getInscriptions({
        ...queryParams,
        page,
        pageSize,
      });
      setInscriptions(result.rows);
      setTotal(result.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading inscriptions';
      setError(message);
      console.error('Error loading inscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cohortReady, queryParams, page, pageSize]);

  useEffect(() => {
    // Deferred to a microtask: the effect body itself must not call setState
    // synchronously (react-hooks/set-state-in-effect).
    let active = true;
    Promise.resolve().then(() => {
      if (active) load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  // Las actividades del desplegable y la detección de repetidas salen del curso
  // escolar entero, no de la página: dos envíos de la misma familia con días de
  // diferencia caen en páginas distintas.
  //
  // `cohortVersion` lo bumpean las mutaciones. Sin eso, borrar una de dos filas
  // repetidas dejaba a la otra marcada como repetida hasta recargar la página:
  // el aviso más peligroso que puede haber es el que ya no es cierto.
  useEffect(() => {
    if (!cohortReady) return;
    let cancelled = false;
    AdminInscriptionsService.getCohortIndex(academicYear || undefined)
      .then((index) => {
        if (cancelled) return;
        setActivityOptions(index.activityOptions);
        setDuplicates(index.duplicates);
      })
      .catch((err) => console.error('Error loading cohort index:', err));
    return () => {
      cancelled = true;
    };
  }, [cohortReady, academicYear, cohortVersion]);

  const setFilter = useCallback(
    <K extends keyof InscriptionFilters>(key: K, value: InscriptionFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const setAcademicYear = useCallback((year: string) => setAcademicYearState(year), []);

  const removeInscription = useCallback(
    async (inscription: Inscription): Promise<boolean> => {
      // Qué se lleva por delante, criatura a criatura y con sus actividades:
      // una fila es una FAMILIA entera, y el diálogo anterior solo decía
      // "la inscripció", que es justo lo que hace pensar que sobra.
      const childLines = inscription.students.map((student) => {
        const name = `${student.name ?? ''} ${student.surname ?? ''}`.trim();
        const activities = (student.activities ?? []).filter(Boolean).join(', ');
        return activities ? `${name} (${activities})` : name;
      });
      const itemName =
        [inscription.parent_name, childLines.join(' · ')].filter(Boolean).join(' — ') ||
        `#${inscription.id}`;

      // Con la clave ajena ON DELETE RESTRICT, borrar una inscripción con pagos
      // falla en Postgres. Preguntarlo antes evita el error críptico y, sobre
      // todo, dice qué hacer en su lugar.
      let paymentCount = 0;
      try {
        paymentCount = await AdminInscriptionsService.countPaymentsFor(inscription.id);
      } catch (err) {
        // Que no se pueda contar no debe bloquear el borrado: si de verdad hay
        // pagos, la clave ajena lo para igual y el catch de abajo lo explica.
        console.error('Error counting payments for inscription:', err);
      }

      if (paymentCount > 0) {
        // `n` y no `count`: con `count`, i18next intenta resolver la forma
        // plural (`_one` / `_other`) y estas claves no la tienen.
        toast.error(t('admin.inscriptions.delete_blocked_payments', { n: paymentCount }));
        return false;
      }

      const duplicate = duplicates[inscription.id];
      const warning =
        duplicate?.kind === 'family'
          ? t('admin.inscriptions.delete_warn_family')
          : duplicate?.kind === 'exact'
            ? t('admin.inscriptions.delete_warn_exact')
            : '';

      const accepted = await confirm({
        title: t('admin.inscriptions.delete_title', 'Eliminar inscripció'),
        message: [
          t('admin.inscriptions.delete_confirm_children', { n: inscription.students.length }),
          warning,
          t('admin.inscriptions.delete_confirm_recover'),
        ]
          .filter(Boolean)
          .join(' '),
        itemName,
        confirmLabel: t('common.delete', 'Eliminar'),
        destructive: true,
      });
      if (!accepted) return false;

      try {
        await AdminInscriptionsService.deleteInscription(inscription.id);
        toast.success(t('admin.inscriptions.delete_success', 'Inscripció eliminada'));
        setCohortVersion((version) => version + 1);
        await load();
        return true;
      } catch (err) {
        console.error('Error deleting inscription:', err);
        // 23503 = foreign_key_violation: hay pagos apuntando a esta inscripción.
        // Debería haberlo cazado el recuento de arriba; esto es la red por si el
        // recuento falló o alguien registró un pago mientras el diálogo estaba
        // abierto.
        const code = (err as { code?: string } | null)?.code;
        toast.error(
          code === '23503'
            ? t('admin.inscriptions.delete_blocked_fk')
            : t('admin.inscriptions.delete_error', 'Error en eliminar la inscripció')
        );
        return false;
      }
    },
    [confirm, duplicates, load, t, toast]
  );

  const saveInscription = useCallback(
    async (id: string, updates: Partial<Inscription>): Promise<boolean> => {
      try {
        await AdminInscriptionsService.updateInscription(id, updates);
        setInscriptions((prev) =>
          prev.map((item) => (item.id === id ? ({ ...item, ...updates } as Inscription) : item))
        );
        // Editar criaturas o actividades puede crear o deshacer una repetición.
        if (updates.students) setCohortVersion((version) => version + 1);
        toast.success(t('admin.inscriptions.update_success', 'Inscripció actualitzada'));
        return true;
      } catch (err) {
        console.error('Error updating inscription:', err);
        toast.error(t('admin.inscriptions.update_error', "Error en desar l'inscripció"));
        return false;
      }
    },
    [t, toast]
  );

  const changeStatus = useCallback(
    async (id: string, status: InscriptionStatus): Promise<boolean> => {
      try {
        await AdminInscriptionsService.updateStatus(id, status);
        setInscriptions((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        toast.success(t('admin.inscriptions.status_success', "Estat actualitzat"));
        return true;
      } catch (err) {
        console.error('Error updating status:', err);
        toast.error(t('admin.inscriptions.status_error', "Error en actualitzar l'estat"));
        return false;
      }
    },
    [t, toast]
  );

  const fetchAllFiltered = useCallback(
    () => AdminInscriptionsService.getAllInscriptions(queryParams),
    [queryParams]
  );

  return {
    inscriptions,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    isLoading,
    error,
    filters,
    setFilter,
    resetFilters,
    academicYear,
    setAcademicYear,
    academicYears,
    activityOptions,
    duplicates,
    customLabels,
    reload: load,
    removeInscription,
    saveInscription,
    changeStatus,
    fetchAllFiltered,
  };
}
