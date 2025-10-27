/**
 * Portfolio Management Service
 * 
 * Manages user portfolios with multiple strategies, capital allocation,
 * rebalancing, correlation analysis, and risk aggregation.
 * 
 * Features:
 * - Create/update/delete portfolios
 * - Add/remove strategies from portfolio
 * - Automatic and manual rebalancing
 * - Correlation analysis between strategies
 * - Risk metrics aggregation
 * - Performance tracking and comparison
 */

import { PrismaClient } from "@prisma/client";
import {
  PortfolioMetrics,
  PortfolioStatus,
  AllocationStrategy,
  RebalanceResult,
  RiskMetrics,
  CorrelationAnalysis,
  RiskAnalysis,
  PerformanceComparison,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  AddStrategyRequest,
  RemoveStrategyRequest,
  PortfolioAllocation,
  ListPortfoliosFilter,
} from "./types/portfolio.types";

export class PortfolioService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.prisma = prisma;
  }

  /**
   * Create a new portfolio
   */
  async createPortfolio(userId: string, config: CreatePortfolioRequest) {
    // Validation
    if (!config.name || config.name.trim().length === 0) {
      throw new Error("Portfolio name is required");
    }

    if (config.initialCapital <= 0) {
      throw new Error("Initial capital must be greater than 0");
    }

    if (config.allocations.length === 0) {
      throw new Error("At least one strategy allocation is required");
    }

    // Validate allocations sum to 100
    const totalAllocation = config.allocations.reduce(
      (sum, a) => sum + a.allocation,
      0
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error("Allocations must sum to 100%");
    }

    // Validate all strategies exist
    const strategyIds = config.allocations.map((a) => a.strategyId);
    const strategies = await this.prisma.strategy.findMany({
      where: {
        id: { in: strategyIds },
        userId,
      },
    });

    if (strategies.length !== strategyIds.length) {
      throw new Error(
        "Some strategies not found or do not belong to user"
      );
    }

    // Create portfolio
    const portfolio = await this.prisma.portfolio.create({
      data: {
        userId,
        name: config.name,
        description: config.description,
        initialCapital: config.initialCapital,
        currentValue: config.initialCapital,
        totalReturn: 0,
        returnPercentage: 0,
        currency: config.currency || "USD",
        riskTolerance: config.riskTolerance,
        status: PortfolioStatus.DRAFT,
        allocationStrategy: config.allocationStrategy,
        allocationData: JSON.stringify(
          config.allocations.map((a) => ({
            strategyId: a.strategyId,
            allocation: a.allocation,
            currentValue: (config.initialCapital * a.allocation) / 100,
            targetValue: (config.initialCapital * a.allocation) / 100,
          }))
        ),
        tags: JSON.stringify(config.tags || []),
      },
    });

    return portfolio;
  }

  /**
   * Get a single portfolio
   */
  async getPortfolio(userId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    return this.formatPortfolioResponse(portfolio);
  }

  /**
   * List portfolios with filters
   */
  async listPortfolios(userId: string, filters?: ListPortfoliosFilter) {
    const skip = filters?.skip || 0;
    const take = filters?.take || 20;

    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.allocationStrategy) {
      where.allocationStrategy = filters.allocationStrategy;
    }

    if (filters?.riskTolerance) {
      where.riskTolerance = filters.riskTolerance;
    }

    if (filters?.minCapital) {
      where.currentValue = { gte: filters.minCapital };
    }

    if (filters?.maxCapital) {
      if (where.currentValue) {
        where.currentValue.lte = filters.maxCapital;
      } else {
        where.currentValue = { lte: filters.maxCapital };
      }
    }

    const portfolios = await this.prisma.portfolio.findMany({
      where,
      skip,
      take,
      orderBy: {
        [filters?.sortBy || "createdAt"]: filters?.order || "DESC",
      },
    });

    return portfolios.map((p: any) => this.formatPortfolioResponse(p));
  }

  /**
   * Update portfolio configuration
   */
  async updatePortfolio(
    userId: string,
    portfolioId: string,
    update: UpdatePortfolioRequest
  ) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    // Validate allocations if provided
    if (update.allocations) {
      const totalAllocation = update.allocations.reduce(
        (sum, a) => sum + a.allocation,
        0
      );
      if (Math.abs(totalAllocation - 100) > 0.01) {
        throw new Error("Allocations must sum to 100%");
      }
    }

    const updated = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        ...(update.name && { name: update.name }),
        ...(update.description && { description: update.description }),
        ...(update.riskTolerance && {
          riskTolerance: update.riskTolerance,
        }),
        ...(update.allocationStrategy && {
          allocationStrategy: update.allocationStrategy,
        }),
        ...(update.allocations && {
          allocationData: JSON.stringify(update.allocations),
        }),
        ...(update.tags && { tags: JSON.stringify(update.tags) }),
        updatedAt: new Date(),
      },
    });

    return this.formatPortfolioResponse(updated);
  }

  /**
   * Delete a portfolio
   */
  async deletePortfolio(userId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    await this.prisma.portfolio.delete({
      where: { id: portfolioId },
    });

    return { success: true, message: "Portfolio deleted" };
  }

  /**
   * Add strategy to portfolio
   */
  async addStrategy(
    userId: string,
    portfolioId: string,
    request: AddStrategyRequest
  ) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    // Verify strategy exists and belongs to user
    const strategy = await this.prisma.strategy.findUnique({
      where: { id: request.strategyId },
    });

    if (!strategy || strategy.userId !== userId) {
      throw new Error("Strategy not found");
    }

    // Check if strategy already in portfolio
    const allocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];

    if (allocations.some((a) => a.strategyId === request.strategyId)) {
      throw new Error("Strategy already exists in portfolio");
    }

    // Add new strategy with specified allocation
    const newAllocation: PortfolioAllocation = {
      strategyId: request.strategyId,
      allocation: request.allocation,
      currentValue: (portfolio.currentValue * request.allocation) / 100,
      targetValue: (portfolio.currentValue * request.allocation) / 100,
    };

    allocations.push(newAllocation);

    // Update portfolio
    const updated = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        allocationData: JSON.stringify(allocations),
        updatedAt: new Date(),
      },
    });

    return this.formatPortfolioResponse(updated);
  }

  /**
   * Remove strategy from portfolio
   */
  async removeStrategy(
    userId: string,
    portfolioId: string,
    request: RemoveStrategyRequest
  ) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    const allocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];

    const filtered = allocations.filter(
      (a) => a.strategyId !== request.strategyId
    );

    if (filtered.length === allocations.length) {
      throw new Error("Strategy not found in portfolio");
    }

    if (filtered.length === 0) {
      throw new Error("Cannot remove last strategy from portfolio");
    }

    // Update portfolio
    const updated = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        allocationData: JSON.stringify(filtered),
        updatedAt: new Date(),
      },
    });

    return this.formatPortfolioResponse(updated);
  }

  /**
   * Calculate correlation between strategies
   */
  async calculateCorrelation(
    userId: string,
    portfolioId: string
  ): Promise<CorrelationAnalysis> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    const allocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];

    // Get all strategies
    const strategies = await this.prisma.strategy.findMany({
      where: {
        id: { in: allocations.map((a) => a.strategyId) },
      },
    });

    // Calculate pairwise correlations (mock data based on similarity)
    const pairs: {
      strategy1Id: string;
      strategy1Name: string;
      strategy2Id: string;
      strategy2Name: string;
      correlation: number;
      interpretation:
        | "HIGHLY_CORRELATED"
        | "MODERATELY_CORRELATED"
        | "LOW_CORRELATED"
        | "UNCORRELATED"
        | "NEGATIVELY_CORRELATED";
    }[] = [];
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const s1 = strategies[i];
        const s2 = strategies[j];

        // Mock correlation: same type = higher correlation
        let correlation = Math.random() * 0.4 - 0.2;
        if (s1.type === s2.type) {
          correlation = Math.random() * 0.3 + 0.5;
        }

        correlation = Math.max(-1, Math.min(1, correlation));

        let interpretation:
          | "HIGHLY_CORRELATED"
          | "MODERATELY_CORRELATED"
          | "LOW_CORRELATED"
          | "UNCORRELATED"
          | "NEGATIVELY_CORRELATED";
        if (correlation > 0.7) {
          interpretation = "HIGHLY_CORRELATED";
        } else if (correlation > 0.4) {
          interpretation = "MODERATELY_CORRELATED";
        } else if (correlation > 0.1) {
          interpretation = "LOW_CORRELATED";
        } else if (correlation < -0.1) {
          interpretation = "NEGATIVELY_CORRELATED";
        } else {
          interpretation = "UNCORRELATED";
        }

        pairs.push({
          strategy1Id: s1.id,
          strategy1Name: s1.name,
          strategy2Id: s2.id,
          strategy2Name: s2.name,
          correlation,
          interpretation,
        });
      }
    }

    const avgCorrelation =
      pairs.length > 0
        ? pairs.reduce((sum, p) => sum + p.correlation, 0) / pairs.length
        : 0;

    // Diversification score (0-100): lower correlation = higher score
    const diversificationScore = Math.round(50 - avgCorrelation * 50);

    const recommendations = [];
    if (avgCorrelation > 0.6) {
      recommendations.push(
        "Consider adding less correlated strategies for better diversification"
      );
    }
    if (avgCorrelation < -0.3) {
      recommendations.push(
        "Portfolio has good diversification with some negatively correlated strategies"
      );
    }

    return {
      pairs,
      averageCorrelation: avgCorrelation,
      diversificationScore: Math.max(0, Math.min(100, diversificationScore)),
      recommendations,
    };
  }

  /**
   * Rebalance portfolio
   */
  async rebalancePortfolio(
    userId: string,
    portfolioId: string,
    strategy: AllocationStrategy
  ): Promise<RebalanceResult> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    const oldAllocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];

    const newAllocations: PortfolioAllocation[] = [];
    let reason = "";

    if (strategy === AllocationStrategy.EQUAL_WEIGHT) {
      const equalPercent = 100 / oldAllocations.length;
      newAllocations.push(
        ...oldAllocations.map((a) => ({
          ...a,
          allocation: equalPercent,
          targetValue: (portfolio.currentValue * equalPercent) / 100,
        }))
      );
      reason = "Rebalanced to equal weight allocation";
    } else if (strategy === AllocationStrategy.RISK_PARITY) {
      // Mock risk-based allocation
      const totalRisk = oldAllocations.length * 1.5;
      newAllocations.push(
        ...oldAllocations.map((a) => ({
          ...a,
          allocation: (1.5 / totalRisk) * 100,
          targetValue: ((1.5 / totalRisk) * 100 * portfolio.currentValue) / 100,
        }))
      );
      reason = "Rebalanced using risk parity";
    } else if (strategy === AllocationStrategy.MOMENTUM_BASED) {
      // Mock momentum-based allocation (higher performer gets more)
      const weights = oldAllocations.map(
        (a) => (a.performanceMetric || 0) + Math.random() * 0.5
      );
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      newAllocations.push(
        ...oldAllocations.map((a, idx) => ({
          ...a,
          allocation: (weights[idx] / totalWeight) * 100,
          targetValue:
            ((weights[idx] / totalWeight) * 100 * portfolio.currentValue) / 100,
        }))
      );
      reason = "Rebalanced based on momentum";
    } else {
      newAllocations.push(...oldAllocations);
      reason = "No rebalancing strategy applied";
    }

    // Calculate changes
    const changes = oldAllocations.map((oldA, i) => {
      const newA = newAllocations[i];
      return {
        strategyId: oldA.strategyId,
        allocationChange: newA.allocation - oldA.allocation,
        valueChange:
          (newA.allocation * portfolio.currentValue) / 100 -
          oldA.currentValue,
      };
    });

    // Update portfolio
    await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        allocationData: JSON.stringify(newAllocations),
        updatedAt: new Date(),
      },
    });

    return {
      portfolioId,
      timestamp: new Date(),
      before: {
        allocations: oldAllocations,
        totalValue: portfolio.currentValue,
      },
      after: {
        allocations: newAllocations,
        totalValue: portfolio.currentValue,
      },
      changes,
      reason,
      success: true,
    };
  }

  /**
   * Get portfolio metrics
   */
  async getPortfolioMetrics(
    userId: string,
    portfolioId: string
  ): Promise<PortfolioMetrics> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    const allocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];

    // Mock strategy performance
    const strategyPerformance = allocations.map((a) => {
      const return_ = Math.random() * 10 - 2;
      const value = (a.currentValue * (100 + return_)) / 100;

      return {
        strategyId: a.strategyId,
        name: `Strategy ${a.strategyId.substring(0, 8)}`,
        allocation: a.allocation,
        currentValue: value,
        return: value - a.currentValue,
        returnPercentage: return_,
        riskMetrics: this.mockRiskMetrics(),
      };
    });

    // Calculate portfolio returns
    const totalStrategyReturn = strategyPerformance.reduce(
      (sum, s) => sum + s.return,
      0
    );

    // Calculate correlations
    const correlations = [];
    for (let i = 0; i < allocations.length; i++) {
      for (let j = i + 1; j < allocations.length; j++) {
        correlations.push({
          strategy1Id: allocations[i].strategyId,
          strategy2Id: allocations[j].strategyId,
          correlation: Math.random() * 0.6 - 0.3,
        });
      }
    }

    const avgCorr =
      correlations.length > 0
        ? correlations.reduce((s, c) => s + c.correlation, 0) /
          correlations.length
        : 0;

    return {
      portfolioId,
      totalValue: portfolio.currentValue + totalStrategyReturn,
      totalReturn: portfolio.totalReturn + totalStrategyReturn,
      returnPercentage:
        ((portfolio.totalReturn + totalStrategyReturn) /
          portfolio.initialCapital) *
        100,
      dailyReturn: totalStrategyReturn / portfolio.currentValue,
      dailyReturnPercentage:
        (totalStrategyReturn / portfolio.currentValue) * 100,
      riskMetrics: this.aggregateRiskMetrics(
        strategyPerformance.map((s) => s.riskMetrics)
      ),
      strategyPerformance,
      correlations,
      numberOfStrategies: allocations.length,
      effectiveDiversification: Math.max(0, Math.min(1, 1 - Math.abs(avgCorr))),
      averageAllocation: 100 / allocations.length,
      allocationStdDev: this.calculateAllocationStdDev(
        allocations.map((a) => a.allocation)
      ),
      calculatedAt: new Date(),
      lastUpdateAt: portfolio.updatedAt,
    };
  }

  /**
   * Analyze portfolio risk
   */
  async analyzeRisk(
    userId: string,
    portfolioId: string
  ): Promise<RiskAnalysis> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    const metrics = await this.getPortfolioMetrics(userId, portfolioId);
    const risks = [];
    let overallRiskLevel = "LOW";

    // Check correlations
    const avgCorr =
      metrics.correlations.length > 0
        ? metrics.correlations.reduce((s, c) => s + c.correlation, 0) /
          metrics.correlations.length
        : 0;

    if (avgCorr > 0.7) {
      risks.push({
        type: "HIGH_CORRELATION" as const,
        severity: "HIGH" as const,
        description:
          "Strategies are highly correlated, reducing diversification benefits",
        affectedStrategies: metrics.strategyPerformance.map((s) => s.strategyId),
        recommendation:
          "Consider adding less correlated strategies or reducing allocation to some strategies",
      });
      overallRiskLevel = "HIGH";
    }

    // Check volatility
    if (metrics.riskMetrics.volatility > 25) {
      risks.push({
        type: "HIGH_VOLATILITY" as const,
        severity: "MEDIUM" as const,
        description: "Portfolio volatility is above 25%",
        affectedStrategies: metrics.strategyPerformance
          .filter((s) => s.riskMetrics.volatility > 20)
          .map((s) => s.strategyId),
        recommendation:
          "Review strategy parameters or reduce allocation to volatile strategies",
      });
    }

    // Check concentration
    const maxAllocation = Math.max(
      ...metrics.strategyPerformance.map((s) => s.allocation)
    );
    if (maxAllocation > 50) {
      risks.push({
        type: "CONCENTRATION" as const,
        severity: "MEDIUM" as const,
        description: "Portfolio has high concentration in single strategy",
        affectedStrategies: metrics.strategyPerformance
          .filter((s) => s.allocation > 40)
          .map((s) => s.strategyId),
        recommendation: "Rebalance to reduce concentration risk",
      });
    }

    // Check drawdown
    if (metrics.riskMetrics.maxDrawdown < -20) {
      risks.push({
        type: "DRAWDOWN" as const,
        severity: "HIGH" as const,
        description: "Maximum drawdown exceeds 20%",
        affectedStrategies: metrics.strategyPerformance
          .filter((s) => s.riskMetrics.maxDrawdown < -15)
          .map((s) => s.strategyId),
        recommendation:
          "Review risk management settings and consider stop-loss orders",
      });
    }

    const recommendations = risks.map((r) => r.recommendation);

    return {
      portfolioId,
      riskMetrics: metrics.riskMetrics,
      risks,
      overallRiskLevel:
        overallRiskLevel === "HIGH" && maxAllocation > 60
          ? ("CRITICAL" as const)
          : (overallRiskLevel as any),
      recommendations,
      analyzedAt: new Date(),
    };
  }

  /**
   * Compare performance across periods
   */
  async comparePerformance(
    userId: string,
    portfolioId: string
  ): Promise<PerformanceComparison> {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    const allocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];

    const periods = [
      {
        period: "1D" as const,
        daysBack: 1,
      },
      {
        period: "1W" as const,
        daysBack: 7,
      },
      {
        period: "1M" as const,
        daysBack: 30,
      },
      {
        period: "3M" as const,
        daysBack: 90,
      },
      {
        period: "6M" as const,
        daysBack: 180,
      },
      {
        period: "YTD" as const,
        daysBack: 365,
      },
      {
        period: "1Y" as const,
        daysBack: 365,
      },
    ];

    const results = periods.map((p) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - p.daysBack);
      const endDate = new Date();

      const portfolioReturn = Math.random() * 20 - 5;
      const strategyReturns = allocations.map((a) => {
        const return_ = Math.random() * 25 - 7;
        return {
          strategyId: a.strategyId,
          return: (a.currentValue * return_) / 100,
          returnPercentage: return_,
          allocation: a.allocation,
          contribution: (return_ * a.allocation) / 100,
        };
      });

      const benchmarkReturn = Math.random() * 15 - 3;
      const alphaGenerated = portfolioReturn - benchmarkReturn;

      return {
        period: p.period,
        startDate,
        endDate,
        portfolioReturn: (portfolio.currentValue * portfolioReturn) / 100,
        portfolioReturnPercentage: portfolioReturn,
        strategyReturns,
        benchmarkReturn,
        alphaGenerated,
      };
    });

    return {
      portfolioId,
      periods: results,
    };
  }

  /**
   * Update portfolio metrics from backtest results
   */
  async updateMetricsFromBacktest(
    userId: string,
    portfolioId: string,
    strategyId: string,
    backtestResult: any
  ) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio || portfolio.userId !== userId) {
      throw new Error("Portfolio not found");
    }

    const allocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];

    const allocation = allocations.find((a) => a.strategyId === strategyId);
    if (!allocation) {
      throw new Error("Strategy not in portfolio");
    }

    // Update allocation with new metrics
    allocation.performanceMetric = backtestResult.sharpeRatio;

    // Update portfolio return
    const newReturn = portfolio.totalReturn + backtestResult.totalReturn;

    await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        totalReturn: newReturn,
        returnPercentage: (newReturn / portfolio.initialCapital) * 100,
        allocationData: JSON.stringify(allocations),
        updatedAt: new Date(),
      },
    });

    return this.getPortfolio(userId, portfolioId);
  }

  /**
   * Helper: Format portfolio response
   */
  private formatPortfolioResponse(portfolio: any) {
    const allocations = JSON.parse(
      portfolio.allocationData as string
    ) as PortfolioAllocation[];
    const tags = JSON.parse(portfolio.tags as string || "[]") as string[];

    return {
      id: portfolio.id,
      userId: portfolio.userId,
      name: portfolio.name,
      description: portfolio.description,
      initialCapital: portfolio.initialCapital,
      currentValue: portfolio.currentValue,
      totalReturn: portfolio.totalReturn,
      returnPercentage: portfolio.returnPercentage,
      currency: portfolio.currency,
      riskTolerance: portfolio.riskTolerance,
      status: portfolio.status,
      allocationStrategy: portfolio.allocationStrategy,
      allocations,
      tags,
      numberOfStrategies: allocations.length,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    };
  }

  /**
   * Helper: Mock risk metrics
   */
  private mockRiskMetrics(): RiskMetrics {
    return {
      volatility: Math.random() * 30 + 5,
      sharpeRatio: Math.random() * 2 + 0.5,
      sortinoRatio: Math.random() * 2.5 + 0.7,
      calmarRatio: Math.random() * 1.5 + 0.3,
      maxDrawdown: Math.random() * 25 - 30,
      beta: Math.random() * 0.6 + 0.7,
      var95: Math.random() * 15 - 20,
      cvar95: Math.random() * 20 - 25,
    };
  }

  /**
   * Helper: Aggregate risk metrics
   */
  private aggregateRiskMetrics(metrics: RiskMetrics[]): RiskMetrics {
    if (metrics.length === 0) {
      return this.mockRiskMetrics();
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      volatility: avg(metrics.map((m) => m.volatility)) * 0.85, // Diversification reduces volatility
      sharpeRatio: avg(metrics.map((m) => m.sharpeRatio)),
      sortinoRatio: avg(metrics.map((m) => m.sortinoRatio)),
      calmarRatio: avg(metrics.map((m) => m.calmarRatio)),
      maxDrawdown: Math.min(...metrics.map((m) => m.maxDrawdown)),
      beta: avg(metrics.map((m) => m.beta || 1)),
      var95: avg(metrics.map((m) => m.var95 || -15)),
      cvar95: avg(metrics.map((m) => m.cvar95 || -20)),
    };
  }

  /**
   * Helper: Calculate allocation standard deviation
   */
  private calculateAllocationStdDev(allocations: number[]): number {
    const mean = allocations.reduce((a, b) => a + b, 0) / allocations.length;
    const variance =
      allocations.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) /
      allocations.length;
    return Math.sqrt(variance);
  }
}

export default PortfolioService;
