/**
 * Portfolio Management Types
 * 
 * Type definitions for portfolio management operations including
 * allocation strategies, rebalancing, risk metrics, and correlations
 */

/**
 * Portfolio Status Enum
 */
export enum PortfolioStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

/**
 * Allocation Strategy for portfolio rebalancing
 */
export enum AllocationStrategy {
  EQUAL_WEIGHT = "EQUAL_WEIGHT",        // Same % for all strategies
  RISK_PARITY = "RISK_PARITY",          // Weight by inverse of risk
  CUSTOM = "CUSTOM",                     // User-defined weights
  MOMENTUM_BASED = "MOMENTUM_BASED",     // Weight by recent performance
  VOLATILITY_INVERSE = "VOLATILITY_INVERSE", // Lower volatility = higher allocation
}

/**
 * Rebalance Frequency
 */
export enum RebalanceFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
  MANUAL = "MANUAL",
}

/**
 * Strategy Allocation in Portfolio
 */
export interface PortfolioAllocation {
  strategyId: string;
  allocation: number;           // 0-100 (percentage)
  currentValue: number;         // Current capital allocated
  targetValue: number;          // Target capital for rebalancing
  performanceMetric?: number;   // Latest Sharpe/Sortino/Calmar
}

/**
 * Portfolio Configuration
 */
export interface PortfolioConfig {
  userId: string;
  name: string;
  description?: string;
  initialCapital: number;       // Starting capital in currency
  currency: string;             // USD, BRL, EUR, etc
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  
  // Allocation settings
  allocationStrategy: AllocationStrategy;
  allocations: PortfolioAllocation[];
  
  // Rebalancing settings
  rebalanceFrequency?: RebalanceFrequency;
  rebalanceThreshold?: number;  // % threshold to trigger rebalance
  lastRebalanceDate?: Date;
  
  // Risk settings
  maxDrawdown?: number;         // Max acceptable drawdown %
  maxExposure?: number;         // Max total exposure %
  stopLossPercentage?: number;  // Stop loss threshold %
  
  // Tags for organization
  tags?: string[];
}

/**
 * Portfolio Creation Request
 */
export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  initialCapital: number;
  currency?: string;
  riskTolerance: "LOW" | "MEDIUM" | "HIGH";
  allocationStrategy: AllocationStrategy;
  allocations: PortfolioAllocation[];
  tags?: string[];
}

/**
 * Portfolio Update Request
 */
export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  riskTolerance?: "LOW" | "MEDIUM" | "HIGH";
  allocationStrategy?: AllocationStrategy;
  allocations?: PortfolioAllocation[];
  tags?: string[];
}

/**
 * Risk Metrics for Portfolio
 */
export interface RiskMetrics {
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  beta?: number;
  var95?: number;                // Value at Risk 95%
  cvar95?: number;               // Conditional VaR 95%
  correlationWithMarket?: number;
}

/**
 * Portfolio Metrics
 */
export interface PortfolioMetrics {
  portfolioId: string;
  totalValue: number;
  totalReturn: number;
  returnPercentage: number;
  
  // Daily metrics
  dailyReturn: number;
  dailyReturnPercentage: number;
  
  // Risk metrics
  riskMetrics: RiskMetrics;
  
  // Strategy breakdown
  strategyPerformance: {
    strategyId: string;
    name: string;
    allocation: number;
    currentValue: number;
    return: number;
    returnPercentage: number;
    riskMetrics: RiskMetrics;
  }[];
  
  // Correlations
  correlations: {
    strategy1Id: string;
    strategy2Id: string;
    correlation: number;
  }[];
  
  // Portfolio-level stats
  numberOfStrategies: number;
  effectiveDiversification: number; // 0-1
  averageAllocation: number;
  allocationStdDev: number;
  
  // Timestamps
  calculatedAt: Date;
  lastUpdateAt: Date;
}

/**
 * Correlation Analysis Result
 */
export interface CorrelationAnalysis {
  pairs: {
    strategy1Id: string;
    strategy1Name: string;
    strategy2Id: string;
    strategy2Name: string;
    correlation: number;
    interpretation: "HIGHLY_CORRELATED" | "MODERATELY_CORRELATED" | "LOW_CORRELATED" | "UNCORRELATED" | "NEGATIVELY_CORRELATED";
  }[];
  
  averageCorrelation: number;
  diversificationScore: number; // 0-100 (higher is better)
  
  recommendations: string[];
}

/**
 * Rebalance Configuration
 */
export interface RebalanceConfig {
  strategy: AllocationStrategy;
  allocations?: PortfolioAllocation[]; // For CUSTOM strategy
  threshold?: number;                   // % threshold
}

/**
 * Rebalance Result
 */
export interface RebalanceResult {
  portfolioId: string;
  timestamp: Date;
  
  before: {
    allocations: PortfolioAllocation[];
    totalValue: number;
  };
  
  after: {
    allocations: PortfolioAllocation[];
    totalValue: number;
  };
  
  changes: {
    strategyId: string;
    allocationChange: number;     // Percentage point change
    valueChange: number;          // Currency value change
  }[];
  
  reason: string;
  success: boolean;
}

/**
 * Risk Analysis
 */
export interface RiskAnalysis {
  portfolioId: string;
  riskMetrics: RiskMetrics;
  
  risks: {
    type: "HIGH_CORRELATION" | "HIGH_VOLATILITY" | "CONCENTRATION" | "DRAWDOWN" | "INDIVIDUAL_RISK";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    affectedStrategies: string[];
    recommendation: string;
  }[];
  
  overallRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendations: string[];
  
  analyzedAt: Date;
}

/**
 * Performance Comparison
 */
export interface PerformanceComparison {
  portfolioId: string;
  periods: {
    period: "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y";
    startDate: Date;
    endDate: Date;
    
    portfolioReturn: number;
    portfolioReturnPercentage: number;
    
    strategyReturns: {
      strategyId: string;
      return: number;
      returnPercentage: number;
      allocation: number;
      contribution: number;
    }[];
    
    benchmarkReturn?: number;
    alphaGenerated?: number;
  }[];
}

/**
 * Add Strategy to Portfolio Request
 */
export interface AddStrategyRequest {
  strategyId: string;
  allocation: number; // 0-100
}

/**
 * Remove Strategy from Portfolio Request
 */
export interface RemoveStrategyRequest {
  strategyId: string;
}

/**
 * Portfolio Response DTO
 */
export interface PortfolioResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  initialCapital: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  currency: string;
  riskTolerance: string;
  status: PortfolioStatus;
  allocationStrategy: AllocationStrategy;
  allocations: PortfolioAllocation[];
  tags: string[];
  numberOfStrategies: number;
  riskMetrics?: RiskMetrics;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List Portfolios Filter
 */
export interface ListPortfoliosFilter {
  status?: PortfolioStatus;
  allocationStrategy?: AllocationStrategy;
  riskTolerance?: "LOW" | "MEDIUM" | "HIGH";
  tags?: string[];
  minCapital?: number;
  maxCapital?: number;
  sortBy?: "name" | "return" | "createDate" | "updateDate";
  order?: "ASC" | "DESC";
  skip?: number;
  take?: number;
}

/**
 * Backtest Integration Request
 */
export interface UpdateMetricsFromBacktestRequest {
  strategyId: string;
  backtestResult: {
    totalReturn: number;
    returnPercentage: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
}
