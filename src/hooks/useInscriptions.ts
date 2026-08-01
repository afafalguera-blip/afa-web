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
import type { Inscription, InscriptionFilters, InscriptionStatus } from '../types/inscription';

const DEFAULT_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 350;

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

  // Activity dropdown options depend only on the cohort.
  useEffect(() => {
    if (!cohortReady) return;
    let cancelled = false;
    AdminInscriptionsService.getActivityOptions(academicYear || undefined)
      .then((options) => {
        if (!cancelled) setActivityOptions(options);
      })
      .catch((err) => console.error('Error loading activity options:', err));
    return () => {
      cancelled = true;
    };
  }, [cohortReady, academicYear]);

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
      const childNames = inscription.students
        .map((s) => `${s.name} ${s.surname}`.trim())
        .filter(Boolean)
        .join(', ');
      const itemName = [inscription.parent_name, childNames].filter(Boolean).join(' — ');

      const accepted = await confirm({
        title: t('admin.inscriptions.delete_title', 'Eliminar inscripció'),
        message: t(
          'admin.inscriptions.delete_confirm',
          'Aquesta acció no es pot desfer. Segur que vols eliminar la inscripció?'
        ),
        itemName: itemName || `#${inscription.id}`,
        confirmLabel: t('common.delete', 'Eliminar'),
        destructive: true,
      });
      if (!accepted) return false;

      try {
        await AdminInscriptionsService.deleteInscription(inscription.id);
        toast.success(t('admin.inscriptions.delete_success', 'Inscripció eliminada'));
        await load();
        return true;
      } catch (err) {
        console.error('Error deleting inscription:', err);
        toast.error(t('admin.inscriptions.delete_error', 'Error en eliminar la inscripció'));
        return false;
      }
    },
    [confirm, load, t, toast]
  );

  const saveInscription = useCallback(
    async (id: string, updates: Partial<Inscription>): Promise<boolean> => {
      try {
        await AdminInscriptionsService.updateInscription(id, updates);
        setInscriptions((prev) =>
          prev.map((item) => (item.id === id ? ({ ...item, ...updates } as Inscription) : item))
        );
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
    customLabels,
    reload: load,
    removeInscription,
    saveInscription,
    changeStatus,
    fetchAllFiltered,
  };
}
