import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import config from "./config/env.ts";
import { setupSecurityMiddleware } from "./config/security.ts";
import { logger } from "./utils/logger.ts";
import { PrismaClient } from "@prisma/client";
import authRouter from "./api/routes/auth.routes";
import marketRouter from "./api/routes/market.routes";
import indicatorRouter from "./api/routes/indicator.routes";
import patternRouter from "./api/routes/pattern.routes";
import signalsRouter from "./api/routes/signals.routes";
import riskRouter from "./api/routes/risk.routes";
import { paperRouter } from "./api/routes/paper.routes";
import backtestRouter from "./api/routes/backtest.routes";
import strategyRouter from "./api/routes/strategy.routes";
import portfolioRouter from "./api/routes/portfolio.routes";
import alertRouter from "./api/routes/alert.routes";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.cors_origin.split(",").map((o) => o.trim()),
    credentials: config.cors_credentials,
  },
});

export const prisma = new PrismaClient();

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Segurança
setupSecurityMiddleware(app);

// ==================== ROTAS ====================

// Autenticação
app.use("/api/auth", authRouter);

// Market Data
app.use("/api/market", marketRouter);

// Indicadores
app.use("/api/indicators", indicatorRouter);

// Padrões Candlestick
app.use("/api/patterns", patternRouter);

// Sinais de Trading
app.use("/api/signals", signalsRouter);

// Gerenciamento de Risco
app.use("/api/risk", riskRouter);

// Paper Trading
app.use("/api/paper", paperRouter);

// Backtesting
app.use("/api/backtest", backtestRouter);

// Strategy Manager
app.use("/api/strategies", strategyRouter);

// Portfolio Manager
app.use("/api/portfolios", portfolioRouter);

// Alerts Manager
app.use("/api/alerts", alertRouter);

// Health Check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Placeholder
app.get("/api", (_req, res) => {
  res.json({
    message: "Trading App Backend v1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth/*",
      tickers: "/api/tickers",
      market: "/api/market/*",
      indicators: "/api/indicators/*",
      patterns: "/api/patterns/*",
      signals: "/api/signals/*",
      risk: "/api/risk/*",
      screener: "/api/screener/*",
      strategies: "/api/strategies/*",
      paper: "/api/paper/*",
      positions: "/api/positions/*",
      backtest: "/api/backtest/*",
      portfolio: "/api/portfolio/*",
      reports: "/api/reports/*",
    },
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.path,
    method: req.method,
  });
});

// ==================== ERROR HANDLER ====================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Erro não tratado:", err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Erro interno do servidor";

  res.status(status).json({
    error: message,
    ...(config.is_dev && { stack: err.stack }),
  });
});

// ==================== WEBSOCKET ====================
io.on("connection", (socket) => {
  logger.info(`Cliente WebSocket conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`Cliente WebSocket desconectado: ${socket.id}`);
  });

  // Placeholder para eventos de sinais em tempo real
  socket.on("subscribe-signals", (data) => {
    logger.debug("Cliente subscreveu a sinais:", data);
  });
});

// ==================== STARTUP ====================
async function start() {
  try {
    // Testar conexão com banco
    await prisma.$connect();
    logger.info("✅ Conectado ao banco de dados");

    // Iniciar servidor
    httpServer.listen(config.port, config.host, () => {
      logger.info(`🚀 Servidor rodando em http://${config.host}:${config.port}`);
      logger.info(`📡 WebSocket disponível em ws://${config.host}:${config.port}`);
      logger.info(`🌍 CORS habilitado para: ${config.cors_origin}`);
      logger.info(`🔒 Ambiente: ${config.node_env}`);
    });
  } catch (error) {
    logger.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.warn("SIGTERM recebido. Encerrando gracefully...");
  httpServer.close(async () => {
    await prisma.$disconnect();
    logger.info("Servidor encerrado");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.warn("SIGINT recebido. Encerrando gracefully...");
  httpServer.close(async () => {
    await prisma.$disconnect();
    logger.info("Servidor encerrado");
    process.exit(0);
  });
});

start();

export { app, httpServer, io };
