/**
 * @fileoverview Custom hook for managing inscriptions
 * Extracts all inscription-related state and logic from Dashboard component
 * Following Midudev's pattern: "If you see useEffect in a component, it should probably be a hook"
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminService } from '../services/AdminService';
import { flattenInscriptions, filterInscriptions } from '../logic/inscriptionFilters';
import { STATUS_FILTER } from '../constants/status';
import type { InscriptionRaw, InscriptionFlat, InscriptionFilters } from '../types/inscription';

interface UseInscriptionsReturn {
  /** Raw inscriptions from API */
  inscriptions: InscriptionRaw[];
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
  /** Reload inscriptions from API */
  reload: () => Promise<void>;
  /** Delete an inscription by ID */
  handleDelete: (id: number) => Promise<boolean>;
  /** Update inscription status */
  handleStatusChange: (id: number, newStatus: string) => Promise<boolean>;
}

/**
 * Hook for managing inscriptions state and operations
 * Encapsulates all CRUD operations and filtering logic
 */
export function useInscriptions(): UseInscriptionsReturn {
  // Data state
  const [inscriptions, setInscriptions] = useState<InscriptionRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const data = await AdminService.getInscriptions();
      setInscriptions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading inscriptions';
      setError(message);
      console.error('Error loading inscriptions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    loadInscriptions();
  }, [loadInscriptions]);

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
   * Delete an inscription
   * @returns true if successful, false otherwise
   */
  const handleDelete = useCallback(async (id: number): Promise<boolean> => {
    if (!window.confirm('Estàs segur que vols eliminar aquesta inscripció?')) {
      return false;
    }

    try {
      await AdminService.deleteInscription(id);
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
    id: number,
    newStatus: string
  ): Promise<boolean> => {
    try {
      await AdminService.updateStatus(id, newStatus as any);
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
    reload: loadInscriptions,
    handleDelete,
    handleStatusChange,
  };
}
