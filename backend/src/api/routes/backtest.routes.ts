import express, { Router, Request, Response } from 'express';
import BacktestService from '../../services/backtest/BacktestService';
import logger from '../../utils/logger';

const router: Router = express.Router();

/**
 * POST /api/backtest/create
 * Criar novo backtest
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Validação básica
    if (!req.body.ticker || !req.body.startDate || !req.body.endDate || !req.body.strategy) {
      logger.warn('[Backtest Routes] Validação falhou: campos obrigatórios ausentes');
      return res.status(400).json({
        error: 'Dados inválidos',
        required: ['ticker', 'startDate', 'endDate', 'strategy', 'parameters'],
      });
    }

    const validStrategies = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER'];
    if (!validStrategies.includes(req.body.strategy)) {
      logger.warn('[Backtest Routes] Estratégia inválida:', req.body.strategy);
      return res.status(400).json({
        error: 'Estratégia inválida',
        validStrategies,
      });
    }

    const config = {
      ticker: req.body.ticker,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      strategy: req.body.strategy,
      parameters: req.body.parameters || {},
    };

    const backtest = await BacktestService.createBacktest(userId, config);

    logger.info('[Backtest Routes] Backtest criado:', {
      backtestId: backtest.id,
      ticker: backtest.ticker,
      strategy: backtest.strategy,
    });

    return res.status(201).json({
      id: backtest.id,
      ticker: backtest.ticker,
      strategy: backtest.strategy,
      status: backtest.status,
      createdAt: backtest.createdAt,
    });
  } catch (error) {
    logger.error('[Backtest Routes] Erro ao criar backtest:', error);
    return res.status(500).json({
      error: 'Erro ao criar backtest',
    });
  }
});

/**
 * POST /api/backtest/:id/run
 * Executar backtest
 */
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const backtestId = req.params.id;

    if (!backtestId || typeof backtestId !== 'string') {
      return res.status(400).json({
        error: 'ID do backtest inválido',
      });
    }

    const result = await BacktestService.runBacktest(userId, backtestId);

    logger.info('[Backtest Routes] Backtest executado:', {
      backtestId: result.id,
      status: result.status,
      totalTrades: result.totalTrades,
    });

    return res.status(200).json({
      id: result.id,
      status: result.status,
      totalTrades: result.totalTrades,
      winRate: result.winRate,
      sharpeRatio: result.sharpeRatio,
      totalReturn: result.totalReturn,
      executionTime: result.executionTime,
    });
  } catch (error) {
    logger.error('[Backtest Routes] Erro ao executar backtest:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao executar backtest',
    });
  }
});

/**
 * GET /api/backtest/:id/results
 * Obter resultados do backtest
 */
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const backtestId = req.params.id;

    if (!backtestId || typeof backtestId !== 'string') {
      return res.status(400).json({
        error: 'ID do backtest inválido',
      });
    }

    const results = await BacktestService.getBacktestResults(userId, backtestId);

    return res.status(200).json(results);
  } catch (error) {
    logger.error('[Backtest Routes] Erro ao obter resultados:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao obter resultados',
    });
  }
});

/**
 * GET /api/backtest/history
 * Obter histórico de backtests
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const history = await BacktestService.getBacktestHistory(userId, limit);

    return res.status(200).json({
      count: history.length,
      backtests: history,
    });
  } catch (error) {
    logger.error('[Backtest Routes] Erro ao obter histórico:', error);
    return res.status(500).json({
      error: 'Erro ao obter histórico',
    });
  }
});

/**
 * DELETE /api/backtest/:id
 * Deletar backtest
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const backtestId = req.params.id;

    if (!backtestId || typeof backtestId !== 'string') {
      return res.status(400).json({
        error: 'ID do backtest inválido',
      });
    }

    const result = await BacktestService.deleteBacktest(userId, backtestId);

    logger.info('[Backtest Routes] Backtest deletado:', {
      backtestId,
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error('[Backtest Routes] Erro ao deletar backtest:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao deletar backtest',
    });
  }
});

/**
 * GET /api/backtest/info
 * Informações sobre estratégias disponíveis
 */
router.get('/info', async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      strategies: [
        {
          name: 'RSI_CROSSOVER',
          description: 'Relativity Strength Index com níveis de Oversold/Overbought',
          parameters: {
            rsi_period: { default: 14, min: 5, max: 50, type: 'integer' },
            oversold: { default: 30, min: 10, max: 40, type: 'integer' },
            overbought: { default: 70, min: 60, max: 90, type: 'integer' },
          },
        },
        {
          name: 'MACD',
          description: 'Moving Average Convergence Divergence com cruzamento de linha de sinal',
          parameters: {
            fast_period: { default: 12, min: 5, max: 20, type: 'integer' },
            slow_period: { default: 26, min: 20, max: 50, type: 'integer' },
            signal_period: { default: 9, min: 5, max: 15, type: 'integer' },
          },
        },
        {
          name: 'BOLLINGER',
          description: 'Bandas de Bollinger com toque em bandas superior/inferior',
          parameters: {
            period: { default: 20, min: 10, max: 50, type: 'integer' },
            stddev: { default: 2, min: 1, max: 3, type: 'float' },
          },
        },
        {
          name: 'SMA_CROSSOVER',
          description: 'Cruzamento de Médias Móveis Simples rápida e lenta',
          parameters: {
            fast_sma: { default: 10, min: 5, max: 20, type: 'integer' },
            slow_sma: { default: 20, min: 20, max: 50, type: 'integer' },
          },
        },
      ],
      metrics: {
        sharpeRatio: 'Retorno ajustado pelo risco (anualizado)',
        sortinoRatio: 'Retorno ajustado pelo risco descendente (anualizado)',
        calmarRatio: 'Retorno ajustado pela drawdown máxima',
        maxDrawdown: 'Queda percentual máxima do topo',
        winRate: 'Percentual de trades vencedores',
        profitFactor: 'Ganhos totais / Perdas totais',
        cagr: 'Taxa de crescimento anual composto',
      },
    });
  } catch (error) {
    logger.error('[Backtest Routes] Erro ao obter informações:', error);
    return res.status(500).json({
      error: 'Erro ao obter informações',
    });
  }
});

export default router;
