/**
 * Risk Management Routes
 * Endpoints para cálculos de posição, limites de risco e rastreamento
 * 
 * Base path: /api/risk
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import RiskManager, {
  PositionSizingMethod,
  RiskParameters,
  TradeSetup,
} from '../../services/risk/RiskManager';
import logger from '../../utils/logger';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

/**
 * POST /api/risk/calculate-position
 * Calcula tamanho de posição ideal baseado em parâmetros de risco
 * 
 * Body:
 * {
 *   "method": "kelly" | "fixed_risk" | "fixed_amount",
 *   "accountSize": 10000,
 *   "riskPerTrade": 2,  (% or $)
 *   "ticker": "PETR4",
 *   "entryPrice": 100,
 *   "direction": "BUY",
 *   "stopLoss": 98,
 *   "takeProfit": 104,
 *   "slippagePercent": 0.5,
 *   "minRiskRewardRatio": 2.0,
 *   "kellyFraction": 0.25  (opcional, default 0.25)
 * }
 */
router.post('/calculate-position', async (req: Request, res: Response) => {
  try {
    const {
      method,
      accountSize,
      riskPerTrade,
      ticker,
      entryPrice,
      direction,
      stopLoss,
      takeProfit,
      slippagePercent = 0.5,
      minRiskRewardRatio = 2.0,
      kellyFraction,
      winRate,
    } = req.body;

    // Validações
    if (!method || !['kelly', 'fixed_risk', 'fixed_amount'].includes(method)) {
      return res.status(400).json({ error: 'Invalid position sizing method' });
    }

    if (!accountSize || accountSize <= 0) {
      return res.status(400).json({ error: 'Account size must be > 0' });
    }

    if (!ticker || !entryPrice || !direction || stopLoss === undefined || !takeProfit) {
      return res.status(400).json({ error: 'Missing required trade parameters' });
    }

    if (!['BUY', 'SELL'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be BUY or SELL' });
    }

    // Calculate RR ratio
    const rewardAmount = Math.abs(takeProfit - entryPrice);
    const riskAmount = Math.abs(entryPrice - stopLoss);
    const riskRewardRatio = rewardAmount / riskAmount;

    logger.info('Position calculation requested', {
      method,
      ticker,
      direction,
      riskRewardRatio,
    });

    // Create parameters object
    const params: RiskParameters = {
      method: method as PositionSizingMethod,
      accountSize,
      riskPerTrade,
      maxDailyLoss: 300, // Default values
      maxDrawdown: 10,
      slippagePercent,
      minRiskRewardRatio,
      kellyFraction: kellyFraction || 0.25,
    };

    // Create trade setup
    const trade: TradeSetup = {
      ticker,
      entryPrice,
      direction: direction as 'BUY' | 'SELL',
      stopLoss,
      takeProfit,
      riskRewardRatio,
    };

    // Calculate position
    const position = RiskManager.calculatePositionSize(params, trade, winRate);

    // Assess risk
    const assessment = RiskManager.assessRisk(params, position, 0, 0);

    logger.info('Position calculated', {
      ticker,
      shares: position.shares,
      canTrade: assessment.canTrade,
    });

    res.json({
      ticker,
      method,
      position: {
        shares: position.shares,
        positionSize: position.positionSize,
        riskAmount: position.riskAmount,
        expectedProfit: position.expectedProfit,
        rationale: position.rationale,
      },
      riskAssessment: {
        canTrade: assessment.canTrade,
        reason: assessment.reason,
        riskLevel: assessment.riskLevel,
        warnings: assessment.warnings,
        metrics: assessment.metrics,
      },
      tradeSetup: {
        entryPrice,
        stopLoss,
        takeProfit,
        riskRewardRatio: riskRewardRatio.toFixed(2),
      },
    });
  } catch (error) {
    logger.error('Position calculation failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao calcular posição' });
  }
});

/**
 * POST /api/risk/record-trade
 * Registra uma execução de trade
 * 
 * Body:
 * {
 *   "ticker": "PETR4",
 *   "entryPrice": 100,
 *   "direction": "BUY",
 *   "shares": 50,
 *   "stopLoss": 98,
 *   "takeProfit": 104,
 *   "positionSize": 5000,
 *   "riskAmount": 100
 * }
 */
router.post('/record-trade', async (req: Request, res: Response) => {
  try {
    const {
      ticker,
      entryPrice,
      direction,
      shares,
      stopLoss,
      takeProfit,
      positionSize,
      riskAmount,
    } = req.body;

    // Validações
    if (!ticker || !entryPrice || !direction || !shares || !stopLoss || !takeProfit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['BUY', 'SELL'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be BUY or SELL' });
    }

    logger.info('Trade recorded', {
      ticker,
      direction,
      shares,
      entryPrice,
    });

    const trade = RiskManager.recordTrade(
      ticker,
      entryPrice,
      direction as 'BUY' | 'SELL',
      shares,
      stopLoss,
      takeProfit,
      positionSize || shares * entryPrice,
      riskAmount || Math.abs(shares * (entryPrice - stopLoss))
    );

    res.json({
      success: true,
      trade: {
        ticker: trade.ticker,
        entryTime: trade.entryTime,
        entryPrice: trade.entryPrice,
        direction: trade.direction,
        shares: trade.shares,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        status: trade.status,
      },
    });
  } catch (error) {
    logger.error('Trade recording failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao registrar trade' });
  }
});

/**
 * POST /api/risk/close-trade
 * Fecha um trade aberto
 * 
 * Body:
 * {
 *   "ticker": "PETR4",
 *   "exitPrice": 104,
 *   "exitType": "TP" | "SL" | "MANUAL"
 * }
 */
router.post('/close-trade', async (req: Request, res: Response) => {
  try {
    const { ticker, exitPrice, exitType } = req.body;

    // Validações
    if (!ticker || !exitPrice || !['TP', 'SL', 'MANUAL'].includes(exitType)) {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    logger.info('Trade close requested', {
      ticker,
      exitPrice,
      exitType,
    });

    const trade = RiskManager.closeTrade(
      ticker,
      exitPrice,
      exitType as 'TP' | 'SL' | 'MANUAL'
    );

    if (!trade) {
      return res.status(404).json({ error: `No open trade found for ${ticker}` });
    }

    logger.info('Trade closed', {
      ticker,
      profit: trade.profit,
      profitPercent: trade.profitPercent,
    });

    res.json({
      success: true,
      trade: {
        ticker: trade.ticker,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        exitTime: trade.exitTime,
        status: trade.status,
        shares: trade.shares,
        profit: trade.profit,
        profitPercent: trade.profitPercent,
      },
    });
  } catch (error) {
    logger.error('Trade close failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao fechar trade' });
  }
});

/**
 * GET /api/risk/session-metrics
 * Retorna métricas da sessão de trading
 */
router.get('/session-metrics', async (req: Request, res: Response) => {
  try {
    const { accountValue = 10000 } = req.query;

    logger.info('Session metrics requested', {
      accountValue,
    });

    const metrics = RiskManager.getSessionMetrics(parseFloat(accountValue as string) || 10000);

    res.json({
      sessionStart: new Date().toISOString(),
      metrics: {
        tradesOpen: metrics.tradesOpen,
        totalRiskExposed: metrics.totalRiskExposed.toFixed(2),
        totalProfit: metrics.totalProfit.toFixed(2),
        dailyLossUsed: metrics.dailyLossUsed.toFixed(2),
        accountValueCurrent: metrics.accountValueCurrent.toFixed(2),
      },
    });
  } catch (error) {
    logger.error('Session metrics retrieval failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao recuperar métricas' });
  }
});

/**
 * GET /api/risk/trade-history
 * Retorna histórico de trades
 * 
 * Query params:
 * - status: OPEN | CLOSED_TP | CLOSED_SL | CLOSED_MANUAL
 * - ticker: filtrar por ticker
 */
router.get('/trade-history', async (req: Request, res: Response) => {
  try {
    const { status, ticker } = req.query;

    logger.info('Trade history requested', {
      status,
      ticker,
    });

    const history = RiskManager.getTradeHistory(
      status as string,
      ticker as string
    );

    res.json({
      total: history.length,
      trades: history.map(trade => ({
        ticker: trade.ticker,
        entryTime: trade.entryTime,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        exitTime: trade.exitTime,
        direction: trade.direction,
        shares: trade.shares,
        status: trade.status,
        profit: trade.profit?.toFixed(2),
        profitPercent: trade.profitPercent?.toFixed(2),
      })),
    });
  } catch (error) {
    logger.error('Trade history retrieval failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao recuperar histórico' });
  }
});

/**
 * POST /api/risk/reset-session
 * Reseta a sessão de trading (clearing de trades)
 */
router.post('/reset-session', async (req: Request, res: Response) => {
  try {
    logger.info('Session reset requested');

    RiskManager.resetSession();

    res.json({
      success: true,
      message: 'Session reset successfully',
    });
  } catch (error) {
    logger.error('Session reset failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao resetar sessão' });
  }
});

/**
 * GET /api/risk/info
 * Informações sobre risk manager
 */
router.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'RiskManager',
    version: '1.0.0',
    description: 'Position sizing, risk tracking, e stop/TP management',
    features: {
      positionSizing: ['Kelly Criterion', 'Fixed Risk %', 'Fixed Amount'],
      riskControls: ['Daily Loss Limit', 'Max Drawdown', 'RR Ratio Min'],
      tradeTracking: ['Open/Close', 'P&L Calculation', 'Session Metrics'],
      slippageAdjustment: ['SL Adjustment', 'TP Adjustment', 'Trailing Stops'],
    },
    endpoints: {
      calculatePosition: 'POST /api/risk/calculate-position',
      recordTrade: 'POST /api/risk/record-trade',
      closeTrade: 'POST /api/risk/close-trade',
      sessionMetrics: 'GET /api/risk/session-metrics',
      tradeHistory: 'GET /api/risk/trade-history',
      resetSession: 'POST /api/risk/reset-session',
      info: 'GET /api/risk/info',
    },
  });
});

export default router;
