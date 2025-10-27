/**
 * Portfolio Service Tests
 * 
 * Comprehensive test suite covering all portfolio management operations
 * including CRUD, allocation, rebalancing, correlation, and risk analysis
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import PortfolioService from "../PortfolioService";
import { AllocationStrategy, PortfolioStatus } from "../types/portfolio.types";

// Mock Prisma
const mockPrisma = {
  portfolio: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  strategy: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

describe("PortfolioService", () => {
  let service: PortfolioService;
  const userId = "user-123";
  const portfolioId = "portfolio-123";

  beforeEach(() => {
    service = new PortfolioService(mockPrisma as any);
    vi.clearAllMocks();
  });

  // ===== CREATE PORTFOLIO TESTS =====
  describe("createPortfolio", () => {
    it("should create a portfolio with valid configuration", async () => {
      const config = {
        name: "Tech Portfolio",
        initialCapital: 10000,
        currency: "USD",
        riskTolerance: "MEDIUM" as const,
        allocationStrategy: AllocationStrategy.EQUAL_WEIGHT,
        allocations: [
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ],
      };

      mockPrisma.strategy.findMany.mockResolvedValue([
        { id: "s1", userId },
        { id: "s2", userId },
      ]);

      mockPrisma.portfolio.create.mockResolvedValue({
        id: portfolioId,
        userId,
        name: config.name,
        initialCapital: config.initialCapital,
        currentValue: config.initialCapital,
        status: PortfolioStatus.DRAFT,
        allocationData: JSON.stringify(config.allocations),
        tags: JSON.stringify([]),
      });

      const result = await service.createPortfolio(userId, config as any);

      expect(result).toBeDefined();
      expect(result.name).toBe(config.name);
      expect(mockPrisma.portfolio.create).toHaveBeenCalled();
    });

    it("should reject portfolio without name", async () => {
      const config = {
        name: "",
        initialCapital: 10000,
        allocations: [],
        riskTolerance: "MEDIUM" as const,
        allocationStrategy: AllocationStrategy.EQUAL_WEIGHT,
      };

      await expect(
        service.createPortfolio(userId, config as any)
      ).rejects.toThrow("Portfolio name is required");
    });

    it("should reject invalid initial capital", async () => {
      const config = {
        name: "Test",
        initialCapital: -1000,
        allocations: [],
        riskTolerance: "MEDIUM" as const,
        allocationStrategy: AllocationStrategy.EQUAL_WEIGHT,
      };

      await expect(
        service.createPortfolio(userId, config as any)
      ).rejects.toThrow("Initial capital must be greater than 0");
    });

    it("should reject portfolio without allocations", async () => {
      const config = {
        name: "Test",
        initialCapital: 10000,
        allocations: [],
        riskTolerance: "MEDIUM" as const,
        allocationStrategy: AllocationStrategy.EQUAL_WEIGHT,
      };

      await expect(
        service.createPortfolio(userId, config as any)
      ).rejects.toThrow("At least one strategy allocation is required");
    });

    it("should reject allocations not summing to 100%", async () => {
      const config = {
        name: "Test",
        initialCapital: 10000,
        allocations: [
          { strategyId: "s1", allocation: 40, currentValue: 4000, targetValue: 4000 },
          { strategyId: "s2", allocation: 40, currentValue: 4000, targetValue: 4000 },
        ],
        riskTolerance: "MEDIUM" as const,
        allocationStrategy: AllocationStrategy.EQUAL_WEIGHT,
      };

      await expect(
        service.createPortfolio(userId, config as any)
      ).rejects.toThrow("Allocations must sum to 100%");
    });

    it("should reject non-existent strategies", async () => {
      const config = {
        name: "Test",
        initialCapital: 10000,
        allocations: [
          { strategyId: "s1", allocation: 100, currentValue: 10000, targetValue: 10000 },
        ],
        riskTolerance: "MEDIUM" as const,
        allocationStrategy: AllocationStrategy.EQUAL_WEIGHT,
      };

      mockPrisma.strategy.findMany.mockResolvedValue([]);

      await expect(
        service.createPortfolio(userId, config as any)
      ).rejects.toThrow("Some strategies not found or do not belong to user");
    });
  });

  // ===== GET PORTFOLIO TESTS =====
  describe("getPortfolio", () => {
    it("should retrieve portfolio successfully", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        name: "Test Portfolio",
        initialCapital: 10000,
        currentValue: 10500,
        status: PortfolioStatus.ACTIVE,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10500, targetValue: 10000 },
        ]),
        tags: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getPortfolio(userId, portfolioId);

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Portfolio");
    });

    it("should reject portfolio not found", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null);

      await expect(
        service.getPortfolio(userId, portfolioId)
      ).rejects.toThrow("Portfolio not found");
    });

    it("should reject portfolio from different user", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId: "other-user",
      });

      await expect(
        service.getPortfolio(userId, portfolioId)
      ).rejects.toThrow("Portfolio not found");
    });
  });

  // ===== LIST PORTFOLIOS TESTS =====
  describe("listPortfolios", () => {
    it("should list portfolios for user", async () => {
      mockPrisma.portfolio.findMany.mockResolvedValue([
        {
          id: "p1",
          userId,
          name: "Portfolio 1",
          allocationData: "[]",
          tags: "[]",
        },
        {
          id: "p2",
          userId,
          name: "Portfolio 2",
          allocationData: "[]",
          tags: "[]",
        },
      ]);

      const result = await service.listPortfolios(userId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.portfolio.findMany).toHaveBeenCalled();
    });

    it("should apply filters correctly", async () => {
      mockPrisma.portfolio.findMany.mockResolvedValue([]);

      await service.listPortfolios(userId, {
        status: PortfolioStatus.ACTIVE,
        riskTolerance: "HIGH",
      });

      expect(mockPrisma.portfolio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PortfolioStatus.ACTIVE,
            riskTolerance: "HIGH",
          }),
        })
      );
    });
  });

  // ===== UPDATE PORTFOLIO TESTS =====
  describe("updatePortfolio", () => {
    it("should update portfolio successfully", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        name: "Old Name",
        allocationData: "[]",
        tags: "[]",
      });

      mockPrisma.portfolio.update.mockResolvedValue({
        id: portfolioId,
        userId,
        name: "New Name",
        allocationData: "[]",
        tags: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updatePortfolio(userId, portfolioId, {
        name: "New Name",
      });

      expect(result.name).toBe("New Name");
    });

    it("should reject non-existent portfolio", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePortfolio(userId, portfolioId, { name: "New" })
      ).rejects.toThrow("Portfolio not found");
    });
  });

  // ===== DELETE PORTFOLIO TESTS =====
  describe("deletePortfolio", () => {
    it("should delete portfolio successfully", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
      });

      mockPrisma.portfolio.delete.mockResolvedValue({ id: portfolioId });

      const result = await service.deletePortfolio(userId, portfolioId);

      expect(result.success).toBe(true);
      expect(mockPrisma.portfolio.delete).toHaveBeenCalled();
    });
  });

  // ===== ADD STRATEGY TESTS =====
  describe("addStrategy", () => {
    it("should add strategy to portfolio", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        currentValue: 10000,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
        tags: "[]",
      });

      mockPrisma.strategy.findUnique.mockResolvedValue({
        id: "s2",
        userId,
      });

      mockPrisma.portfolio.update.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
        tags: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.addStrategy(userId, portfolioId, {
        strategyId: "s2",
        allocation: 50,
      });

      expect(result.numberOfStrategies).toBe(2);
    });
  });

  // ===== REMOVE STRATEGY TESTS =====
  describe("removeStrategy", () => {
    it("should remove strategy from portfolio", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
        tags: "[]",
      });

      mockPrisma.portfolio.update.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
        tags: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.removeStrategy(userId, portfolioId, {
        strategyId: "s2",
      });

      expect(result.numberOfStrategies).toBe(1);
    });

    it("should reject removing last strategy", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10000, targetValue: 10000 },
        ]),
        tags: "[]",
      });

      await expect(
        service.removeStrategy(userId, portfolioId, { strategyId: "s1" })
      ).rejects.toThrow("Cannot remove last strategy from portfolio");
    });
  });

  // ===== CALCULATE CORRELATION TESTS =====
  describe("calculateCorrelation", () => {
    it("should calculate correlation between strategies", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
        tags: "[]",
      });

      mockPrisma.strategy.findMany.mockResolvedValue([
        { id: "s1", userId, name: "Strategy 1", type: "RSI_CROSSOVER" },
        { id: "s2", userId, name: "Strategy 2", type: "RSI_CROSSOVER" },
      ]);

      const result = await service.calculateCorrelation(userId, portfolioId);

      expect(result.pairs).toBeDefined();
      expect(result.pairs.length).toBeGreaterThan(0);
      expect(result.averageCorrelation).toBeDefined();
      expect(result.diversificationScore).toBeDefined();
    });
  });

  // ===== REBALANCE PORTFOLIO TESTS =====
  describe("rebalancePortfolio", () => {
    it("should rebalance to equal weight", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        currentValue: 10000,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 70, currentValue: 7000, targetValue: 7000 },
          { strategyId: "s2", allocation: 30, currentValue: 3000, targetValue: 3000 },
        ]),
        tags: "[]",
      });

      mockPrisma.portfolio.update.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
      });

      const result = await service.rebalancePortfolio(
        userId,
        portfolioId,
        AllocationStrategy.EQUAL_WEIGHT
      );

      expect(result.success).toBe(true);
      expect(result.changes).toBeDefined();
      expect(result.reason).toContain("equal weight");
    });

    it("should calculate allocation changes", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        currentValue: 10000,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 70, currentValue: 7000, targetValue: 7000 },
          { strategyId: "s2", allocation: 30, currentValue: 3000, targetValue: 3000 },
        ]),
        tags: "[]",
      });

      mockPrisma.portfolio.update.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
      });

      const result = await service.rebalancePortfolio(
        userId,
        portfolioId,
        AllocationStrategy.EQUAL_WEIGHT
      );

      expect(result.changes[0].allocationChange).toBe(-20);
      expect(result.changes[1].allocationChange).toBe(20);
    });
  });

  // ===== GET PORTFOLIO METRICS TESTS =====
  describe("getPortfolioMetrics", () => {
    it("should calculate portfolio metrics", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        initialCapital: 10000,
        currentValue: 10500,
        totalReturn: 500,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10500, targetValue: 10000 },
        ]),
        updatedAt: new Date(),
        tags: "[]",
      });

      const result = await service.getPortfolioMetrics(userId, portfolioId);

      expect(result.portfolioId).toBe(portfolioId);
      expect(result.riskMetrics).toBeDefined();
      expect(result.strategyPerformance).toBeDefined();
      expect(result.numberOfStrategies).toBe(1);
    });

    it("should aggregate risk metrics", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        initialCapital: 10000,
        currentValue: 10500,
        totalReturn: 500,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5250, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5250, targetValue: 5000 },
        ]),
        updatedAt: new Date(),
        tags: "[]",
      });

      const result = await service.getPortfolioMetrics(userId, portfolioId);

      expect(result.riskMetrics.sharpeRatio).toBeDefined();
      expect(result.riskMetrics.volatility).toBeDefined();
    });
  });

  // ===== ANALYZE RISK TESTS =====
  describe("analyzeRisk", () => {
    it("should analyze portfolio risk", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        initialCapital: 10000,
        currentValue: 10500,
        totalReturn: 500,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10500, targetValue: 10000 },
        ]),
        updatedAt: new Date(),
        tags: "[]",
      });

      const result = await service.analyzeRisk(userId, portfolioId);

      expect(result.riskMetrics).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.overallRiskLevel).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("should identify high correlation risk", async () => {
      const highCorrAllocation = JSON.stringify([
        { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
        { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
      ]);

      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        initialCapital: 10000,
        currentValue: 10000,
        totalReturn: 0,
        allocationData: highCorrAllocation,
        updatedAt: new Date(),
        tags: "[]",
      });

      const result = await service.analyzeRisk(userId, portfolioId);

      expect(result.risks).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  // ===== COMPARE PERFORMANCE TESTS =====
  describe("comparePerformance", () => {
    it("should compare performance across periods", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        initialCapital: 10000,
        currentValue: 10500,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10500, targetValue: 10000 },
        ]),
        tags: "[]",
      });

      const result = await service.comparePerformance(userId, portfolioId);

      expect(result.periods).toBeDefined();
      expect(result.periods.length).toBe(7);
      expect(result.periods[0].period).toBe("1D");
      expect(result.periods[6].period).toBe("1Y");
    });
  });

  // ===== UPDATE METRICS FROM BACKTEST TESTS =====
  describe("updateMetricsFromBacktest", () => {
    it("should update portfolio metrics from backtest", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        initialCapital: 10000,
        currentValue: 10500,
        totalReturn: 500,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10500, targetValue: 10000 },
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: "[]",
      });

      mockPrisma.portfolio.update.mockResolvedValue({
        id: portfolioId,
        userId,
        initialCapital: 10000,
        currentValue: 10500,
        totalReturn: 750,
        returnPercentage: 7.5,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10500, targetValue: 10000, performanceMetric: 1.2 },
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: "[]",
      });

      const result = await service.updateMetricsFromBacktest(
        userId,
        portfolioId,
        "s1",
        {
          totalReturn: 250,
          sharpeRatio: 1.2,
          sortinoRatio: 1.5,
          calmarRatio: 0.8,
          maxDrawdown: -15,
          winRate: 55,
        }
      );

      expect(result).toBeDefined();
      expect(mockPrisma.portfolio.update).toHaveBeenCalled();
    });
  });

  // ===== EDGE CASES =====
  describe("Edge Cases", () => {
    it("should handle portfolio with single strategy", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        currentValue: 10000,
        initialCapital: 10000,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 100, currentValue: 10000, targetValue: 10000 },
        ]),
        updatedAt: new Date(),
        tags: "[]",
      });

      const result = await service.getPortfolioMetrics(userId, portfolioId);

      expect(result.numberOfStrategies).toBe(1);
      expect(result.averageAllocation).toBe(100);
    });

    it("should handle portfolio with many strategies", async () => {
      const manyAllocations = Array.from({ length: 10 }, (_, i) => ({
        strategyId: `s${i}`,
        allocation: 10,
        currentValue: 1000,
        targetValue: 1000,
      }));

      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        currentValue: 10000,
        initialCapital: 10000,
        allocationData: JSON.stringify(manyAllocations),
        updatedAt: new Date(),
        tags: "[]",
      });

      const result = await service.getPortfolioMetrics(userId, portfolioId);

      expect(result.numberOfStrategies).toBe(10);
      expect(result.averageAllocation).toBe(10);
    });

    it("should handle zero correlation", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue({
        id: portfolioId,
        userId,
        allocationData: JSON.stringify([
          { strategyId: "s1", allocation: 50, currentValue: 5000, targetValue: 5000 },
          { strategyId: "s2", allocation: 50, currentValue: 5000, targetValue: 5000 },
        ]),
        tags: "[]",
      });

      mockPrisma.strategy.findMany.mockResolvedValue([
        { id: "s1", userId, name: "Strategy 1", type: "RSI_CROSSOVER" },
        { id: "s2", userId, name: "Strategy 2", type: "MACD" },
      ]);

      const result = await service.calculateCorrelation(userId, portfolioId);

      expect(result.diversificationScore).toBeGreaterThan(0);
      expect(result.diversificationScore).toBeLessThanOrEqual(100);
    });
  });
});
