/**
 * Portfolio Management Routes
 * 
 * REST API endpoints for managing portfolios, including CRUD operations,
 * strategy management, rebalancing, correlation analysis, and risk assessment
 */

import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import PortfolioService from "../../services/portfolio/PortfolioService";
import {
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  AddStrategyRequest,
  RemoveStrategyRequest,
  AllocationStrategy,
  ListPortfoliosFilter,
} from "../../services/portfolio/types/portfolio.types";

const router = Router();
const prisma = new PrismaClient();
const portfolioService = new PortfolioService(prisma);

// Middleware para extrair userId (simplified - assume vem do auth)
const extractUserId = (req: Request): string => {
  return (req as any).userId || "user-default";
};

// Error handler wrapper
const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: any) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

/**
 * POST /api/portfolios/create
 * Create a new portfolio
 */
router.post(
  "/create",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const config: CreatePortfolioRequest = req.body;

    // Validation
    if (!config.name || config.name.trim().length === 0) {
      return res.status(400).json({ error: "Portfolio name is required" });
    }

    if (config.initialCapital <= 0) {
      return res
        .status(400)
        .json({ error: "Initial capital must be greater than 0" });
    }

    if (!config.allocations || config.allocations.length === 0) {
      return res.status(400).json({
        error: "At least one strategy allocation is required",
      });
    }

    const totalAllocation = config.allocations.reduce(
      (sum: number, a: any) => sum + a.allocation,
      0
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return res
        .status(400)
        .json({ error: "Allocations must sum to 100%" });
    }

    try {
      const portfolio = await portfolioService.createPortfolio(userId, config);

      return res.status(201).json({
        success: true,
        message: "Portfolio created successfully",
        portfolio,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to create portfolio",
      });
    }
  })
);

/**
 * GET /api/portfolios/:id
 * Get a specific portfolio
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;

    try {
      const portfolio = await portfolioService.getPortfolio(userId, portfolioId);

      return res.status(200).json({
        success: true,
        portfolio,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        error: error.message || "Portfolio not found",
      });
    }
  })
);

/**
 * GET /api/portfolios
 * List portfolios with optional filters
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);

    const filters: ListPortfoliosFilter = {
      status: req.query.status as any,
      riskTolerance: req.query.riskTolerance as any,
      allocationStrategy: req.query.allocationStrategy as any,
      minCapital: req.query.minCapital ? Number(req.query.minCapital) : undefined,
      maxCapital: req.query.maxCapital ? Number(req.query.maxCapital) : undefined,
      sortBy: (req.query.sortBy as any) || "createdAt",
      order: (req.query.order as any) || "DESC",
      skip: req.query.skip ? Number(req.query.skip) : 0,
      take: req.query.take ? Number(req.query.take) : 20,
    };

    try {
      const portfolios = await portfolioService.listPortfolios(userId, filters);

      return res.status(200).json({
        success: true,
        count: portfolios.length,
        portfolios,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to list portfolios",
      });
    }
  })
);

/**
 * PUT /api/portfolios/:id
 * Update portfolio configuration
 */
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;
    const update: UpdatePortfolioRequest = req.body;

    // Validate allocations if provided
    if (update.allocations) {
      const totalAllocation = update.allocations.reduce(
        (sum: number, a: any) => sum + a.allocation,
        0
      );
      if (Math.abs(totalAllocation - 100) > 0.01) {
        return res
          .status(400)
          .json({ error: "Allocations must sum to 100%" });
      }
    }

    try {
      const portfolio = await portfolioService.updatePortfolio(
        userId,
        portfolioId,
        update
      );

      return res.status(200).json({
        success: true,
        message: "Portfolio updated successfully",
        portfolio,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to update portfolio",
      });
    }
  })
);

/**
 * DELETE /api/portfolios/:id
 * Delete portfolio
 */
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;

    try {
      const result = await portfolioService.deletePortfolio(userId, portfolioId);

      return res.status(200).json({
        success: true,
        message: "Portfolio deleted successfully",
        result,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        error: error.message || "Portfolio not found",
      });
    }
  })
);

/**
 * POST /api/portfolios/:id/add-strategy
 * Add strategy to portfolio
 */
router.post(
  "/:id/add-strategy",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;
    const request: AddStrategyRequest = req.body;

    // Validation
    if (!request.strategyId || request.strategyId.trim().length === 0) {
      return res.status(400).json({ error: "Strategy ID is required" });
    }

    if (request.allocation <= 0 || request.allocation > 100) {
      return res
        .status(400)
        .json({ error: "Allocation must be between 0 and 100" });
    }

    try {
      const portfolio = await portfolioService.addStrategy(
        userId,
        portfolioId,
        request
      );

      return res.status(200).json({
        success: true,
        message: "Strategy added to portfolio",
        portfolio,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to add strategy",
      });
    }
  })
);

/**
 * POST /api/portfolios/:id/remove-strategy
 * Remove strategy from portfolio
 */
router.post(
  "/:id/remove-strategy",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;
    const request: RemoveStrategyRequest = req.body;

    // Validation
    if (!request.strategyId || request.strategyId.trim().length === 0) {
      return res.status(400).json({ error: "Strategy ID is required" });
    }

    try {
      const portfolio = await portfolioService.removeStrategy(
        userId,
        portfolioId,
        request
      );

      return res.status(200).json({
        success: true,
        message: "Strategy removed from portfolio",
        portfolio,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to remove strategy",
      });
    }
  })
);

/**
 * POST /api/portfolios/:id/rebalance
 * Rebalance portfolio using specified strategy
 */
router.post(
  "/:id/rebalance",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;
    const { strategy } = req.body;

    // Validation
    if (!strategy || !Object.values(AllocationStrategy).includes(strategy)) {
      return res.status(400).json({
        error: `Invalid allocation strategy. Valid options: ${Object.values(
          AllocationStrategy
        ).join(", ")}`,
      });
    }

    try {
      const result = await portfolioService.rebalancePortfolio(
        userId,
        portfolioId,
        strategy
      );

      return res.status(200).json({
        success: true,
        message: "Portfolio rebalanced successfully",
        rebalanceResult: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to rebalance portfolio",
      });
    }
  })
);

/**
 * GET /api/portfolios/:id/metrics
 * Get portfolio metrics and performance
 */
router.get(
  "/:id/metrics",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;

    try {
      const metrics = await portfolioService.getPortfolioMetrics(
        userId,
        portfolioId
      );

      return res.status(200).json({
        success: true,
        metrics,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to get portfolio metrics",
      });
    }
  })
);

/**
 * GET /api/portfolios/:id/correlation
 * Analyze correlation between portfolio strategies
 */
router.get(
  "/:id/correlation",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;

    try {
      const correlation = await portfolioService.calculateCorrelation(
        userId,
        portfolioId
      );

      return res.status(200).json({
        success: true,
        correlation,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to calculate correlation",
      });
    }
  })
);

/**
 * GET /api/portfolios/:id/risk-analysis
 * Analyze portfolio risk
 */
router.get(
  "/:id/risk-analysis",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;

    try {
      const riskAnalysis = await portfolioService.analyzeRisk(
        userId,
        portfolioId
      );

      return res.status(200).json({
        success: true,
        riskAnalysis,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to analyze risk",
      });
    }
  })
);

/**
 * GET /api/portfolios/:id/performance
 * Compare portfolio performance across periods
 */
router.get(
  "/:id/performance",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const portfolioId = req.params.id;

    try {
      const performance = await portfolioService.comparePerformance(
        userId,
        portfolioId
      );

      return res.status(200).json({
        success: true,
        performance,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message || "Failed to compare performance",
      });
    }
  })
);

export default router;
