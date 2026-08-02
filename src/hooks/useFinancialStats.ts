/**
 * @fileoverview Dashboard statistics: inscription counters, payments and shop.
 * All three are aggregated queries scoped to the selected cohort — the
 * dashboard never loads the inscription list itself.
 */

import { useState, useEffect, useCallback } from 'react';
import { StatsService, type FinancialStats, type ShopStats } from '../services/StatsService';
import {
  AdminInscriptionsService,
  type InscriptionStats,
} from '../services/admin/AdminInscriptionsService';

interface UseFinancialStatsReturn {
  /** Inscription counters (students, bajas, AFA members, top activity) */
  inscriptionStats: InscriptionStats;
  /** Financial statistics (payments) */
  financialStats: FinancialStats;
  /** Shop statistics (orders) */
  shopStats: ShopStats;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Reload statistics from API */
  reload: () => Promise<void>;
}

const DEFAULT_INSCRIPTION_STATS: InscriptionStats = {
  totalInscriptions: 0,
  activeStudents: 0,
  bajaStudents: 0,
  afaMemberStudents: 0,
  topActivity: null,
};

const DEFAULT_FINANCIAL_STATS: FinancialStats = {
  totalAmount: 0,
  paidAmount: 0,
  pendingAmount: 0,
};

const DEFAULT_SHOP_STATS: ShopStats = {
  totalOrders: 0,
  pendingOrders: 0,
  revenue: 0,
};

export function useFinancialStats(academicYear?: string): UseFinancialStatsReturn {
  const [inscriptionStats, setInscriptionStats] = useState<InscriptionStats>(DEFAULT_INSCRIPTION_STATS);
  const [financialStats, setFinancialStats] = useState<FinancialStats>(DEFAULT_FINANCIAL_STATS);
  const [shopStats, setShopStats] = useState<ShopStats>(DEFAULT_SHOP_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [inscriptions, fin, shop] = await Promise.all([
        AdminInscriptionsService.getInscriptionStats(academicYear || undefined),
        StatsService.getFinancialStats(academicYear || undefined),
        StatsService.getShopStats(academicYear || undefined),
      ]);
      setInscriptionStats(inscriptions);
      setFinancialStats(fin);
      setShopStats(shop);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading statistics';
      setError(message);
      console.error('Error loading stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    // Deferred to a microtask: the effect body itself must not call setState
    // synchronously (react-hooks/set-state-in-effect).
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadStats();
    });
    return () => {
      active = false;
    };
  }, [loadStats]);

  return {
    inscriptionStats,
    financialStats,
    shopStats,
    isLoading,
    error,
    reload: loadStats,
  };
}
