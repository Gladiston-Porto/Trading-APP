/**
 * Types for Backtesting Service
 */

export interface BacktestConfig {
  userId: string;
  ticker: string;
  startDate: Date;
  endDate: Date;
  strategy: 'RSI_CROSSOVER' | 'MACD' | 'BOLLINGER' | 'SMA_CROSSOVER';
  parameters: Record<string, number>;
  initialCapital?: number;
}

export interface BacktestRequest {
  ticker: string;
  startDate: string;
  endDate: string;
  strategy: string;
  parameters: Record<string, number>;
}

export interface SimulatedTrade {
  entryDate: Date;
  entryPrice: number;
  exitDate: Date;
  exitPrice: number;
  quantity: number;
  direction: 'BUY' | 'SELL';
  pnl: number;
  pnlPercent: number;
  exitType: 'TP' | 'SL' | 'MANUAL';
  reason: string;
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  cagr: number;
  startEquity: number;
  endEquity: number;
  startDate: Date;
  endDate: Date;
}

export interface BacktestResult {
  id: string;
  backtest_id: string;
  trades: SimulatedTrade[];
  metrics: BacktestMetrics;
  status: 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  executionTime: number;
}

export interface PriceData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValues {
  rsi?: number[];
  macd?: number[];
  signal?: number[];
  histogram?: number[];
  bollingerBands?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  sma?: number[];
}
