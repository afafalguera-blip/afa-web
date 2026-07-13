/**
 * @fileoverview Custom hook for managing inscriptions
 * Extracts all inscription-related state and logic from Dashboard component
 * Following Midudev's pattern: "If you see useEffect in a component, it should probably be a hook"
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminInscriptionsService } from '../services/admin/AdminInscriptionsService';
import { ConfigService } from '../services/ConfigService';
import { flattenInscriptions, filterInscriptions } from '../logic/inscriptionFilters';
import { STATUS_FILTER } from '../constants/status';
import type { Inscription, InscriptionFlat, InscriptionFilters, InscriptionStatus } from '../types/inscription';

interface UseInscriptionsReturn {
  /** Raw inscriptions from API */
  inscriptions: Inscription[];
  /** Filtered and flattened inscriptions for display */
  filteredData: InscriptionFlat[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current filters */
  filters: InscriptionFilters;
  /** Update a single filter */
  setFilter: <K extends keyof InscriptionFilters>(key: K, value: InscriptionFilters[K]) => void;
  /** Currently selected academic-year cohort ('' = all) */
  academicYear: string;
  /** Change the academic-year cohort (server-side filter, triggers reload) */
  setAcademicYear: (year: string) => void;
  /** Available academic years across all inscriptions */
  academicYears: string[];
  /** Distinct activity labels across the loaded cohort (for the activity filter) */
  activityOptions: string[];
  /** Reload inscriptions from API */
  reload: () => Promise<void>;
  /** Delete an inscription by ID */
  handleDelete: (id: string | number) => Promise<boolean>;
  /** Update inscription status */
  handleStatusChange: (id: string | number, newStatus: InscriptionStatus) => Promise<boolean>;
}

/**
 * Hook for managing inscriptions state and operations
 * Encapsulates all CRUD operations and filtering logic
 */
export function useInscriptions(): UseInscriptionsReturn {
  // Data state
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Academic-year cohort (server-side filter). '' = all cohorts.
  const [academicYear, setAcademicYearState] = useState<string>('');
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  // Filter state
  const [filters, setFilters] = useState<InscriptionFilters>({
    course: '',
    activity: '',
    status: STATUS_FILTER.ALL,
    search: '',
  });

  /**
   * Load inscriptions from API
   */
  const loadInscriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AdminInscriptionsService.getInscriptions(academicYear || undefined);
      setInscriptions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading inscriptions';
      setError(message);
      console.error('Error loading inscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [academicYear]);

  /**
   * Initialise the cohort selector: default to the active season's course.
   */
  useEffect(() => {
    (async () => {
      const [list, season] = await Promise.all([
        AdminInscriptionsService.getAcademicYears(),
        ConfigService.getSeasonConfig(),
      ]);
      setAcademicYears(list);
      const preferred = season?.active_year && list.includes(season.active_year)
        ? season.active_year
        : (list[0] || '');
      setAcademicYearState(preferred);
    })();
  }, []);

  /**
   * Load whenever the selected cohort changes (and on first run).
   */
  useEffect(() => {
    loadInscriptions();
  }, [loadInscriptions]);

  const setAcademicYear = useCallback((year: string) => {
    setAcademicYearState(year);
  }, []);

  /**
   * Update a single filter value
   */
  const setFilter = useCallback(<K extends keyof InscriptionFilters>(
    key: K,
    value: InscriptionFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Memoized filtered and flattened data
   * Only recalculates when inscriptions or filters change
   */
  const filteredData = useMemo(() => {
    const flattened = flattenInscriptions(inscriptions);
    return filterInscriptions(flattened, filters);
  }, [inscriptions, filters]);

  /**
   * Distinct activity labels present in the loaded cohort.
   * Derived from all inscriptions (not the filtered set) so the option list
   * stays stable while filtering.
   */
  const activityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of flattenInscriptions(inscriptions)) {
      for (const activity of row.activities) {
        if (activity) set.add(activity);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ca'));
  }, [inscriptions]);

  /**
   * Delete an inscription
   * @returns true if successful, false otherwise
   */
  const handleDelete = useCallback(async (id: string | number): Promise<boolean> => {
    if (!window.confirm('Estàs segur que vols eliminar aquesta inscripció?')) {
      return false;
    }

    try {
      await AdminInscriptionsService.deleteInscription(id);
      await loadInscriptions();
      return true;
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error al eliminar la inscripció');
      return false;
    }
  }, [loadInscriptions]);

  /**
   * Update inscription status
   * @returns true if successful, false otherwise
   */
  const handleStatusChange = useCallback(async (
    id: string | number,
    newStatus: InscriptionStatus
  ): Promise<boolean> => {
    try {
      await AdminInscriptionsService.updateStatus(id, newStatus);
      await loadInscriptions();
      return true;
    } catch (err) {
      console.error('Error updating status:', err);
      alert("Error al actualitzar l'estat");
      return false;
    }
  }, [loadInscriptions]);

  return {
    inscriptions,
    filteredData,
    isLoading,
    error,
    filters,
    setFilter,
    academicYear,
    setAcademicYear,
    academicYears,
    activityOptions,
    reload: loadInscriptions,
    handleDelete,
    handleStatusChange,
  };
}
