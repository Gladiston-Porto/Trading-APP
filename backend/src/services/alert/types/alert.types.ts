/**
 * Alert System Types
 * 
 * Type definitions for alert management including channels,
 * notification types, and multi-channel delivery
 */

/**
 * Alert Channels
 */
export enum AlertChannel {
  TELEGRAM = "TELEGRAM",
  EMAIL = "EMAIL",
  PUSH = "PUSH",
  WEBHOOK = "WEBHOOK",
  SMS = "SMS",
  SLACK = "SLACK",
}

/**
 * Alert Status
 */
export enum AlertStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
  SCHEDULED = "SCHEDULED",
}

/**
 * Alert Type/Trigger
 */
export enum AlertType {
  // Trading Signals
  SIGNAL_BUY = "SIGNAL_BUY",
  SIGNAL_SELL = "SIGNAL_SELL",
  
  // Position Alerts
  POSITION_OPENED = "POSITION_OPENED",
  POSITION_CLOSED = "POSITION_CLOSED",
  TP_HIT = "TP_HIT",
  SL_HIT = "SL_HIT",
  
  // Portfolio Alerts
  PORTFOLIO_MILESTONE = "PORTFOLIO_MILESTONE",
  PORTFOLIO_DRAWDOWN = "PORTFOLIO_DRAWDOWN",
  REBALANCE_NEEDED = "REBALANCE_NEEDED",
  
  // Risk Alerts
  HIGH_VOLATILITY = "HIGH_VOLATILITY",
  HIGH_CORRELATION = "HIGH_CORRELATION",
  RISK_THRESHOLD = "RISK_THRESHOLD",
  
  // System Alerts
  BACKTEST_COMPLETE = "BACKTEST_COMPLETE",
  STRATEGY_UPDATE = "STRATEGY_UPDATE",
  SYSTEM_ERROR = "SYSTEM_ERROR",
}

/**
 * Alert Priority
 */
export enum AlertPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Telegram Channel Configuration
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  parseMode?: "HTML" | "Markdown";
  disableWebPagePreview?: boolean;
}

/**
 * Email Channel Configuration
 */
export interface EmailConfig {
  fromEmail: string;
  fromName?: string;
  toEmails: string[];
  provider?: "smtp" | "sendgrid" | "mailgun";
  providerKey?: string;
}

/**
 * Push Notification Configuration
 */
export interface PushConfig {
  provider?: "firebase" | "onesignal";
  providerKey?: string;
  topics?: string[];
  deviceTokens?: string[];
}

/**
 * Webhook Configuration
 */
export interface WebhookConfig {
  url: string;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * SMS Configuration
 */
export interface SMSConfig {
  provider?: "twilio" | "sns";
  providerKey?: string;
  phoneNumbers: string[];
}

/**
 * Slack Configuration
 */
export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconUrl?: string;
}

/**
 * Channel Configuration Union
 */
export type ChannelConfig =
  | TelegramConfig
  | EmailConfig
  | PushConfig
  | WebhookConfig
  | SMSConfig
  | SlackConfig;

/**
 * Alert Payload
 */
export interface AlertPayload {
  type: AlertType;
  title: string;
  message: string;
  ticker?: string;
  price?: number;
  data?: Record<string, any>;
  timestamp?: Date;
  url?: string;
}

/**
 * Alert Configuration
 */
export interface AlertConfig {
  userId: string;
  name: string;
  description?: string;
  
  type: AlertType;
  enabled: boolean;
  
  // Channels
  channels: AlertChannel[];
  channelConfigs: Partial<Record<AlertChannel, ChannelConfig>>;
  
  // Conditions
  condition?: {
    ticker?: string;
    minPrice?: number;
    maxPrice?: number;
    volumeThreshold?: number;
  };
  
  // Scheduling
  priority: AlertPriority;
  quietHours?: {
    startHour: number;
    endHour: number;
  };
  
  // Tags
  tags?: string[];
}

/**
 * Create Alert Request
 */
export interface CreateAlertRequest {
  name: string;
  description?: string;
  type: AlertType;
  enabled?: boolean;
  channels: AlertChannel[];
  channelConfigs: Partial<Record<AlertChannel, ChannelConfig>>;
  condition?: AlertConfig["condition"];
  priority?: AlertPriority;
  quietHours?: AlertConfig["quietHours"];
  tags?: string[];
}

/**
 * Update Alert Request
 */
export interface UpdateAlertRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  channels?: AlertChannel[];
  channelConfigs?: Partial<Record<AlertChannel, ChannelConfig>>;
  condition?: AlertConfig["condition"];
  priority?: AlertPriority;
  quietHours?: AlertConfig["quietHours"];
  tags?: string[];
}

/**
 * Send Alert Request
 */
export interface SendAlertRequest {
  alertId?: string;
  payload: AlertPayload;
  channels?: AlertChannel[];
  sendImmediately?: boolean;
}

/**
 * Alert Result
 */
export interface AlertResult {
  alertId: string;
  timestamp: Date;
  type: AlertType;
  channel: AlertChannel;
  status: AlertStatus;
  message?: string;
  error?: string;
  deliveryTime?: number; // ms
}

/**
 * Batch Alert Result
 */
export interface BatchAlertResult {
  alertId: string;
  timestamp: Date;
  results: AlertResult[];
  successCount: number;
  failureCount: number;
  totalSent: number;
}

/**
 * Alert History Entry
 */
export interface AlertHistoryEntry {
  alertId: string;
  type: AlertType;
  payload: AlertPayload;
  results: AlertResult[];
  createdAt: Date;
  sentAt?: Date;
}

/**
 * Alert Statistics
 */
export interface AlertStatistics {
  userId: string;
  totalAlerts: number;
  activeAlerts: number;
  totalSent: number;
  successRate: number;
  failureRate: number;
  averageDeliveryTime: number;
  byChannel: Record<AlertChannel, {
    total: number;
    sent: number;
    failed: number;
    successRate: number;
  }>;
  byType: Record<AlertType, {
    total: number;
    sent: number;
  }>;
  last24Hours: {
    sent: number;
    failed: number;
  };
}

/**
 * List Alerts Filter
 */
export interface ListAlertsFilter {
  type?: AlertType;
  channel?: AlertChannel;
  status?: AlertStatus;
  enabled?: boolean;
  priority?: AlertPriority;
  tags?: string[];
  sortBy?: "name" | "createdAt" | "sendCount";
  order?: "ASC" | "DESC";
  skip?: number;
  take?: number;
}

/**
 * Channel Test Result
 */
export interface ChannelTestResult {
  channel: AlertChannel;
  success: boolean;
  message?: string;
  deliveryTime?: number;
  error?: string;
}

/**
 * Alert Response DTO
 */
export interface AlertResponse {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: AlertType;
  enabled: boolean;
  channels: AlertChannel[];
  priority: AlertPriority;
  condition?: AlertConfig["condition"];
  quietHours?: AlertConfig["quietHours"];
  tags: string[];
  sendCount: number;
  lastSent?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Template
 */
export interface NotificationTemplate {
  alertType: AlertType;
  channel: AlertChannel;
  title: string;
  body: string;
  emoji?: string;
  color?: string;
}
