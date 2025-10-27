import express, { Router, Request, Response } from 'express';
import StrategyService from '../../services/strategy/StrategyService';
import { StrategyType, StrategyStatus } from '../../services/strategy/types/strategy.types';
import logger from '../../utils/logger';

const router: Router = express.Router();

/**
 * POST /api/strategy/create
 * Criar nova estratégia
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!req.body.name || !req.body.description || !req.body.tickers || !req.body.parameters) {
      return res.status(400).json({
        error: 'Campos obrigatórios: name, description, tickers, parameters',
      });
    }

    const validTypes = Object.values(StrategyType);
    if (!validTypes.includes(req.body.type)) {
      return res.status(400).json({
        error: 'Tipo de estratégia inválido',
        validTypes,
      });
    }

    const strategy = await StrategyService.createStrategy({
      userId,
      name: req.body.name,
      description: req.body.description,
      type: req.body.type,
      tickers: req.body.tickers,
      parameters: req.body.parameters,
      riskProfile: req.body.riskProfile || 'moderate',
      minWinRate: req.body.minWinRate,
      minSharpeRatio: req.body.minSharpeRatio,
      maxDrawdown: req.body.maxDrawdown,
    });

    logger.info('[Strategy Routes] Estratégia criada:', {
      strategyId: strategy.id,
      name: strategy.name,
    });

    return res.status(201).json(strategy);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao criar estratégia:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao criar estratégia',
    });
  }
});

/**
 * GET /api/strategy/:id
 * Obter estratégia por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const strategyId = req.params.id;

    if (!strategyId) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const strategy = await StrategyService.getStrategy(userId, strategyId);

    return res.status(200).json(strategy);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao obter estratégia:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao obter estratégia',
    });
  }
});

/**
 * GET /api/strategy/list
 * Listar estratégias do usuário
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const status = (req.query.status as string) || undefined;
    const type = (req.query.type as string) || undefined;
    const ticker = (req.query.ticker as string) || undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const filters = {
      status: status as StrategyStatus,
      type: type as StrategyType,
      ticker,
    };

    const strategies = await StrategyService.listStrategies(userId, filters, limit);

    return res.status(200).json({
      count: strategies.length,
      strategies,
    });
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao listar estratégias:', error);
    return res.status(500).json({
      error: 'Erro ao listar estratégias',
    });
  }
});

/**
 * PUT /api/strategy/:id
 * Atualizar estratégia
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const strategyId = req.params.id;

    if (!strategyId) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const updated = await StrategyService.updateStrategy(userId, strategyId, req.body);

    logger.info('[Strategy Routes] Estratégia atualizada:', {
      strategyId,
    });

    return res.status(200).json(updated);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao atualizar estratégia:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao atualizar estratégia',
    });
  }
});

/**
 * DELETE /api/strategy/:id
 * Deletar estratégia
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const strategyId = req.params.id;

    if (!strategyId) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await StrategyService.deleteStrategy(userId, strategyId);

    logger.info('[Strategy Routes] Estratégia deletada:', {
      strategyId,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao deletar estratégia:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao deletar estratégia',
    });
  }
});

/**
 * POST /api/strategy/:id/clone
 * Clonar estratégia
 */
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const strategyId = req.params.id;
    const newName = req.body.newName;

    if (!strategyId || !newName) {
      return res.status(400).json({
        error: 'ID e newName são obrigatórios',
      });
    }

    const cloned = await StrategyService.cloneStrategy(userId, strategyId, newName);

    logger.info('[Strategy Routes] Estratégia clonada:', {
      original: strategyId,
      cloned: cloned.id,
    });

    return res.status(201).json(cloned);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao clonar estratégia:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao clonar estratégia',
    });
  }
});

/**
 * GET /api/strategy/:id/metrics
 * Obter métricas de estratégia
 */
router.get('/:id/metrics', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const strategyId = req.params.id;

    if (!strategyId) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const metrics = await StrategyService.getStrategyMetrics(userId, strategyId);

    return res.status(200).json(metrics);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao obter métricas:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao obter métricas',
    });
  }
});

/**
 * POST /api/strategy/compare
 * Comparar duas estratégias
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { strategyId1, strategyId2 } = req.body;

    if (!strategyId1 || !strategyId2) {
      return res.status(400).json({
        error: 'strategyId1 e strategyId2 são obrigatórios',
      });
    }

    if (strategyId1 === strategyId2) {
      return res.status(400).json({
        error: 'Não é possível comparar a mesma estratégia',
      });
    }

    const comparison = await StrategyService.compareStrategies(userId, strategyId1, strategyId2);

    logger.info('[Strategy Routes] Estratégias comparadas:', {
      strategy1: strategyId1,
      strategy2: strategyId2,
      winner: comparison.winner,
    });

    return res.status(200).json(comparison);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao comparar estratégias:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao comparar estratégias',
    });
  }
});

/**
 * POST /api/strategy/:id/tag
 * Adicionar tag à estratégia
 */
router.post('/:id/tag', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const strategyId = req.params.id;
    const { tag } = req.body;

    if (!strategyId || !tag) {
      return res.status(400).json({
        error: 'ID e tag são obrigatórios',
      });
    }

    const updated = await StrategyService.addTag(userId, strategyId, tag);

    return res.status(200).json(updated);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao adicionar tag:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao adicionar tag',
    });
  }
});

/**
 * DELETE /api/strategy/:id/tag
 * Remover tag da estratégia
 */
router.delete('/:id/tag', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const strategyId = req.params.id;
    const { tag } = req.body;

    if (!strategyId || !tag) {
      return res.status(400).json({
        error: 'ID e tag são obrigatórios',
      });
    }

    const updated = await StrategyService.removeTag(userId, strategyId, tag);

    return res.status(200).json(updated);
  } catch (error) {
    logger.error('[Strategy Routes] Erro ao remover tag:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao remover tag',
    });
  }
});

export default router;
