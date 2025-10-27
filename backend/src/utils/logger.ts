import winston from "winston";
import config from "../config/env.ts";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}`;
  }

  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.log_level,
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    config.log_pretty_print && colorize(),
    config.log_format === "json" ? json() : customFormat
  ),
  defaultMeta: { service: "app-trade-backend" },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        customFormat
      ),
    }),
  ],
});

// Não logar em testes
if (config.node_env === "test") {
  logger.transports.forEach((t) => {
    t.silent = true;
  });
}

export default logger;
