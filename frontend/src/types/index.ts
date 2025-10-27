/**
 * Frontend Type Definitions
 * 
 * Unified types for frontend components, API responses, and state management.
 * Mirrors backend types for type-safe integration.
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthContext {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  register: (data: RegisterRequest) => Promise<void>;
  isAuthenticated: boolean;
}

// ============================================================================
// Market Data Types
// ============================================================================

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValue {
  timestamp: string;
  symbol: string;
  indicatorName: string;
  value: number;
  signal?: number;
}

export interface ScreenerResult {
  symbol: string;
  price: number;
  volume: number;
  rsi: number;
  macd: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  matchedPatterns: string[];
  score: number;
}

// ============================================================================
// Strategy Types
// ============================================================================

export interface StrategyCondition {
  indicator: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
}

export interface StrategyConfig {
  name: string;
  description?: string;
  conditions: StrategyCondition[];
  entryRules: StrategyCondition[];
  exitRules: StrategyCondition[];
  riskPercentage: number;
  maxPositions: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

export interface Strategy extends StrategyConfig {
  id: string;
  userId: string;
  active: boolean;
  winRate: number;
  profitFactor: number;
  createdAt: string;
  updatedAt: string;
}

export interface BacktestResult {
  strategyId: string;
  symbol: string;
  startDate: string;
  endDate: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  profit: number;
  profitPercent: number;
  type: 'long' | 'short';
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  profit: number;
  profitPercent: number;
  type: 'long' | 'short';
  createdAt: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  profitPercent: number;
  positions: Position[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioMetrics {
  totalValue: number;
  cash: number;
  invested: number;
  profit: number;
  profitPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertChannel = 'TELEGRAM' | 'EMAIL' | 'PUSH' | 'WEBHOOK' | 'SMS' | 'SLACK';
export type AlertStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED' | 'SCHEDULED';
export type AlertType =
  | 'SIGNAL_BUY'
  | 'SIGNAL_SELL'
  | 'TP_HIT'
  | 'SL_HIT'
  | 'PORTFOLIO_MILESTONE'
  | 'HIGH_VOLATILITY'
  | 'BACKTEST_COMPLETE'
  | 'STRATEGY_UPDATED'
  | 'SYSTEM_ERROR'
  | 'SYSTEM_WARNING';
export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AlertConfig {
  [key: string]: any;
}

export interface Alert {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: AlertType;
  priority: AlertPriority;
  channels: AlertChannel[];
  channelConfigs: Record<AlertChannel, AlertConfig>;
  condition?: any;
  quietHours?: {
    startHour: number;
    endHour: number;
  };
  enabled: boolean;
  sendCount: number;
  lastSent?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  id: string;
  alertId: string;
  channel: AlertChannel;
  status: AlertStatus;
  message: string;
  deliveryTime: number;
  error?: string;
  sentAt: string;
}

export interface AlertStatistics {
  totalAlerts: number;
  totalSent: number;
  successRate: number;
  perChannelStats: Record<AlertChannel, {
    sent: number;
    failed: number;
    successRate: number;
  }>;
  last24h: {
    sent: number;
    failed: number;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface ComponentState<T> extends LoadingState {
  data: T | null;
}

export type Theme = 'light' | 'dark' | 'auto';

export interface UISettings {
  theme: Theme;
  sidebarCollapsed: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}
