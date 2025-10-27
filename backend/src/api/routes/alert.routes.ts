/**
 * Alert Routes
 * 
 * REST API endpoints for alert management
 * Supports CRUD operations, channel testing, and alert delivery
 */

import { Router, Request, Response } from "express";
import AlertService from "../../services/alert/AlertService";
import { PrismaClient } from "@prisma/client";
import {
  CreateAlertRequest,
  UpdateAlertRequest,
  SendAlertRequest,
  AlertChannel,
} from "../../services/alert/types/alert.types";

const router = Router();
const prisma = new PrismaClient();
const alertService = new AlertService(prisma);

/**
 * Helper: Async error wrapper
 */
const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Helper: Extract user ID from request
 */
const extractUserId = (req: Request): string => {
  // In production: Get from JWT token
  return (req as any).userId || "user-" + Date.now();
};

/**
 * POST /api/alerts/create
 * Create a new alert
 */
router.post(
  "/create",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const body: CreateAlertRequest = req.body;

    // Validation
    if (!body.name || body.name.trim().length === 0) {
      return res.status(400).json({ error: "Alert name is required" });
    }

    if (!body.channels || body.channels.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one channel must be specified" });
    }

    if (!body.type) {
      return res.status(400).json({ error: "Alert type is required" });
    }

    const alert = await alertService.createAlert(userId, body);
    return res.status(201).json(alert);
  })
);

/**
 * GET /api/alerts/:id
 * Get a single alert
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    const alert = await alertService.getAlert(userId, id);
    return res.json(alert);
  })
);

/**
 * GET /api/alerts
 * List alerts with filters
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const { skip, take, type, enabled, priority, sortBy, order } = req.query;

    const filters: any = {
      skip: skip ? parseInt(skip as string) : 0,
      take: take ? parseInt(take as string) : 20,
      type: type ? (type as string) : undefined,
      enabled: enabled === "true" ? true : enabled === "false" ? false : undefined,
      priority: priority ? (priority as string) : undefined,
      sortBy: sortBy ? (sortBy as string) : undefined,
      order: order ? (order as string) : "DESC",
    };

    // Validate pagination
    if (filters.skip < 0 || filters.take < 1 || filters.take > 100) {
      return res
        .status(400)
        .json({ error: "Invalid pagination parameters" });
    }

    const alerts = await alertService.listAlerts(userId, filters);
    return res.json({ data: alerts, count: alerts.length });
  })
);

/**
 * PUT /api/alerts/:id
 * Update alert
 */
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;
    const body: UpdateAlertRequest = req.body;

    if (!id) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    if (Object.keys(body).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const alert = await alertService.updateAlert(userId, id, body);
    return res.json(alert);
  })
);

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    const result = await alertService.deleteAlert(userId, id);
    return res.json(result);
  })
);

/**
 * POST /api/alerts/:id/enable
 * Enable alert
 */
router.post(
  "/:id/enable",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    const alert = await alertService.updateAlert(userId, id, {
      enabled: true,
    });
    return res.json(alert);
  })
);

/**
 * POST /api/alerts/:id/disable
 * Disable alert
 */
router.post(
  "/:id/disable",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    const alert = await alertService.updateAlert(userId, id, {
      enabled: false,
    });
    return res.json(alert);
  })
);

/**
 * POST /api/alerts/send
 * Send alert manually
 */
router.post(
  "/send",
  asyncHandler(async (req: Request, res: Response) => {
    const body: SendAlertRequest = req.body;

    // Validation
    if (!body.payload) {
      return res.status(400).json({ error: "Alert payload is required" });
    }

    if (!body.payload.type) {
      return res.status(400).json({ error: "Alert type is required" });
    }

    if (!body.payload.title || body.payload.title.trim().length === 0) {
      return res.status(400).json({ error: "Alert title is required" });
    }

    if (!body.payload.message || body.payload.message.trim().length === 0) {
      return res.status(400).json({ error: "Alert message is required" });
    }

    if (!body.channels || body.channels.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one channel is required" });
    }

    const result = await alertService.sendAlert(body);
    return res.status(200).json(result);
  })
);

/**
 * POST /api/alerts/:id/test-channel
 * Test channel connectivity
 */
router.post(
  "/:id/test-channel",
  asyncHandler(async (req: Request, res: Response) => {
    const { channel } = req.body;

    // Validation
    if (!channel) {
      return res.status(400).json({ error: "Channel is required" });
    }

    if (!Object.values(AlertChannel).includes(channel)) {
      return res.status(400).json({
        error: `Invalid channel. Supported: ${Object.values(AlertChannel).join(", ")}`,
      });
    }

    const result = await alertService.testChannel(channel);
    return res.json(result);
  })
);

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
router.get(
  "/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = extractUserId(req);
    const stats = await alertService.getStatistics(userId);
    return res.json(stats);
  })
);

/**
 * GET /api/alerts/:id/history
 * Get alert send history
 */
router.get(
  "/:id/history",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Alert ID is required" });
    }

    const history = alertService.getAlertHistory(id);

    if (!history) {
      return res.status(404).json({ error: "Alert history not found" });
    }

    return res.json(history);
  })
);

/**
 * POST /api/alerts/webhook/handle
 * Handle incoming webhook (for external services)
 */
router.post(
  "/webhook/handle",
  asyncHandler(async (req: Request, res: Response) => {
    const { type, payload } = req.body;

    // Validation
    if (!type || !payload) {
      return res.status(400).json({ error: "Type and payload are required" });
    }

    // In production: Validate webhook signature
    // Process webhook and send alerts to configured users

    return res.json({ success: true, message: "Webhook processed" });
  })
);

/**
 * Error handler
 */
router.use((err: any, _req: Request, res: Response) => {
  console.error("Alert route error:", err);

  if (err.message.includes("not found")) {
    return res.status(404).json({ error: err.message });
  }

  if (err.message.includes("required")) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default router;
