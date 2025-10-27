import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Express } from "express";
import config from "./env.ts";

/**
 * Configura middleware de segurança OWASP
 */
export function setupSecurityMiddleware(app: Express) {
  // Helmet: Headers de segurança
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS
  const corsOrigins = config.cors_origin.split(",").map((o) => o.trim());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: config.cors_credentials,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 200,
      maxAge: 3600,
    })
  );

  // Rate Limiting Global
  const globalLimiter = rateLimit({
    windowMs: config.rate_limit_window_ms,
    max: config.rate_limit_max_requests,
    message: "Muitas requisições deste IP, tente novamente depois.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip em health check
      return req.path === "/health";
    },
  });

  app.use(globalLimiter);

  // Rate Limiting para Auth
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: config.rate_limit_auth_max,
    message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Limita por email na rota de login
      return (req.body?.email || req.ip) as string;
    },
  });

  app.use("/auth/login", authLimiter);
  app.use("/auth/register", authLimiter);

  // Rate Limiting para Screener (operação pesada)
  const screenerLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 min
    max: 3,
    message: "Limite de scans atingido. Tente novamente em 5 minutos.",
  });

  app.use("/screener", screenerLimiter);
}
