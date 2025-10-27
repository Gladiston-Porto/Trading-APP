/**
 * AlertService Tests
 * 
 * Comprehensive test coverage for alert management system
 * Tests CRUD operations, alert sending, and channel management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import AlertService from "../AlertService";
import { AlertType, AlertChannel, AlertStatus, AlertPriority } from "../types/alert.types";

describe("AlertService", () => {
  let alertService: AlertService;
  let mockPrisma: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      alert: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    alertService = new AlertService(mockPrisma);
  });

  describe("CRUD Operations", () => {
    it("should create an alert", async () => {
      const userId = "user-123";
      const createRequest = {
        name: "Test Alert",
        description: "Test Description",
        type: AlertType.SIGNAL_BUY,
        channels: [AlertChannel.TELEGRAM, AlertChannel.EMAIL],
        channelConfigs: {
          [AlertChannel.TELEGRAM]: { botToken: "token", chatId: "123" },
          [AlertChannel.EMAIL]: { fromEmail: "test@example.com", toEmails: ["user@example.com"], provider: "gmail" },
        },
        priority: AlertPriority.HIGH,
        enabled: true,
        tags: ["test", "trading"],
      };

      const mockAlert = {
        id: "alert-123",
        userId,
        name: createRequest.name,
        description: createRequest.description,
        type: createRequest.type,
        channels: JSON.stringify(createRequest.channels),
        channelConfigs: JSON.stringify(createRequest.channelConfigs),
        priority: createRequest.priority,
        enabled: createRequest.enabled,
        tags: JSON.stringify(createRequest.tags),
        sendCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.alert.create.mockResolvedValue(mockAlert);

      const result = await alertService.createAlert(userId, createRequest as any);

      expect(result).toEqual(
        expect.objectContaining({
          id: "alert-123",
          userId,
          name: createRequest.name,
          type: createRequest.type,
          channels: createRequest.channels,
        })
      );
      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
    });

    it("should reject alert creation with missing name", async () => {
      const userId = "user-123";

      await expect(
        alertService.createAlert(userId, {
          name: "",
          channels: [AlertChannel.TELEGRAM],
          channelConfigs: { [AlertChannel.TELEGRAM]: {} },
          type: AlertType.SIGNAL_BUY,
        })
      ).rejects.toThrow("Alert name is required");
    });

    it("should reject alert creation with no channels", async () => {
      const userId = "user-123";

      await expect(
        alertService.createAlert(userId, {
          name: "Test",
          channels: [],
          channelConfigs: {},
          type: AlertType.SIGNAL_BUY,
        })
      ).rejects.toThrow("At least one channel must be specified");
    });

    it("should reject alert creation with missing channel config", async () => {
      const userId = "user-123";

      await expect(
        alertService.createAlert(userId, {
          name: "Test",
          channels: [AlertChannel.TELEGRAM],
          channelConfigs: {}, // Missing TELEGRAM config
          type: AlertType.SIGNAL_BUY,
        })
      ).rejects.toThrow("Configuration missing for channel:");
    });

    it("should get a single alert", async () => {
      const userId = "user-123";
      const alertId = "alert-123";

      const mockAlert = {
        id: alertId,
        userId,
        name: "Test Alert",
        type: AlertType.SIGNAL_BUY,
        channels: JSON.stringify([AlertChannel.TELEGRAM]),
        enabled: true,
        tags: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.alert.findUnique.mockResolvedValue(mockAlert);

      const result = await alertService.getAlert(userId, alertId);

      expect(result).toEqual(
        expect.objectContaining({
          id: alertId,
          userId,
          name: "Test Alert",
        })
      );
      expect(mockPrisma.alert.findUnique).toHaveBeenCalledWith({
        where: { id: alertId },
      });
    });

    it("should reject getting non-existent alert", async () => {
      const userId = "user-123";
      const alertId = "non-existent";

      mockPrisma.alert.findUnique.mockResolvedValue(null);

      await expect(
        alertService.getAlert(userId, alertId)
      ).rejects.toThrow("Alert not found");
    });

    it("should reject getting alert from different user", async () => {
      const userId = "user-123";
      const otherUserId = "user-456";
      const alertId = "alert-123";

      const mockAlert = {
        id: alertId,
        userId: otherUserId,
        name: "Test Alert",
        channels: JSON.stringify([AlertChannel.TELEGRAM]),
        tags: JSON.stringify([]),
      };

      mockPrisma.alert.findUnique.mockResolvedValue(mockAlert);

      await expect(
        alertService.getAlert(userId, alertId)
      ).rejects.toThrow("Alert not found");
    });

    it("should list alerts with filters", async () => {
      const userId = "user-123";

      const mockAlerts = [
        {
          id: "alert-1",
          userId,
          name: "Alert 1",
          type: AlertType.SIGNAL_BUY,
          priority: AlertPriority.HIGH,
          enabled: true,
          channels: JSON.stringify([AlertChannel.TELEGRAM]),
          tags: JSON.stringify([]),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "alert-2",
          userId,
          name: "Alert 2",
          type: AlertType.SIGNAL_SELL,
          priority: AlertPriority.LOW,
          enabled: true,
          channels: JSON.stringify([AlertChannel.EMAIL]),
          tags: JSON.stringify([]),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.alert.findMany.mockResolvedValue(mockAlerts);

      const result = await alertService.listAlerts(userId, {
        skip: 0,
        take: 20,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: "alert-1",
          name: "Alert 1",
        })
      );
    });

    it("should update alert", async () => {
      const userId = "user-123";
      const alertId = "alert-123";

      const mockAlert = {
        id: alertId,
        userId,
        name: "Updated Alert",
        description: "Updated",
        enabled: false,
        channels: JSON.stringify([AlertChannel.TELEGRAM]),
        tags: JSON.stringify([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrisma.alert.update.mockResolvedValue(mockAlert);

      const result = await alertService.updateAlert(userId, alertId, {
        name: "Updated Alert",
        enabled: false,
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: alertId,
          name: "Updated Alert",
          enabled: false,
        })
      );
      expect(mockPrisma.alert.update).toHaveBeenCalledOnce();
    });

    it("should delete alert", async () => {
      const userId = "user-123";
      const alertId = "alert-123";

      const mockAlert = {
        id: alertId,
        userId,
        name: "Test Alert",
      };

      mockPrisma.alert.findUnique.mockResolvedValue(mockAlert);
      mockPrisma.alert.delete.mockResolvedValue(mockAlert);

      const result = await alertService.deleteAlert(userId, alertId);

      expect(result).toEqual({ success: true, message: "Alert deleted" });
      expect(mockPrisma.alert.delete).toHaveBeenCalledWith({
        where: { id: alertId },
      });
    });
  });

  describe("Alert Sending", () => {
    it("should send alert through single channel", async () => {
      const request = {
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Buy Signal",
          message: "Buy opportunity detected",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      };

      const result = await alertService.sendAlert(request);

      expect(result).toEqual(
        expect.objectContaining({
          successCount: 1,
          failureCount: 0,
          totalSent: 1,
        })
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          channel: AlertChannel.TELEGRAM,
          status: AlertStatus.SENT,
        })
      );
    });

    it("should send alert through multiple channels", async () => {
      const request = {
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Buy Signal",
          message: "Buy opportunity detected",
          timestamp: new Date(),
        },
        channels: [
          AlertChannel.TELEGRAM,
          AlertChannel.EMAIL,
          AlertChannel.SLACK,
        ],
      };

      const result = await alertService.sendAlert(request);

      expect(result.results).toHaveLength(3);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it("should include delivery time in results", async () => {
      const request = {
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Buy Signal",
          message: "Buy opportunity detected",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      };

      const result = await alertService.sendAlert(request);

      expect(result.results[0].deliveryTime).toBeGreaterThan(0);
    });

    it("should track alert in history", async () => {
      const request = {
        alertId: "alert-123",
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Buy Signal",
          message: "Buy opportunity detected",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      };

      await alertService.sendAlert(request);

      const history = alertService.getAlertHistory("alert-123");
      expect(history).toBeDefined();
      expect(history?.alertId).toBe("alert-123");
    });

    it("should handle different alert types", async () => {
      const alertTypes = [
        AlertType.SIGNAL_BUY,
        AlertType.SIGNAL_SELL,
        AlertType.TP_HIT,
        AlertType.SL_HIT,
      ];

      for (const alertType of alertTypes) {
        const request = {
          payload: {
            type: alertType,
            title: `${alertType} Alert`,
            message: `This is a ${alertType} alert`,
            timestamp: new Date(),
          },
          channels: [AlertChannel.TELEGRAM],
        };

        const result = await alertService.sendAlert(request);

        expect(result.results[0].type).toBe(alertType);
        expect(result.successCount).toBeGreaterThan(0);
      }
    });
  });

  describe("Channel Testing", () => {
    it("should test telegram channel", async () => {
      const result = await alertService.testChannel(AlertChannel.TELEGRAM);

      expect(result.channel).toBe(AlertChannel.TELEGRAM);
      expect(result.success).toBe(true);
      expect(result.deliveryTime).toBeGreaterThan(0);
    });

    it("should test email channel", async () => {
      const result = await alertService.testChannel(AlertChannel.EMAIL);

      expect(result.channel).toBe(AlertChannel.EMAIL);
      expect(result.success).toBe(true);
    });

    it("should test all channel types", async () => {
      const channels = Object.values(AlertChannel);

      for (const channel of channels) {
        const result = await alertService.testChannel(channel);

        expect(result.success).toBe(true);
        expect(result.channel).toBe(channel);
        expect(result.deliveryTime).toBeGreaterThan(0);
      }
    });
  });

  describe("Statistics", () => {
    it("should calculate alert statistics", async () => {
      const userId = "user-123";

      mockPrisma.alert.findMany.mockResolvedValue([
        {
          id: "alert-1",
          enabled: true,
        },
        {
          id: "alert-2",
          enabled: false,
        },
        {
          id: "alert-3",
          enabled: true,
        },
      ]);

      const stats = await alertService.getStatistics(userId);

      expect(stats.userId).toBe(userId);
      expect(stats.totalAlerts).toBe(3);
      expect(stats.activeAlerts).toBe(2);
    });

    it("should calculate success rate", async () => {
      const userId = "user-123";
      const alertId = "alert-1";

      mockPrisma.alert.findMany.mockResolvedValue([
        {
          id: alertId,
          enabled: true,
        },
      ]);

      // Send test alerts with matching ID so they're counted in stats
      await alertService.sendAlert({
        alertId,
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Test",
          message: "Test",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      });

      const stats = await alertService.getStatistics(userId);

      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.failureRate).toBeLessThanOrEqual(100);
    });

    it("should calculate channel-specific stats", async () => {
      const userId = "user-123";
      const alertId = "alert-1";

      mockPrisma.alert.findMany.mockResolvedValue([
        {
          id: alertId,
          enabled: true,
        },
      ]);

      await alertService.sendAlert({
        alertId,
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Test",
          message: "Test",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM, AlertChannel.EMAIL],
      });

      const stats = await alertService.getStatistics(userId);

      expect(stats.byChannel[AlertChannel.TELEGRAM]).toBeDefined();
      expect(stats.byChannel[AlertChannel.TELEGRAM].total).toBeGreaterThan(0);
      expect(stats.byChannel[AlertChannel.EMAIL]).toBeDefined();
      expect(stats.byChannel[AlertChannel.EMAIL].total).toBeGreaterThan(0);
    });

    it("should calculate last 24 hours stats", async () => {
      const userId = "user-123";
      const alertId = "alert-1";

      mockPrisma.alert.findMany.mockResolvedValue([
        {
          id: alertId,
          enabled: true,
        },
      ]);

      await alertService.sendAlert({
        alertId,
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Test",
          message: "Test",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      });

      const stats = await alertService.getStatistics(userId);

      expect(stats.last24Hours.sent).toBeGreaterThan(0);
      expect(stats.last24Hours.failed).toBe(0);
    });
  });

  describe("History Management", () => {
    it("should retrieve alert history", async () => {
      const alertId = "alert-123";

      const request = {
        alertId,
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Test",
          message: "Test",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      };

      await alertService.sendAlert(request);

      const history = alertService.getAlertHistory(alertId);

      expect(history).toBeDefined();
      expect(history?.alertId).toBe(alertId);
      expect(history?.results).toBeDefined();
    });

    it("should return undefined for non-existent history", async () => {
      const history = alertService.getAlertHistory("non-existent");
      expect(history).toBeUndefined();
    });

    it("should clear old history", async () => {
      // Add some history
      await alertService.sendAlert({
        alertId: "alert-1",
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Test",
          message: "Test",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      });

      // Clear with 0 hours retention
      const removed = alertService.clearOldHistory(0);

      expect(removed).toBeGreaterThan(0);
      const history = alertService.getAlertHistory("alert-1");
      expect(history).toBeUndefined();
    });

    it("should preserve recent history when clearing old", async () => {
      const recentAlertId = "alert-recent";

      // Add recent alert
      await alertService.sendAlert({
        alertId: recentAlertId,
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Test",
          message: "Test",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      });

      // Clear with 1 week retention
      alertService.clearOldHistory(168);

      const history = alertService.getAlertHistory(recentAlertId);
      expect(history).toBeDefined();
    });
  });

  describe("Notification Templates", () => {
    it("should get buy signal template", async () => {
      const template = alertService.getNotificationTemplate(
        AlertType.SIGNAL_BUY,
        AlertChannel.TELEGRAM
      );

      expect(template).toEqual(
        expect.objectContaining({
          alertType: AlertType.SIGNAL_BUY,
          channel: AlertChannel.TELEGRAM,
          title: expect.any(String),
          body: expect.any(String),
        })
      );
    });

    it("should get sell signal template", async () => {
      const template = alertService.getNotificationTemplate(
        AlertType.SIGNAL_SELL,
        AlertChannel.EMAIL
      );

      expect(template).toEqual(
        expect.objectContaining({
          alertType: AlertType.SIGNAL_SELL,
          channel: AlertChannel.EMAIL,
        })
      );
    });

    it("should get take profit template", async () => {
      const template = alertService.getNotificationTemplate(
        AlertType.TP_HIT,
        AlertChannel.PUSH
      );

      expect(template).toEqual(
        expect.objectContaining({
          alertType: AlertType.TP_HIT,
          channel: AlertChannel.PUSH,
        })
      );
    });

    it("should get stop loss template", async () => {
      const template = alertService.getNotificationTemplate(
        AlertType.SL_HIT,
        AlertChannel.SLACK
      );

      expect(template).toEqual(
        expect.objectContaining({
          alertType: AlertType.SL_HIT,
          channel: AlertChannel.SLACK,
        })
      );
    });

    it("should get system error template", async () => {
      const template = alertService.getNotificationTemplate(
        AlertType.SYSTEM_ERROR,
        AlertChannel.WEBHOOK
      );

      expect(template).toEqual(
        expect.objectContaining({
          alertType: AlertType.SYSTEM_ERROR,
          channel: AlertChannel.WEBHOOK,
        })
      );
    });

    it("should provide templates for all channels", () => {
      const channels = Object.values(AlertChannel);

      for (const channel of channels) {
        const template = alertService.getNotificationTemplate(
          AlertType.SIGNAL_BUY,
          channel
        );

        expect(template).toBeDefined();
        expect(template.channel).toBe(channel);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle alerts with special characters", async () => {
      const request = {
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Alert: Buy! 📈 $BTC",
          message: 'Message with "quotes" and <html>',
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      };

      const result = await alertService.sendAlert(request);

      expect(result.successCount).toBeGreaterThan(0);
    });

    it("should handle very long alert messages", async () => {
      const longMessage = "A".repeat(5000);

      const request = {
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Long Message Test",
          message: longMessage,
          timestamp: new Date(),
        },
        channels: [AlertChannel.EMAIL],
      };

      const result = await alertService.sendAlert(request);

      expect(result.successCount).toBeGreaterThan(0);
    });

    it("should handle alerts with additional data", async () => {
      const request = {
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Buy Signal",
          message: "Buy opportunity detected",
          timestamp: new Date(),
          ticker: "BTC",
          price: 45000,
          data: {
            strategyId: "strat-123",
            confidence: 0.95,
            reason: "Golden Cross",
          },
        },
        channels: [AlertChannel.WEBHOOK],
      };

      const result = await alertService.sendAlert(request);

      expect(result.results[0].status).toBe(AlertStatus.SENT);
    });

    it("should batch send to multiple channels efficiently", async () => {
      const channels = [
        AlertChannel.TELEGRAM,
        AlertChannel.EMAIL,
        AlertChannel.PUSH,
        AlertChannel.SMS,
        AlertChannel.SLACK,
        AlertChannel.WEBHOOK,
      ];

      const request = {
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Buy Signal",
          message: "Buy opportunity detected",
          timestamp: new Date(),
        },
        channels,
      };

      const startTime = Date.now();
      const result = await alertService.sendAlert(request);
      const totalTime = Date.now() - startTime;

      expect(result.results).toHaveLength(6);
      expect(result.successCount).toBe(6);
      expect(totalTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it("should maintain separate history for different alerts", async () => {
      const alert1Id = "alert-1";
      const alert2Id = "alert-2";

      await alertService.sendAlert({
        alertId: alert1Id,
        payload: {
          type: AlertType.SIGNAL_BUY,
          title: "Test 1",
          message: "Test 1",
          timestamp: new Date(),
        },
        channels: [AlertChannel.TELEGRAM],
      });

      await alertService.sendAlert({
        alertId: alert2Id,
        payload: {
          type: AlertType.SIGNAL_SELL,
          title: "Test 2",
          message: "Test 2",
          timestamp: new Date(),
        },
        channels: [AlertChannel.EMAIL],
      });

      const history1 = alertService.getAlertHistory(alert1Id);
      const history2 = alertService.getAlertHistory(alert2Id);

      expect(history1?.alertId).toBe(alert1Id);
      expect(history2?.alertId).toBe(alert2Id);
      expect(history1).not.toEqual(history2);
    });
  });
});
