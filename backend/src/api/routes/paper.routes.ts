import { Router, Request, Response } from 'express';
import PaperTradeService from '../../services/paper/PaperTradeService';
import { authMiddleware } from '../middleware/auth.middleware';
import logger from '../../utils/logger';

const paperRouter = Router();

/**
 * Middleware: Autenticação obrigatória
 */
paperRouter.use(authMiddleware);

/**
 * POST /api/paper/record-trade
 * Registra um novo trade em papel
 *
 * Body:
 * {
 *   "ticker": "PETR4",
 *   "entryPrice": 28.50,
 *   "direction": "BUY",
 *   "shares": 100,
 *   "stopLoss": 27.00,
 *   "takeProfit": 30.00,
 *   "notes": "Sinal de ruptura"
 * }
 */
paperRouter.post('/record-trade', async (req: Request, res: Response) => {
  try {
    const { ticker, entryPrice, direction, shares, stopLoss, takeProfit, notes } = req.body;
    const userId = (req as any).userId;

    // Validações
    if (!ticker || !entryPrice || !direction || !shares) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ticker, entryPrice, direction, shares',
      });
    }

    if (!['BUY', 'SELL'].includes(direction)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid direction. Must be BUY or SELL',
      });
    }

    if (entryPrice <= 0 || shares <= 0) {
      return res.status(400).json({
        success: false,
        error: 'entryPrice and shares must be greater than 0',
      });
    }

    if (stopLoss >= entryPrice || takeProfit <= entryPrice) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stopLoss or takeProfit levels',
      });
    }

    const trade = await PaperTradeService.recordTrade({
      userId,
      ticker,
      entryPrice,
      direction,
      shares,
      stopLoss,
      takeProfit,
      notes,
    });

    logger.info('Paper trade recorded', { userId, ticker, direction, shares });

    res.status(201).json({
      success: true,
      data: trade,
      message: 'Trade recorded successfully',
    });
  } catch (error) {
    logger.error('Error recording paper trade', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to record trade',
      details: (error as Error).message,
    });
  }
});

/**
 * POST /api/paper/close-trade
 * Fecha um trade aberto
 *
 * Body:
 * {
 *   "tradeId": "uuid-here",
 *   "exitPrice": 29.50,
 *   "exitType": "TP"  // "TP" | "SL" | "MANUAL"
 * }
 */
paperRouter.post('/close-trade', async (req: Request, res: Response) => {
  try {
    const { tradeId, exitPrice, exitType = 'MANUAL' } = req.body;

    // Validações
    if (!tradeId || !exitPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tradeId, exitPrice',
      });
    }

    if (!['TP', 'SL', 'MANUAL'].includes(exitType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid exitType. Must be TP, SL, or MANUAL',
      });
    }

    if (exitPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'exitPrice must be greater than 0',
      });
    }

    const trade = await PaperTradeService.closeTrade(tradeId, exitPrice, exitType);

    logger.info('Paper trade closed', { tradeId, exitPrice, exitType, profit: trade.profit });

    res.status(200).json({
      success: true,
      data: trade,
      message: 'Trade closed successfully',
    });
  } catch (error) {
    logger.error('Error closing paper trade', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to close trade',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/paper/open-trades
 * Retorna todos os trades abertos do usuário
 */
paperRouter.get('/open-trades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const trades = await PaperTradeService.getOpenTrades(userId);

    res.status(200).json({
      success: true,
      data: trades,
      count: trades.length,
      message: `Found ${trades.length} open trades`,
    });
  } catch (error) {
    logger.error('Error fetching open trades', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch open trades',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/paper/closed-trades?limit=100
 * Retorna trades fechados do usuário com paginação
 *
 * Query params:
 * - limit: número máximo de trades (padrão: 100)
 */
paperRouter.get('/closed-trades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const trades = await PaperTradeService.getClosedTrades(userId, limit);

    res.status(200).json({
      success: true,
      data: trades,
      count: trades.length,
      limit,
      message: `Found ${trades.length} closed trades`,
    });
  } catch (error) {
    logger.error('Error fetching closed trades', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch closed trades',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/paper/trades?status=OPEN&ticker=PETR4&from=2024-01-01&to=2024-12-31
 * Query universal de trades com filtros
 *
 * Query params:
 * - status: "OPEN" | "CLOSED_TP" | "CLOSED_SL" | "CLOSED_MAN" | "CLOSED" (qualquer fechado)
 * - ticker: filtrar por ticker
 * - from: data inicial (ISO format)
 * - to: data final (ISO format)
 */
paperRouter.get('/trades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const filters = {
      status: req.query.status as string | undefined,
      ticker: req.query.ticker as string | undefined,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
    };

    const trades = await PaperTradeService.getTrades(userId, filters);

    res.status(200).json({
      success: true,
      data: trades,
      count: trades.length,
      filters: {
        status: filters.status,
        ticker: filters.ticker,
        from: filters.from?.toISOString(),
        to: filters.to?.toISOString(),
      },
      message: `Found ${trades.length} trades matching filters`,
    });
  } catch (error) {
    logger.error('Error querying trades', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to query trades',
      details: (error as Error).message,
    });
  }
});

/**
 * POST /api/paper/session/start
 * Inicia uma nova sessão de paper trading
 *
 * Body:
 * {
 *   "initialCapital": 10000
 * }
 */
paperRouter.post('/session/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { initialCapital } = req.body;

    if (!initialCapital || initialCapital <= 0) {
      return res.status(400).json({
        success: false,
        error: 'initialCapital must be provided and greater than 0',
      });
    }

    const sessionId = await PaperTradeService.startSession(userId, initialCapital);

    logger.info('Paper trading session started', { userId, sessionId, initialCapital });

    res.status(201).json({
      success: true,
      data: { sessionId, initialCapital },
      message: 'Session started successfully',
    });
  } catch (error) {
    logger.error('Error starting session', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to start session',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/paper/session/metrics
 * Retorna métricas da sessão ativa
 */
paperRouter.get('/session/metrics', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const metrics = await PaperTradeService.getSessionMetrics(userId);

    res.status(200).json({
      success: true,
      data: metrics,
      message: 'Session metrics retrieved successfully',
    });
  } catch (error) {
    logger.error('Error fetching session metrics', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session metrics',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/paper/session/history?limit=10
 * Retorna histórico de sessões anteriores
 *
 * Query params:
 * - limit: número máximo de sessões (padrão: 10, máximo: 100)
 */
paperRouter.get('/session/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const history = await PaperTradeService.getSessionHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: history,
      count: history.length,
      limit,
      message: `Found ${history.length} session(s) in history`,
    });
  } catch (error) {
    logger.error('Error fetching session history', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session history',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/paper/info
 * Retorna informações sobre a API de Paper Trading
 */
paperRouter.get('/info', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Paper Trading API',
      version: '1.0.0',
      description: 'Virtual trading simulation with realistic P&L calculations and advanced statistics',
      features: [
        'Record and close virtual trades',
        'Direction-aware P&L (BUY/SELL)',
        'Advanced statistics (Sharpe, Sortino, Calmar ratios)',
        'Multi-session tracking',
        'Max drawdown calculation',
        'Win rate and profit factor metrics',
        'Trade history and filtering',
        'Real-time session metrics',
      ],
      endpoints: {
        'POST /api/paper/record-trade': 'Record a new paper trade',
        'POST /api/paper/close-trade': 'Close an open trade',
        'GET /api/paper/open-trades': 'Get all open trades',
        'GET /api/paper/closed-trades': 'Get closed trades with pagination',
        'GET /api/paper/trades': 'Query trades with filters',
        'POST /api/paper/session/start': 'Start a new trading session',
        'GET /api/paper/session/metrics': 'Get current session metrics',
        'GET /api/paper/session/history': 'Get session history',
        'GET /api/paper/info': 'Get API information',
      },
      statistics: {
        sharpe_ratio: 'Risk-adjusted return (annualized with 252 trading days)',
        sortino_ratio: 'Downside risk-adjusted return (only negative returns)',
        calmar_ratio: 'CAGR divided by maximum drawdown',
        max_drawdown: 'Peak-to-trough decline in capital',
        win_rate: 'Percentage of winning trades',
        profit_factor: 'Ratio of total wins to total losses',
      },
      author: 'AI Trading Platform',
    },
    message: 'Paper Trading API is running',
  });
});

export { paperRouter };
