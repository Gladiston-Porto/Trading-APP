import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env do root do projeto
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

export const config = {
  // Node
  node_env: process.env.NODE_ENV || "development",
  is_prod: process.env.NODE_ENV === "production",
  is_dev: process.env.NODE_ENV === "development",

  // Server
  port: parseInt(process.env.PORT || "3333", 10),
  host: process.env.HOST || "0.0.0.0",
  cors_origin: process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3333",
  cors_credentials: process.env.CORS_CREDENTIALS === "true",

  // Database
  database_url: process.env.DATABASE_URL || "mysql://root:rootpassword@localhost:3306/app_trade_db",

  // JWT
  jwt_secret: process.env.JWT_SECRET || "dev_secret_key_change_in_production",
  jwt_expiration: process.env.JWT_EXPIRATION || "15m",
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET || "dev_refresh_secret_change_in_production",
  jwt_refresh_expiration: process.env.JWT_REFRESH_EXPIRATION || "7d",

  // Logging
  log_level: process.env.LOG_LEVEL || "debug",
  log_format: process.env.LOG_FORMAT || "json",
  log_pretty_print: process.env.LOG_PRETTY_PRINT === "true",

  // Data Providers
  brapi_enabled: true,
  brapi_api_key: process.env.BRAPI_API_KEY || "free",
  brapi_base_url: process.env.BRAPI_BASE_URL || "https://brapi.dev/api",
  yahoo_finance_enabled: process.env.YAHOO_FINANCE_ENABLED !== "false",

  // Telegram
  telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || "",
  telegram_enabled: process.env.TELEGRAM_ENABLED === "true" && !!process.env.TELEGRAM_BOT_TOKEN,

  // Cron Jobs
  cron_update_market: process.env.CRON_UPDATE_MARKET || "0 */15 * * 1-5",
  cron_scan_signals: process.env.CRON_SCAN_SIGNALS || "0 10,14,16 * * 1-5",
  cron_manage_positions: process.env.CRON_MANAGE_POSITIONS || "0 */30 * * 1-5",
  cron_calculate_kpis: process.env.CRON_CALCULATE_KPIS || "0 18 * * 1-5",
  timezone: process.env.TIMEZONE || "America/Sao_Paulo",

  // Estratégias
  risk_per_trade_pct: parseFloat(process.env.RISK_PER_TRADE_PCT || "1.0"),
  daily_loss_limit_pct: parseFloat(process.env.DAILY_LOSS_LIMIT_PCT || "-3.0"),
  volume_min_multiplier: parseFloat(process.env.VOLUME_MIN_MULTIPLIER || "1.2"),

  // Backtesting
  backtest_slippage_pct: parseFloat(process.env.BACKTEST_SLIPPAGE_PCT || "0.01"),
  backtest_commission_pct: parseFloat(process.env.BACKTEST_COMMISSION_PCT || "0.0005"),

  // Feature Flags
  feature_intraday: process.env.FEATURE_INTRADAY === "true",
  feature_paper_trading: process.env.FEATURE_PAPER_TRADING !== "false",
  feature_audit_log: process.env.FEATURE_AUDIT_LOG !== "false",

  // Rate Limiting
  rate_limit_window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  rate_limit_max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  rate_limit_auth_max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "5", 10),

  // Sentry (opcional)
  sentry_dsn: process.env.SENTRY_DSN || "",
};

// Validações
function validateConfig() {
  if (!config.jwt_secret || config.jwt_secret === "dev_secret_key_change_in_production") {
    if (config.is_prod) {
      throw new Error("JWT_SECRET must be set in production");
    }
    console.warn("⚠️  JWT_SECRET is using default dev key. Change in production!");
  }

  if (!config.database_url) {
    throw new Error("DATABASE_URL is required");
  }

  if (config.telegram_enabled && !config.telegram_bot_token) {
    console.warn("⚠️  Telegram enabled but TELEGRAM_BOT_TOKEN not set. Alerts won't work.");
  }
}

validateConfig();

export default config;
