/**
 * @fileoverview Custom hook for financial and shop statistics
 * Extracts stats logic from Dashboard component
 */

import { useState, useEffect, useCallback } from 'react';
import { StatsService, type FinancialStats, type ShopStats } from '../services/StatsService';

interface UseFinancialStatsReturn {
  /** Financial statistics (inscriptions) */
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

/**
 * Hook for managing financial and shop statistics
 * Encapsulates all stats-related API calls and state
 */
export function useFinancialStats(): UseFinancialStatsReturn {
  const [financialStats, setFinancialStats] = useState<FinancialStats>(DEFAULT_FINANCIAL_STATS);
  const [shopStats, setShopStats] = useState<ShopStats>(DEFAULT_SHOP_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [fin, shop] = await Promise.all([
        StatsService.getFinancialStats(),
        StatsService.getShopStats(),
      ]);
      setFinancialStats(fin);
      setShopStats(shop);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading statistics';
      setError(message);
      console.error('Error loading stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    financialStats,
    shopStats,
    isLoading,
    error,
    reload: loadStats,
  };
}
