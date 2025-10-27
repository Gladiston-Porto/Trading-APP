/**
 * Risk Manager Service
 * Gerenciamento de risco em trading: posição, stops, drawdowns
 * 
 * Funcionalidades:
 * - Position sizing (Kelly, Fixed Risk %, Fixed Amount)
 * - Stop Loss automático
 * - Take Profit automático
 * - Daily limit tracking
 * - Maximum drawdown protection
 * - Slippage calculations
 */

import logger from '../../utils/logger';

/**
 * Position Size Calculation Methods
 */
export enum PositionSizingMethod {
  KELLY_CRITERION = 'kelly',           // Geometric growth: f* = (bp - q) / b
  FIXED_RISK_PERCENT = 'fixed_risk',   // Risk X% per trade
  FIXED_AMOUNT = 'fixed_amount',       // Risk fixed $ amount
}

/**
 * Risk Parameters
 */
export interface RiskParameters {
  method: PositionSizingMethod;
  accountSize: number;                  // Total account equity
  riskPerTrade: number;                 // Risk per trade (0.01 = 1%, $100, etc)
  maxDailyLoss: number;                 // Daily loss limit (% or $)
  maxDrawdown: number;                  // Maximum drawdown tolerance (%)
  slippagePercent: number;              // Expected slippage (%)
  minRiskRewardRatio: number;           // Minimum acceptable RR (default: 2.0)
  kellyFraction?: number;               // Kelly fraction (0.0-1.0, default: 0.25)
}

/**
 * Trade Setup
 */
export interface TradeSetup {
  ticker: string;
  entryPrice: number;
  direction: 'BUY' | 'SELL';
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
}

/**
 * Position Sizing Result
 */
export interface PositionSize {
  shares: number;                       // Quantidade de ações
  riskAmount: number;                   // Valor em risco ($)
  positionSize: number;                 // Tamanho da posição ($)
  expectedProfit: number;               // Lucro esperado se TP atingido ($)
  method: PositionSizingMethod;
  rationale: string;                    // Explicação do cálculo
}

/**
 * Risk Assessment
 */
export interface RiskAssessment {
  canTrade: boolean;
  reason: string;
  warnings: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  metrics: {
    currentDrawdown: number;            // Current drawdown %
    dailyLossPercent: number;           // Daily loss %
    remainingDailyRisk: number;         // Remaining daily risk capacity
    accountUtilization: number;         // Account utilization %
  };
}

/**
 * Trade Execution Record
 */
export interface TradeRecord {
  ticker: string;
  entryTime: string;
  entryPrice: number;
  direction: 'BUY' | 'SELL';
  shares: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  riskAmount: number;
  exitPrice?: number;
  exitTime?: string;
  status: 'OPEN' | 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_MANUAL';
  profit?: number;
  profitPercent?: number;
}

/**
 * Session Risk Tracking
 */
export interface SessionRiskMetrics {
  tradesOpen: number;
  totalRiskExposed: number;             // Total risk in $ from open positions
  totalProfit: number;                  // Total P&L for session
  dailyLossUsed: number;                // Daily loss limit used
  maxDrawdownUsed: number;              // Max drawdown used
  accountValueCurrent: number;          // Current account value
}

class RiskManager {
  private static tradeRecords: TradeRecord[] = [];
  private static sessionStart: string = new Date().toISOString();
  private static initialAccountValue: number = 0;

  /**
   * ===== POSITION SIZING METHODS =====
   */

  /**
   * Calculate position size using Kelly Criterion
   * f* = (bp - q) / b
   * where:
   * - b = reward/risk ratio (RR)
   * - p = win probability (0-1)
   * - q = 1 - p (lose probability)
   * 
   * Default: Use historical win rate or conservative estimate
   */
  static calculateKellySize(
    params: RiskParameters,
    trade: TradeSetup,
    winRate: number = 0.55 // Conservative 55% win rate
  ): PositionSize {
    // Calculate reward/risk from prices
    const rewardAmount = Math.abs(trade.takeProfit - trade.entryPrice);
    const riskAmount = Math.abs(trade.entryPrice - trade.stopLoss);
    
    if (riskAmount === 0) {
      return {
        shares: 0,
        riskAmount: 0,
        positionSize: 0,
        expectedProfit: 0,
        method: PositionSizingMethod.KELLY_CRITERION,
        rationale: 'Risk amount is zero - cannot calculate position',
      };
    }

    const b = rewardAmount / riskAmount; // Reward/Risk ratio
    const p = winRate;
    const q = 1 - winRate;

    // Kelly formula: f* = (bp - q) / b
    let kellyFraction = (b * p - q) / b;
    
    // Apply Kelly fraction multiplier (default 0.25 = 25% of Kelly)
    const fractionMultiplier = params.kellyFraction || 0.25;
    kellyFraction = kellyFraction * fractionMultiplier;

    // Ensure Kelly is between 0 and 1
    kellyFraction = Math.max(0, Math.min(1, kellyFraction));

    // Calculate position size
    const riskInDollars = params.accountSize * kellyFraction;
    const sharesFromRisk = riskInDollars / riskAmount;
    
    // Apply slippage
    const slippageAdjustment = 1 - (params.slippagePercent / 100);
    const shares = Math.floor(sharesFromRisk * slippageAdjustment);

    const positionSize = shares * trade.entryPrice;
    const expectedProfit = shares * rewardAmount;

    return {
      shares,
      riskAmount: shares * riskAmount,
      positionSize,
      expectedProfit,
      method: PositionSizingMethod.KELLY_CRITERION,
      rationale: `Kelly Criterion (${fractionMultiplier * 100}% of Kelly): ${shares} shares, Risk=$${(shares * riskAmount).toFixed(2)}, Win rate: ${(winRate * 100).toFixed(1)}%`,
    };
  }

  /**
   * Calculate position size using Fixed Risk Percentage
   * Risk exactly X% of account per trade
   */
  static calculateFixedRiskSize(
    params: RiskParameters,
    trade: TradeSetup
  ): PositionSize {
    const riskAmount = Math.abs(trade.entryPrice - trade.stopLoss);
    
    if (riskAmount === 0) {
      return {
        shares: 0,
        riskAmount: 0,
        positionSize: 0,
        expectedProfit: 0,
        method: PositionSizingMethod.FIXED_RISK_PERCENT,
        rationale: 'Risk amount is zero - cannot calculate position',
      };
    }

    // Calculate dollars to risk (X% of account)
    const dollarsToRisk = params.accountSize * (params.riskPerTrade / 100);
    
    // Calculate shares from risk
    const sharesFromRisk = dollarsToRisk / riskAmount;

    // Apply slippage
    const slippageAdjustment = 1 - (params.slippagePercent / 100);
    const shares = Math.floor(sharesFromRisk * slippageAdjustment);

    const positionSize = shares * trade.entryPrice;
    const rewardAmount = Math.abs(trade.takeProfit - trade.entryPrice);
    const expectedProfit = shares * rewardAmount;

    return {
      shares,
      riskAmount: shares * riskAmount,
      positionSize,
      expectedProfit,
      method: PositionSizingMethod.FIXED_RISK_PERCENT,
      rationale: `Fixed Risk (${params.riskPerTrade}% of account): ${shares} shares, Risk=$${(shares * riskAmount).toFixed(2)}, Position=$${positionSize.toFixed(2)}`,
    };
  }

  /**
   * Calculate position size using Fixed Amount
   * Risk exactly $X per trade
   */
  static calculateFixedAmountSize(
    params: RiskParameters,
    trade: TradeSetup
  ): PositionSize {
    const riskAmount = Math.abs(trade.entryPrice - trade.stopLoss);
    
    if (riskAmount === 0) {
      return {
        shares: 0,
        riskAmount: 0,
        positionSize: 0,
        expectedProfit: 0,
        method: PositionSizingMethod.FIXED_AMOUNT,
        rationale: 'Risk amount is zero - cannot calculate position',
      };
    }

    // Calculate shares from fixed risk amount
    const sharesFromRisk = params.riskPerTrade / riskAmount;

    // Apply slippage
    const slippageAdjustment = 1 - (params.slippagePercent / 100);
    const shares = Math.floor(sharesFromRisk * slippageAdjustment);

    const positionSize = shares * trade.entryPrice;
    const rewardAmount = Math.abs(trade.takeProfit - trade.entryPrice);
    const expectedProfit = shares * rewardAmount;

    return {
      shares,
      riskAmount: shares * riskAmount,
      positionSize,
      expectedProfit,
      method: PositionSizingMethod.FIXED_AMOUNT,
      rationale: `Fixed Amount ($$${params.riskPerTrade} per trade): ${shares} shares, Risk=$${(shares * riskAmount).toFixed(2)}, Position=$${positionSize.toFixed(2)}`,
    };
  }

  /**
   * Calculate position size (orchestrator)
   */
  static calculatePositionSize(
    params: RiskParameters,
    trade: TradeSetup,
    winRate?: number
  ): PositionSize {
    // Validate RR ratio
    const minRR = params.minRiskRewardRatio || 2.0;
    if (trade.riskRewardRatio < minRR) {
      return {
        shares: 0,
        riskAmount: 0,
        positionSize: 0,
        expectedProfit: 0,
        method: params.method,
        rationale: `RR ratio ${trade.riskRewardRatio.toFixed(2)} is below minimum ${minRR.toFixed(2)}`,
      };
    }

    switch (params.method) {
      case PositionSizingMethod.KELLY_CRITERION:
        return this.calculateKellySize(params, trade, winRate);
      case PositionSizingMethod.FIXED_RISK_PERCENT:
        return this.calculateFixedRiskSize(params, trade);
      case PositionSizingMethod.FIXED_AMOUNT:
        return this.calculateFixedAmountSize(params, trade);
      default:
        return {
          shares: 0,
          riskAmount: 0,
          positionSize: 0,
          expectedProfit: 0,
          method: params.method,
          rationale: 'Unknown sizing method',
        };
    }
  }

  /**
   * ===== RISK ASSESSMENT METHODS =====
   */

  /**
   * Assess if trade can be executed given current risk
   */
  static assessRisk(
    params: RiskParameters,
    positionSize: PositionSize,
    currentDrawdown: number = 0,
    dailyLossPercent: number = 0
  ): RiskAssessment {
    const warnings: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' = 'LOW';

    // Check daily limit
    const maxDailyLossPercent = (params.maxDailyLoss / params.accountSize) * 100;
    const remainingDailyRisk = maxDailyLossPercent - dailyLossPercent;
    
    if (dailyLossPercent >= maxDailyLossPercent) {
      return {
        canTrade: false,
        reason: `Daily loss limit reached: ${dailyLossPercent.toFixed(2)}% / ${maxDailyLossPercent.toFixed(2)}%`,
        warnings,
        riskLevel: 'EXTREME',
        metrics: {
          currentDrawdown,
          dailyLossPercent,
          remainingDailyRisk: 0,
          accountUtilization: (positionSize.positionSize / params.accountSize) * 100,
        },
      };
    }

    if (dailyLossPercent > maxDailyLossPercent * 0.7) {
      warnings.push(`⚠️ Daily loss at ${dailyLossPercent.toFixed(2)}% of limit (${maxDailyLossPercent.toFixed(2)}%)`);
      riskLevel = 'HIGH';
    }

    // Check drawdown limit
    if (currentDrawdown >= params.maxDrawdown) {
      return {
        canTrade: false,
        reason: `Maximum drawdown limit reached: ${currentDrawdown.toFixed(2)}% / ${params.maxDrawdown.toFixed(2)}%`,
        warnings,
        riskLevel: 'EXTREME',
        metrics: {
          currentDrawdown,
          dailyLossPercent,
          remainingDailyRisk,
          accountUtilization: (positionSize.positionSize / params.accountSize) * 100,
        },
      };
    }

    if (currentDrawdown > params.maxDrawdown * 0.7) {
      warnings.push(`⚠️ Drawdown at ${currentDrawdown.toFixed(2)}% of limit (${params.maxDrawdown.toFixed(2)}%)`);
      riskLevel = 'HIGH';
    }

    // Check position size utilization
    const accountUtilization = (positionSize.positionSize / params.accountSize) * 100;
    if (accountUtilization > 50) {
      warnings.push(`⚠️ Position size large: ${accountUtilization.toFixed(1)}% of account`);
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }

    // Check minimum RR ratio
    if (positionSize.shares === 0) {
      warnings.push(`⚠️ Position size is zero - likely due to RR ratio or risk constraints`);
      return {
        canTrade: false,
        reason: 'Position size is zero',
        warnings,
        riskLevel: 'EXTREME',
        metrics: {
          currentDrawdown,
          dailyLossPercent,
          remainingDailyRisk,
          accountUtilization: 0,
        },
      };
    }

    return {
      canTrade: true,
      reason: 'Trade approved',
      warnings,
      riskLevel,
      metrics: {
        currentDrawdown,
        dailyLossPercent,
        remainingDailyRisk,
        accountUtilization,
      },
    };
  }

  /**
   * ===== STOP LOSS & TAKE PROFIT METHODS =====
   */

  /**
   * Calculate adjusted SL considering slippage
   */
  static calculateSlippageAdjustedStopLoss(
    stopLoss: number,
    entryPrice: number,
    slippagePercent: number,
    direction: 'BUY' | 'SELL'
  ): number {
    const slippageAmount = Math.abs(entryPrice - stopLoss) * (slippagePercent / 100);
    
    if (direction === 'BUY') {
      // For BUY, SL is below entry, slippage moves it further down
      return stopLoss - slippageAmount;
    } else {
      // For SELL, SL is above entry, slippage moves it further up
      return stopLoss + slippageAmount;
    }
  }

  /**
   * Calculate adjusted TP considering slippage
   */
  static calculateSlippageAdjustedTakeProfit(
    takeProfit: number,
    entryPrice: number,
    slippagePercent: number,
    direction: 'BUY' | 'SELL'
  ): number {
    const slippageAmount = Math.abs(takeProfit - entryPrice) * (slippagePercent / 100);
    
    if (direction === 'BUY') {
      // For BUY, TP is above entry, slippage moves it lower
      return takeProfit - slippageAmount;
    } else {
      // For SELL, TP is below entry, slippage moves it higher
      return takeProfit + slippageAmount;
    }
  }

  /**
   * Calculate trailing stop (N% below highest point for BUY)
   */
  static calculateTrailingStop(
    currentPrice: number,
    highestPrice: number,
    trailingPercent: number,
    direction: 'BUY' | 'SELL'
  ): number {
    if (direction === 'BUY') {
      // For BUY, trailing stop is below highest price
      const trailingAmount = highestPrice * (trailingPercent / 100);
      return highestPrice - trailingAmount;
    } else {
      // For SELL, trailing stop is above lowest price (highest means most profit point)
      const trailingAmount = highestPrice * (trailingPercent / 100);
      return highestPrice + trailingAmount;
    }
  }

  /**
   * ===== RISK TRACKING METHODS =====
   */

  /**
   * Record trade execution
   */
  static recordTrade(
    ticker: string,
    entryPrice: number,
    direction: 'BUY' | 'SELL',
    shares: number,
    stopLoss: number,
    takeProfit: number,
    positionSize: number,
    riskAmount: number
  ): TradeRecord {
    const trade: TradeRecord = {
      ticker,
      entryTime: new Date().toISOString(),
      entryPrice,
      direction,
      shares,
      stopLoss,
      takeProfit,
      positionSize,
      riskAmount,
      status: 'OPEN',
    };

    this.tradeRecords.push(trade);
    return trade;
  }

  /**
   * Close trade
   */
  static closeTrade(
    ticker: string,
    exitPrice: number,
    exitType: 'TP' | 'SL' | 'MANUAL'
  ): TradeRecord | null {
    const trade = this.tradeRecords.find(
      t => t.ticker === ticker && t.status === 'OPEN'
    );

    if (!trade) {
      logger.warn('Trade not found', { ticker });
      return null;
    }

    trade.exitPrice = exitPrice;
    trade.exitTime = new Date().toISOString();
    
    // Calculate P&L
    if (trade.direction === 'BUY') {
      trade.profit = trade.shares * (exitPrice - trade.entryPrice);
      trade.profitPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    } else {
      trade.profit = trade.shares * (trade.entryPrice - exitPrice);
      trade.profitPercent = ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
    }

    // Set status
    if (exitType === 'TP') {
      trade.status = 'CLOSED_TP';
    } else if (exitType === 'SL') {
      trade.status = 'CLOSED_SL';
    } else {
      trade.status = 'CLOSED_MANUAL';
    }

    return trade;
  }

  /**
   * Get session metrics
   */
  static getSessionMetrics(currentAccountValue: number): SessionRiskMetrics {
    const openTrades = this.tradeRecords.filter(t => t.status === 'OPEN');
    const closedTrades = this.tradeRecords.filter(t => !t.status.startsWith('OPEN'));

    const totalRiskExposed = openTrades.reduce((sum, t) => sum + t.riskAmount, 0);
    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const dailyLossUsed = closedTrades
      .filter(t => t.status === 'CLOSED_SL')
      .reduce((sum, t) => sum + Math.abs(t.profit || 0), 0);

    return {
      tradesOpen: openTrades.length,
      totalRiskExposed,
      totalProfit,
      dailyLossUsed,
      maxDrawdownUsed: 0, // Would need historical account values
      accountValueCurrent: currentAccountValue,
    };
  }

  /**
   * Get trade history
   */
  static getTradeHistory(
    filterStatus?: string,
    filterTicker?: string
  ): TradeRecord[] {
    return this.tradeRecords.filter(
      t =>
        (!filterStatus || t.status === filterStatus) &&
        (!filterTicker || t.ticker === filterTicker)
    );
  }

  /**
   * Reset session
   */
  static resetSession(): void {
    this.tradeRecords = [];
    this.sessionStart = new Date().toISOString();
  }
}

export default RiskManager;
