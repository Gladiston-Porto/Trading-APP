/**
 * Strategy Types
 * Definições de tipos para o Strategy Manager
 */

// ==================== ENUMS ====================

export enum StrategyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum StrategyType {
  RSI_CROSSOVER = 'RSI_CROSSOVER',
  MACD = 'MACD',
  BOLLINGER = 'BOLLINGER',
  SMA_CROSSOVER = 'SMA_CROSSOVER',
  CUSTOM = 'CUSTOM',
}

// ==================== INTERFACES ====================

export interface StrategyParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  type: 'integer' | 'float';
}

export interface StrategyConfig {
  userId: string;
  name: string;
  description: string;
  type: StrategyType;
  tickers: string[];
  parameters: Record<string, number>;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  minWinRate?: number;
  minSharpeRatio?: number;
  maxDrawdown?: number;
  status?: StrategyStatus;
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: StrategyType;
  tickers: string[];
  parameters: Record<string, number>;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  minWinRate?: number;
  minSharpeRatio?: number;
  maxDrawdown?: number;
  status: StrategyStatus;
  tags: string[];
  backtestCount: number;
  averageWinRate: number;
  averageSharpeRatio: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyMetrics {
  strategyId: string;
  totalBacktests: number;
  successfulBacktests: number;
  failedBacktests: number;
  averageWinRate: number;
  averageSharpeRatio: number;
  averageSortinoRatio: number;
  averageCalmarRatio: number;
  averageMaxDrawdown: number;
  averageCagr: number;
  bestPerformance: {
    ticker: string;
    winRate: number;
    sharpeRatio: number;
    cagr: number;
  };
  worstPerformance: {
    ticker: string;
    winRate: number;
    sharpeRatio: number;
    cagr: number;
  };
}

export interface StrategyComparison {
  strategy1: {
    id: string;
    name: string;
    metrics: StrategyMetrics;
  };
  strategy2: {
    id: string;
    name: string;
    metrics: StrategyMetrics;
  };
  difference: {
    winRate: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    cagr: number;
  };
  winner: string; // ID of winning strategy
}

export interface StrategyUpdate {
  name?: string;
  description?: string;
  parameters?: Record<string, number>;
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  minWinRate?: number;
  minSharpeRatio?: number;
  maxDrawdown?: number;
  status?: StrategyStatus;
  tags?: string[];
  tickers?: string[];
}

export interface StrategyPerformance {
  strategyId: string;
  ticker: string;
  period: {
    from: Date;
    to: Date;
  };
  backtestId: string;
  winRate: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  totalReturn: number;
  cagr: number;
  trades: number;
  timestamp: Date;
}

export interface BacktestComparison {
  strategy: Strategy;
  backtests: {
    ticker: string;
    period: {
      from: Date;
      to: Date;
    };
    metrics: {
      winRate: number;
      sharpeRatio: number;
      totalReturn: number;
      trades: number;
    };
  }[];
}
