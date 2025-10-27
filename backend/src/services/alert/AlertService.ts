/**
 * Alert Management Service
 * 
 * Manages alerts across multiple channels (Telegram, Email, Push, Webhooks, SMS, Slack)
 * with support for scheduling, filtering, and delivery tracking.
 * 
 * Features:
 * - Multi-channel alert delivery
 * - Alert scheduling and quiet hours
 * - Template-based notifications
 * - Delivery tracking and retries
 * - Alert statistics and analytics
 * - Channel health monitoring
 */

import { PrismaClient } from "@prisma/client";
import {
  AlertChannel,
  AlertStatus,
  AlertType,
  AlertPriority,
  AlertPayload,
  AlertResult,
  BatchAlertResult,
  CreateAlertRequest,
  UpdateAlertRequest,
  SendAlertRequest,
  AlertStatistics,
  ChannelTestResult,
  ListAlertsFilter,
  AlertHistoryEntry,
  NotificationTemplate,
} from "./types/alert.types";

export class AlertService {
  private prisma: PrismaClient;
  private alertHistory: Map<string, AlertHistoryEntry> = new Map();

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.prisma = prisma;
  }

  /**
   * Create a new alert
   */
  async createAlert(userId: string, config: CreateAlertRequest) {
    // Validation
    if (!config.name || config.name.trim().length === 0) {
      throw new Error("Alert name is required");
    }

    if (!config.channels || config.channels.length === 0) {
      throw new Error("At least one channel must be specified");
    }

    // Validate channel configs
    for (const channel of config.channels) {
      if (!config.channelConfigs[channel]) {
        throw new Error(`Configuration missing for channel: ${channel}`);
      }
    }

    // Create alert
    const alert = await this.prisma.alert.create({
      data: {
        userId,
        name: config.name,
        description: config.description,
        type: config.type,
        enabled: config.enabled ?? true,
        channels: JSON.stringify(config.channels),
        channelConfigs: JSON.stringify(config.channelConfigs),
        priority: config.priority || AlertPriority.MEDIUM,
        condition: config.condition ? JSON.stringify(config.condition) : null,
        quietHours: config.quietHours ? JSON.stringify(config.quietHours) : null,
        tags: JSON.stringify(config.tags || []),
        sendCount: 0,
      },
    });

    return this.formatAlertResponse(alert);
  }

  /**
   * Get a single alert
   */
  async getAlert(userId: string, alertId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.userId !== userId) {
      throw new Error("Alert not found");
    }

    return this.formatAlertResponse(alert);
  }

  /**
   * List alerts with filters
   */
  async listAlerts(userId: string, filters?: ListAlertsFilter) {
    const skip = filters?.skip || 0;
    const take = filters?.take || 20;

    const where: any = { userId };

    if (filters?.type) where.type = filters.type;
    if (filters?.enabled !== undefined) where.enabled = filters.enabled;
    if (filters?.priority) where.priority = filters.priority;

    const alerts = await this.prisma.alert.findMany({
      where,
      skip,
      take,
      orderBy: {
        [filters?.sortBy || "createdAt"]: filters?.order || "DESC",
      },
    });

    return alerts.map((a: any) => this.formatAlertResponse(a));
  }

  /**
   * Update alert
   */
  async updateAlert(userId: string, alertId: string, update: UpdateAlertRequest) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.userId !== userId) {
      throw new Error("Alert not found");
    }

    // Validate channels if provided
    if (update.channels && update.channels.length === 0) {
      throw new Error("At least one channel must be specified");
    }

    const updated = await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        ...(update.name && { name: update.name }),
        ...(update.description && { description: update.description }),
        ...(update.enabled !== undefined && { enabled: update.enabled }),
        ...(update.channels && { channels: JSON.stringify(update.channels) }),
        ...(update.channelConfigs && {
          channelConfigs: JSON.stringify(update.channelConfigs),
        }),
        ...(update.priority && { priority: update.priority }),
        ...(update.condition && {
          condition: JSON.stringify(update.condition),
        }),
        ...(update.quietHours && {
          quietHours: JSON.stringify(update.quietHours),
        }),
        ...(update.tags && { tags: JSON.stringify(update.tags) }),
        updatedAt: new Date(),
      },
    });

    return this.formatAlertResponse(updated);
  }

  /**
   * Delete alert
   */
  async deleteAlert(userId: string, alertId: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert || alert.userId !== userId) {
      throw new Error("Alert not found");
    }

    await this.prisma.alert.delete({
      where: { id: alertId },
    });

    return { success: true, message: "Alert deleted" };
  }

  /**
   * Send alert through specified channels
   */
  async sendAlert(request: SendAlertRequest): Promise<BatchAlertResult> {
    const alertId = request.alertId || "manual-" + Date.now();
    const channels = request.channels || [
      AlertChannel.TELEGRAM,
      AlertChannel.EMAIL,
    ];

    const results: AlertResult[] = [];
    const timestamp = new Date();

    // Send through each channel
    for (const channel of channels) {
      const result = await this.sendToChannel(
        channel,
        request.payload,
        alertId
      );
      results.push(result);
    }

    // Track history
    this.alertHistory.set(alertId, {
      alertId,
      type: request.payload.type,
      payload: request.payload,
      results,
      createdAt: timestamp,
      sentAt: timestamp,
    });

    const successCount = results.filter((r) => r.status === AlertStatus.SENT)
      .length;
    const failureCount = results.filter((r) => r.status === AlertStatus.FAILED)
      .length;

    return {
      alertId,
      timestamp,
      results,
      successCount,
      failureCount,
      totalSent: results.length,
    };
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: AlertChannel,
    payload: AlertPayload,
    alertId: string
  ): Promise<AlertResult> {
    const startTime = Date.now();

    try {
      let status = AlertStatus.SENT;

      // Mock channel-specific sending
      switch (channel) {
        case AlertChannel.TELEGRAM:
          await this.sendTelegram(payload);
          break;
        case AlertChannel.EMAIL:
          await this.sendEmail(payload);
          break;
        case AlertChannel.PUSH:
          await this.sendPush(payload);
          break;
        case AlertChannel.WEBHOOK:
          await this.sendWebhook(payload);
          break;
        case AlertChannel.SMS:
          await this.sendSMS(payload);
          break;
        case AlertChannel.SLACK:
          await this.sendSlack(payload);
          break;
      }

      return {
        alertId,
        timestamp: new Date(),
        channel,
        type: payload.type,
        status,
        message: "Successfully sent",
        deliveryTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        alertId,
        timestamp: new Date(),
        channel,
        type: payload.type,
        status: AlertStatus.FAILED,
        error: error.message,
        deliveryTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Send via Telegram
   */
  private async sendTelegram(payload: AlertPayload): Promise<void> {
    // Mock Telegram sending
    void `📢 ${payload.title}\n${payload.message}`;

    // In production: Use axios to call Telegram Bot API
    // await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    //   chat_id: chatId,
    //   text: message,
    //   parse_mode: 'HTML'
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  /**
   * Send via Email
   */
  private async sendEmail(payload: AlertPayload): Promise<void> {
    // Mock Email sending
    void `
      <h2>${payload.title}</h2>
      <p>${payload.message}</p>
      <p><strong>Ticker:</strong> ${payload.ticker || "N/A"}</p>
      <p><strong>Price:</strong> ${payload.price || "N/A"}</p>
    `;

    // In production: Use nodemailer or SendGrid
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail({
    //   from: config.email,
    //   to: recipientEmail,
    //   subject: payload.title,
    //   html: emailBody
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Send via Push Notification
   */
  private async sendPush(payload: AlertPayload): Promise<void> {
    // Mock Push sending
    void {
      title: payload.title,
      body: payload.message,
      data: payload.data || {},
    };

    // In production: Use Firebase Admin SDK or OneSignal
    // await admin.messaging().send({
    //   notification,
    //   topic: 'trading-alerts',
    //   android: { priority: 'high' },
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  /**
   * Send via Webhook
   */
  private async sendWebhook(payload: AlertPayload): Promise<void> {
    // Mock Webhook sending
    void {
      timestamp: new Date().toISOString(),
      alert: payload,
    };

    // In production: Use axios
    // await axios.post(webhookUrl, webhookPayload, {
    //   timeout: 5000,
    //   headers: { 'Content-Type': 'application/json' }
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  /**
   * Send via SMS
   */
  private async sendSMS(payload: AlertPayload): Promise<void> {
    // Mock SMS sending
    void `${payload.title}: ${payload.message}`;

    // In production: Use Twilio or AWS SNS
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   body: message,
    //   from: smsNumber,
    //   to: recipientNumber
    // });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  /**
   * Send via Slack
   */
  private async sendSlack(payload: AlertPayload): Promise<void> {
    // Mock Slack sending
    void {
      text: payload.title,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${payload.title}*\n${payload.message}`,
          },
        },
      ],
    };

    // In production: Use axios to send to Slack webhook
    // await axios.post(slackWebhookUrl, message);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  /**
   * Test channel configuration
   */
  async testChannel(
    channel: AlertChannel
  ): Promise<ChannelTestResult> {
    const startTime = Date.now();

    try {
      // Test payload
      const testPayload: AlertPayload = {
        type: AlertType.SYSTEM_ERROR,
        title: `Test Alert - ${channel}`,
        message: `This is a test message from ${channel} channel`,
        timestamp: new Date(),
      };

      await this.sendToChannel(channel, testPayload, "test-" + Date.now());

      return {
        channel,
        success: true,
        message: `${channel} channel is working correctly`,
        deliveryTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        channel,
        success: false,
        error: error.message,
        deliveryTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get alert statistics
   */
  async getStatistics(userId: string): Promise<AlertStatistics> {
    const alerts = await this.prisma.alert.findMany({
      where: { userId },
    });

    const totalAlerts = alerts.length;
    const activeAlerts = alerts.filter((a: any) => a.enabled).length;

    // Calculate stats from history
    const historyEntries = Array.from(this.alertHistory.values()).filter(
      (h) => alerts.some((a: any) => a.id === h.alertId)
    );

    const totalSent = historyEntries.reduce(
      (sum, h) =>
        sum +
        h.results.filter((r) => r.status === AlertStatus.SENT).length,
      0
    );

    const totalFailed = historyEntries.reduce(
      (sum, h) =>
        sum +
        h.results.filter((r) => r.status === AlertStatus.FAILED).length,
      0
    );

    const successRate =
      totalSent + totalFailed > 0
        ? (totalSent / (totalSent + totalFailed)) * 100
        : 0;

    const byChannel: Record<AlertChannel, any> = {} as any;
    for (const channel of Object.values(AlertChannel)) {
      const channelResults = historyEntries.flatMap((h) =>
        h.results.filter((r) => r.channel === channel)
      );

      byChannel[channel] = {
        total: channelResults.length,
        sent: channelResults.filter((r) => r.status === AlertStatus.SENT)
          .length,
        failed: channelResults.filter((r) => r.status === AlertStatus.FAILED)
          .length,
        successRate:
          channelResults.length > 0
            ? (channelResults.filter((r) => r.status === AlertStatus.SENT)
                .length /
                channelResults.length) *
              100
            : 0,
      };
    }

    const last24Hours = historyEntries
      .filter((h) => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return h.createdAt > oneDayAgo;
      })
      .reduce(
        (acc, h) => {
          const sent = h.results.filter(
            (r) => r.status === AlertStatus.SENT
          ).length;
          const failed = h.results.filter(
            (r) => r.status === AlertStatus.FAILED
          ).length;
          return {
            sent: acc.sent + sent,
            failed: acc.failed + failed,
          };
        },
        { sent: 0, failed: 0 }
      );

    return {
      userId,
      totalAlerts,
      activeAlerts,
      totalSent,
      successRate,
      failureRate: 100 - successRate,
      averageDeliveryTime:
        historyEntries.length > 0
          ? historyEntries.reduce(
              (sum, h) =>
                sum +
                h.results.reduce((s, r) => s + (r.deliveryTime || 0), 0),
              0
            ) / historyEntries.length
          : 0,
      byChannel,
      byType: {} as any,
      last24Hours,
    };
  }

  /**
   * Get alert history
   */
  getAlertHistory(alertId: string): AlertHistoryEntry | undefined {
    return this.alertHistory.get(alertId);
  }

  /**
   * Clear old history
   */
  clearOldHistory(hoursToKeep: number = 168): number {
    const cutoff = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
    let removed = 0;

    const keysToDelete: string[] = [];
    this.alertHistory.forEach((entry, key) => {
      if (entry.createdAt < cutoff) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.alertHistory.delete(key);
      removed++;
    });

    return removed;
  }

  /**
   * Get notification template
   */
  getNotificationTemplate(
    alertType: AlertType,
    channel: AlertChannel
  ): NotificationTemplate {
    const templates: Record<AlertType, Record<AlertChannel, NotificationTemplate>> =
      {
        [AlertType.SIGNAL_BUY]: {
          [AlertChannel.TELEGRAM]: {
            alertType: AlertType.SIGNAL_BUY,
            channel: AlertChannel.TELEGRAM,
            title: "📈 Buy Signal",
            body: "A buy signal has been generated",
            emoji: "📈",
            color: "#00FF00",
          },
          [AlertChannel.EMAIL]: {
            alertType: AlertType.SIGNAL_BUY,
            channel: AlertChannel.EMAIL,
            title: "Buy Signal Alert",
            body: "A buy signal has been generated for your strategy",
            emoji: "📈",
          },
          [AlertChannel.PUSH]: {
            alertType: AlertType.SIGNAL_BUY,
            channel: AlertChannel.PUSH,
            title: "Buy Signal",
            body: "New buy opportunity detected",
            emoji: "📈",
          },
          [AlertChannel.WEBHOOK]: {
            alertType: AlertType.SIGNAL_BUY,
            channel: AlertChannel.WEBHOOK,
            title: "signal_buy",
            body: "New buy signal generated",
          },
          [AlertChannel.SMS]: {
            alertType: AlertType.SIGNAL_BUY,
            channel: AlertChannel.SMS,
            title: "BUY",
            body: "Buy signal detected",
            emoji: "📈",
          },
          [AlertChannel.SLACK]: {
            alertType: AlertType.SIGNAL_BUY,
            channel: AlertChannel.SLACK,
            title: "📈 Buy Signal",
            body: "New buy signal has been generated",
            emoji: "📈",
          },
        },
        [AlertType.SIGNAL_SELL]: {
          [AlertChannel.TELEGRAM]: {
            alertType: AlertType.SIGNAL_SELL,
            channel: AlertChannel.TELEGRAM,
            title: "📉 Sell Signal",
            body: "A sell signal has been generated",
            emoji: "📉",
            color: "#FF0000",
          },
          [AlertChannel.EMAIL]: {
            alertType: AlertType.SIGNAL_SELL,
            channel: AlertChannel.EMAIL,
            title: "Sell Signal Alert",
            body: "A sell signal has been generated",
            emoji: "📉",
          },
          [AlertChannel.PUSH]: {
            alertType: AlertType.SIGNAL_SELL,
            channel: AlertChannel.PUSH,
            title: "Sell Signal",
            body: "Time to consider selling",
            emoji: "📉",
          },
          [AlertChannel.WEBHOOK]: {
            alertType: AlertType.SIGNAL_SELL,
            channel: AlertChannel.WEBHOOK,
            title: "signal_sell",
            body: "New sell signal generated",
          },
          [AlertChannel.SMS]: {
            alertType: AlertType.SIGNAL_SELL,
            channel: AlertChannel.SMS,
            title: "SELL",
            body: "Sell signal detected",
            emoji: "📉",
          },
          [AlertChannel.SLACK]: {
            alertType: AlertType.SIGNAL_SELL,
            channel: AlertChannel.SLACK,
            title: "📉 Sell Signal",
            body: "Sell signal has been generated",
            emoji: "📉",
          },
        },
        [AlertType.TP_HIT]: {
          [AlertChannel.TELEGRAM]: {
            alertType: AlertType.TP_HIT,
            channel: AlertChannel.TELEGRAM,
            title: "💰 Take Profit Hit",
            body: "Your take profit target has been reached",
            emoji: "💰",
            color: "#FFD700",
          },
          [AlertChannel.EMAIL]: {
            alertType: AlertType.TP_HIT,
            channel: AlertChannel.EMAIL,
            title: "Take Profit Hit",
            body: "Your position reached the target price",
            emoji: "💰",
          },
          [AlertChannel.PUSH]: {
            alertType: AlertType.TP_HIT,
            channel: AlertChannel.PUSH,
            title: "Take Profit Hit",
            body: "Position target reached",
            emoji: "💰",
          },
          [AlertChannel.WEBHOOK]: {
            alertType: AlertType.TP_HIT,
            channel: AlertChannel.WEBHOOK,
            title: "tp_hit",
            body: "Take profit target reached",
          },
          [AlertChannel.SMS]: {
            alertType: AlertType.TP_HIT,
            channel: AlertChannel.SMS,
            title: "TP HIT",
            body: "Target price reached",
            emoji: "💰",
          },
          [AlertChannel.SLACK]: {
            alertType: AlertType.TP_HIT,
            channel: AlertChannel.SLACK,
            title: "💰 Take Profit Hit",
            body: "Your profit target has been reached",
            emoji: "💰",
          },
        },
        [AlertType.SL_HIT]: {
          [AlertChannel.TELEGRAM]: {
            alertType: AlertType.SL_HIT,
            channel: AlertChannel.TELEGRAM,
            title: "⚠️ Stop Loss Hit",
            body: "Your stop loss has been triggered",
            emoji: "⚠️",
            color: "#FF0000",
          },
          [AlertChannel.EMAIL]: {
            alertType: AlertType.SL_HIT,
            channel: AlertChannel.EMAIL,
            title: "Stop Loss Hit",
            body: "Your stop loss has been triggered",
            emoji: "⚠️",
          },
          [AlertChannel.PUSH]: {
            alertType: AlertType.SL_HIT,
            channel: AlertChannel.PUSH,
            title: "Stop Loss Triggered",
            body: "Loss limit has been reached",
            emoji: "⚠️",
          },
          [AlertChannel.WEBHOOK]: {
            alertType: AlertType.SL_HIT,
            channel: AlertChannel.WEBHOOK,
            title: "sl_hit",
            body: "Stop loss triggered",
          },
          [AlertChannel.SMS]: {
            alertType: AlertType.SL_HIT,
            channel: AlertChannel.SMS,
            title: "STOP LOSS",
            body: "Loss limit triggered",
            emoji: "⚠️",
          },
          [AlertChannel.SLACK]: {
            alertType: AlertType.SL_HIT,
            channel: AlertChannel.SLACK,
            title: "⚠️ Stop Loss Hit",
            body: "Your stop loss has been triggered",
            emoji: "⚠️",
          },
        },
        [AlertType.SYSTEM_ERROR]: {
          [AlertChannel.TELEGRAM]: {
            alertType: AlertType.SYSTEM_ERROR,
            channel: AlertChannel.TELEGRAM,
            title: "🔴 System Error",
            body: "A system error has occurred",
            emoji: "🔴",
            color: "#FF0000",
          },
          [AlertChannel.EMAIL]: {
            alertType: AlertType.SYSTEM_ERROR,
            channel: AlertChannel.EMAIL,
            title: "System Error",
            body: "A system error has occurred",
            emoji: "🔴",
          },
          [AlertChannel.PUSH]: {
            alertType: AlertType.SYSTEM_ERROR,
            channel: AlertChannel.PUSH,
            title: "System Error",
            body: "An error has occurred",
            emoji: "🔴",
          },
          [AlertChannel.WEBHOOK]: {
            alertType: AlertType.SYSTEM_ERROR,
            channel: AlertChannel.WEBHOOK,
            title: "system_error",
            body: "System error occurred",
          },
          [AlertChannel.SMS]: {
            alertType: AlertType.SYSTEM_ERROR,
            channel: AlertChannel.SMS,
            title: "ERROR",
            body: "System error occurred",
            emoji: "🔴",
          },
          [AlertChannel.SLACK]: {
            alertType: AlertType.SYSTEM_ERROR,
            channel: AlertChannel.SLACK,
            title: "🔴 System Error",
            body: "A system error has occurred",
            emoji: "🔴",
          },
        },
      } as any;

    return (
      templates[alertType]?.[channel] || {
        alertType,
        channel,
        title: "Alert",
        body: "New alert received",
      }
    );
  }

  /**
   * Helper: Format alert response
   */
  private formatAlertResponse(alert: any) {
    const channels = JSON.parse(alert.channels as string) as AlertChannel[];
    const tags = JSON.parse(alert.tags as string || "[]") as string[];

    return {
      id: alert.id,
      userId: alert.userId,
      name: alert.name,
      description: alert.description,
      type: alert.type,
      enabled: alert.enabled,
      channels,
      priority: alert.priority,
      condition: alert.condition ? JSON.parse(alert.condition as string) : undefined,
      quietHours: alert.quietHours
        ? JSON.parse(alert.quietHours as string)
        : undefined,
      tags,
      sendCount: alert.sendCount || 0,
      lastSent: alert.lastSent,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}

export default AlertService;
