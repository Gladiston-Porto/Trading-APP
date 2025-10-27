/**
 * Custom Hooks
 * 
 * Reusable hooks for data fetching, state management, and API interactions.
 * Provides abstraction over API client for component-level usage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api/client';
import {
  MarketData,
  Strategy,
  Portfolio,
  Alert,
  AlertHistory,
  AlertStatistics,
  BacktestResult,
  ListResponse,
  PaginationParams,
} from '../types';

// ============================================================================
// useAsync - Generic hook for async operations
// ============================================================================

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseAsyncOptions {
  retry?: number;
  cacheTime?: number;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
  options: UseAsyncOptions = {}
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Check cache
      if (cacheRef.current && options.cacheTime) {
        const age = Date.now() - cacheRef.current.timestamp;
        if (age < options.cacheTime) {
          setState({
            data: cacheRef.current.data,
            loading: false,
            error: null,
          });
          return cacheRef.current.data;
        }
      }

      const data = await asyncFunction();
      
      // Update cache
      if (options.cacheTime) {
        cacheRef.current = { data, timestamp: Date.now() };
      }

      setState({
        data,
        loading: false,
        error: null,
      });

      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, [asyncFunction, options]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
  };
}

// ============================================================================
// useMarketData - Fetch market data for symbols
// ============================================================================

export function useMarketData(symbols: string[], interval = 5000) {
  const [data, setData] = useState<Record<string, MarketData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.post<Record<string, MarketData>>(
        '/market-data/batch',
        { symbols }
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch market data');
      }
    } catch (err: any) {
      setError(err.message || 'Market data fetch error');
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// useStrategy - Strategy management hook
// ============================================================================

export function useStrategy(strategyId?: string) {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(!!strategyId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!strategyId) return;

    const fetchStrategy = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<Strategy>(`/strategies/${strategyId}`);
        if (response.success && response.data) {
          setStrategy(response.data);
        } else {
          setError(response.error?.message || 'Failed to fetch strategy');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [strategyId]);

  const fetchAll = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<ListResponse<Strategy>>(
        '/strategies',
        params
      );
      if (response.success && response.data) {
        setStrategies(response.data.items);
      } else {
        setError(response.error?.message || 'Failed to fetch strategies');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createStrategy = useCallback(async (data: any) => {
    try {
      setLoading(true);
      const response = await apiClient.post<Strategy>('/strategies/create', data);
      if (response.success && response.data) {
        setStrategy(response.data);
        setStrategies(prev => [response.data as Strategy, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to create strategy');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStrategy = useCallback(async (id: string, data: any) => {
    try {
      setLoading(true);
      const response = await apiClient.put<Strategy>(`/strategies/${id}`, data);
      if (response.success && response.data) {
        setStrategy(response.data);
        setStrategies(prev =>
          prev.map(s => s.id === id ? response.data as Strategy : s)
        );
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to update strategy');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStrategy = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.delete(`/strategies/${id}`);
      if (response.success) {
        setStrategies(prev => prev.filter(s => s.id !== id));
        if (strategy?.id === id) setStrategy(null);
      } else {
        throw new Error(response.error?.message || 'Failed to delete strategy');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [strategy?.id]);

  const backtest = useCallback(async (id: string, params: any) => {
    try {
      const response = await apiClient.post<BacktestResult>(
        `/strategies/${id}/backtest`,
        params
      );
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Backtest failed');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    strategy,
    strategies,
    loading,
    error,
    fetchAll,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    backtest,
  };
}

// ============================================================================
// usePortfolio - Portfolio management hook
// ============================================================================

export function usePortfolio(portfolioId?: string) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(!!portfolioId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolioId) return;

    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<Portfolio>(`/portfolios/${portfolioId}`);
        if (response.success && response.data) {
          setPortfolio(response.data);
        } else {
          setError(response.error?.message || 'Failed to fetch portfolio');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [portfolioId]);

  const addPosition = useCallback(async (symbol: string, quantity: number, price: number) => {
    if (!portfolioId) throw new Error('Portfolio ID is required');
    
    try {
      const response = await apiClient.post(
        `/portfolios/${portfolioId}/positions/add`,
        { symbol, quantity, price }
      );
      if (response.success && response.data) {
        setPortfolio(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to add position');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [portfolioId]);

  const removePosition = useCallback(async (positionId: string) => {
    if (!portfolioId) throw new Error('Portfolio ID is required');
    
    try {
      const response = await apiClient.delete(
        `/portfolios/${portfolioId}/positions/${positionId}`
      );
      if (response.success && response.data) {
        setPortfolio(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to remove position');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [portfolioId]);

  return {
    portfolio,
    loading,
    error,
    addPosition,
    removePosition,
  };
}

// ============================================================================
// useAlerts - Alert management hook
// ============================================================================

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statistics, setStatistics] = useState<AlertStatistics | null>(null);
  const [history, setHistory] = useState<Record<string, AlertHistory[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (params?: PaginationParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<ListResponse<Alert>>('/alerts', params);
      if (response.success && response.data) {
        setAlerts(response.data.items);
      } else {
        setError(response.error?.message || 'Failed to fetch alerts');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await apiClient.get<AlertStatistics>('/alerts/stats');
      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        setError(response.error?.message || 'Failed to fetch statistics');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const createAlert = useCallback(async (data: any) => {
    try {
      const response = await apiClient.post<Alert>('/alerts/create', data);
      if (response.success && response.data) {
        setAlerts(prev => [response.data as Alert, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to create alert');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateAlert = useCallback(async (id: string, data: any) => {
    try {
      const response = await apiClient.put<Alert>(`/alerts/${id}`, data);
      if (response.success && response.data) {
        setAlerts(prev =>
          prev.map(a => a.id === id ? response.data as Alert : a)
        );
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to update alert');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteAlert = useCallback(async (id: string) => {
    try {
      const response = await apiClient.delete(`/alerts/${id}`);
      if (response.success) {
        setAlerts(prev => prev.filter(a => a.id !== id));
      } else {
        throw new Error(response.error?.message || 'Failed to delete alert');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const fetchHistory = useCallback(async (alertId: string) => {
    try {
      const response = await apiClient.get<AlertHistory[]>(`/alerts/${alertId}/history`);
      if (response.success && response.data) {
        setHistory(prev => ({
          ...prev,
          [alertId]: response.data as AlertHistory[],
        }));
      } else {
        setError(response.error?.message || 'Failed to fetch history');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return {
    alerts,
    statistics,
    history,
    loading,
    error,
    fetchAlerts,
    fetchStatistics,
    createAlert,
    updateAlert,
    deleteAlert,
    fetchHistory,
  };
}

// ============================================================================
// useDebounce - Debounce hook for form inputs
// ============================================================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
