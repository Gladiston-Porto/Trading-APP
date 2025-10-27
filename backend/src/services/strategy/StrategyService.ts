import { PrismaClient } from '@prisma/client';
import {
  Strategy,
  StrategyConfig,
  StrategyMetrics,
  StrategyComparison,
  StrategyUpdate,
  StrategyStatus,
  StrategyType,
} from './types/strategy.types';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * StrategyService
 * Gerencia estratégias de trading customizadas e suas métricas
 */
class StrategyService {
  /**
   * Criar nova estratégia
   */
  static async createStrategy(config: StrategyConfig): Promise<Strategy> {
    try {
      logger.info(`[Strategy] Criando estratégia: ${config.name}`, {
        userId: config.userId,
        type: config.type,
        tickers: config.tickers,
      });

      // Validar entrada
      this.validateStrategyConfig(config);

      // Criar estratégia
      const strategy = await prisma.strategy.create({
        data: {
          userId: config.userId,
          name: config.name,
          description: config.description,
          type: config.type,
          tickers: config.tickers,
          parameters: config.parameters,
          riskProfile: config.riskProfile,
          minWinRate: config.minWinRate || 0,
          minSharpeRatio: config.minSharpeRatio || 0,
          maxDrawdown: config.maxDrawdown || 100,
          status: config.status || StrategyStatus.DRAFT,
          tags: [],
          backtestCount: 0,
          averageWinRate: 0,
          averageSharpeRatio: 0,
        },
      });

      logger.info(`[Strategy] Estratégia criada: ${strategy.id}`);

      return strategy as Strategy;
    } catch (error) {
      logger.error('[Strategy] Erro ao criar estratégia:', error);
      throw error;
    }
  }

  /**
   * Obter estratégia por ID
   */
  static async getStrategy(userId: string, strategyId: string): Promise<Strategy> {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });

      if (!strategy) {
        throw new Error('Estratégia não encontrada');
      }

      if (strategy.userId !== userId) {
        throw new Error('Acesso negado');
      }

      return strategy as Strategy;
    } catch (error) {
      logger.error('[Strategy] Erro ao obter estratégia:', error);
      throw error;
    }
  }

  /**
   * Listar estratégias do usuário
   */
  static async listStrategies(
    userId: string,
    filters?: {
      status?: StrategyStatus;
      type?: StrategyType;
      ticker?: string;
    },
    limit: number = 50
  ): Promise<Strategy[]> {
    try {
      const where: any = { userId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.type) {
        where.type = filters.type;
      }

      if (filters?.ticker) {
        where.tickers = {
          has: filters.ticker,
        };
      }

      const strategies = await prisma.strategy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
      });

      return strategies as Strategy[];
    } catch (error) {
      logger.error('[Strategy] Erro ao listar estratégias:', error);
      throw error;
    }
  }

  /**
   * Atualizar estratégia
   */
  static async updateStrategy(
    userId: string,
    strategyId: string,
    update: StrategyUpdate
  ): Promise<Strategy> {
    try {
      // Verificar acesso
      const strategy = await this.getStrategy(userId, strategyId);

      logger.info(`[Strategy] Atualizando estratégia: ${strategyId}`, {
        fields: Object.keys(update),
      });

      // Validar novos parâmetros
      if (update.parameters) {
        if (update.minSharpeRatio && update.minSharpeRatio < -5) {
          throw new Error('minSharpeRatio deve ser >= -5');
        }
        if (update.maxDrawdown && (update.maxDrawdown < 0 || update.maxDrawdown > 100)) {
          throw new Error('maxDrawdown deve estar entre 0 e 100');
        }
      }

      const updated = await prisma.strategy.update({
        where: { id: strategyId },
        data: {
          name: update.name || strategy.name,
          description: update.description || strategy.description,
          parameters: update.parameters || strategy.parameters,
          riskProfile: update.riskProfile || strategy.riskProfile,
          minWinRate: update.minWinRate ?? strategy.minWinRate,
          minSharpeRatio: update.minSharpeRatio ?? strategy.minSharpeRatio,
          maxDrawdown: update.maxDrawdown ?? strategy.maxDrawdown,
          status: update.status || strategy.status,
          tags: update.tags || strategy.tags,
          tickers: update.tickers || strategy.tickers,
        },
      });

      logger.info(`[Strategy] Estratégia ${strategyId} atualizada`);

      return updated as Strategy;
    } catch (error) {
      logger.error('[Strategy] Erro ao atualizar estratégia:', error);
      throw error;
    }
  }

  /**
   * Deletar estratégia
   */
  static async deleteStrategy(userId: string, strategyId: string): Promise<void> {
    try {
      // Verificar acesso
      await this.getStrategy(userId, strategyId);

      await prisma.strategy.delete({
        where: { id: strategyId },
      });

      logger.info(`[Strategy] Estratégia ${strategyId} deletada`);
    } catch (error) {
      logger.error('[Strategy] Erro ao deletar estratégia:', error);
      throw error;
    }
  }

  /**
   * Clonar estratégia
   */
  static async cloneStrategy(userId: string, strategyId: string, newName: string): Promise<Strategy> {
    try {
      const original = await this.getStrategy(userId, strategyId);

      logger.info(`[Strategy] Clonando estratégia ${strategyId} para: ${newName}`);

      const cloned = await prisma.strategy.create({
        data: {
          userId,
          name: newName,
          description: `Clone de ${original.name}`,
          type: original.type as any,
          tickers: original.tickers,
          parameters: original.parameters,
          riskProfile: original.riskProfile as any,
          minWinRate: original.minWinRate || 0,
          minSharpeRatio: original.minSharpeRatio || 0,
          maxDrawdown: original.maxDrawdown || 100,
          status: StrategyStatus.DRAFT,
          tags: [...original.tags, 'cloned'],
          backtestCount: 0,
          averageWinRate: 0,
          averageSharpeRatio: 0,
        },
      });

      logger.info(`[Strategy] Estratégia clonada: ${cloned.id}`);

      return cloned as Strategy;
    } catch (error) {
      logger.error('[Strategy] Erro ao clonar estratégia:', error);
      throw error;
    }
  }

  /**
   * Atualizar métricas de estratégia após backtest
   */
  static async updateStrategyMetricsAfterBacktest(
    userId: string,
    strategyId: string
  ): Promise<void> {
    try {
      const metrics = await this.getStrategyMetrics(userId, strategyId);

      await prisma.strategy.update({
        where: { id: strategyId },
        data: {
          backtestCount: metrics.totalBacktests,
          averageWinRate: metrics.averageWinRate,
          averageSharpeRatio: metrics.averageSharpeRatio,
        },
      });

      logger.info(`[Strategy] Métricas atualizadas para ${strategyId}`);
    } catch (error) {
      logger.error('[Strategy] Erro ao atualizar métricas:', error);
      // Não lançar erro para não interromper fluxo de backtest
    }
  }

  /**
   * Calcular métricas de estratégia
   */
  static async getStrategyMetrics(userId: string, strategyId: string): Promise<StrategyMetrics> {
    try {
      await this.getStrategy(userId, strategyId); // Verificar acesso

      // Buscar backtests relacionados
      const backtests = await prisma.backtest.findMany({
        where: {
          userId,
        },
        take: 100,
      });

      if (backtests.length === 0) {
        return {
          strategyId,
          totalBacktests: 0,
          successfulBacktests: 0,
          failedBacktests: 0,
          averageWinRate: 0,
          averageSharpeRatio: 0,
          averageSortinoRatio: 0,
          averageCalmarRatio: 0,
          averageMaxDrawdown: 0,
          averageCagr: 0,
          bestPerformance: {
            ticker: '-',
            winRate: 0,
            sharpeRatio: 0,
            cagr: 0,
          },
          worstPerformance: {
            ticker: '-',
            winRate: 0,
            sharpeRatio: 0,
            cagr: 0,
          },
        };
      }

      const completed = backtests.filter((b: any) => b.status === 'COMPLETED');
      const failed = backtests.filter((b: any) => b.status === 'FAILED');

      const avgWinRate =
        completed.reduce((sum: number, b: any) => sum + (b.winRate || 0), 0) / Math.max(completed.length, 1);
      const avgSharpe =
        completed.reduce((sum: number, b: any) => sum + (b.sharpeRatio || 0), 0) / Math.max(completed.length, 1);
      const avgSortino =
        completed.reduce((sum: number, b: any) => sum + (b.sortinoRatio || 0), 0) / Math.max(completed.length, 1);
      const avgCalmar =
        completed.reduce((sum: number, b: any) => sum + (b.calmarRatio || 0), 0) / Math.max(completed.length, 1);
      const avgDD =
        completed.reduce((sum: number, b: any) => sum + (b.maxDrawdown || 0), 0) / Math.max(completed.length, 1);
      const avgCAGR =
        completed.reduce((sum: number, b: any) => sum + (b.cagr || 0), 0) / Math.max(completed.length, 1);

      // Best and worst
      const sorted = [...completed].sort((a, b) => (b.sharpeRatio || 0) - (a.sharpeRatio || 0));
      const best = sorted[0] || backtests[0];
      const worst = sorted[sorted.length - 1] || backtests[0];

      logger.info(`[Strategy] Métricas calculadas para ${strategyId}`, {
        totalBacktests: backtests.length,
        avgWinRate: avgWinRate.toFixed(2),
        avgSharpe: avgSharpe.toFixed(2),
      });

      return {
        strategyId,
        totalBacktests: backtests.length,
        successfulBacktests: completed.length,
        failedBacktests: failed.length,
        averageWinRate: avgWinRate,
        averageSharpeRatio: avgSharpe,
        averageSortinoRatio: avgSortino,
        averageCalmarRatio: avgCalmar,
        averageMaxDrawdown: avgDD,
        averageCagr: avgCAGR,
        bestPerformance: {
          ticker: best.ticker,
          winRate: best.winRate || 0,
          sharpeRatio: best.sharpeRatio || 0,
          cagr: best.cagr || 0,
        },
        worstPerformance: {
          ticker: worst.ticker,
          winRate: worst.winRate || 0,
          sharpeRatio: worst.sharpeRatio || 0,
          cagr: worst.cagr || 0,
        },
      };
    } catch (error) {
      logger.error('[Strategy] Erro ao calcular métricas:', error);
      throw error;
    }
  }

  /**
   * Comparar duas estratégias
   */
  static async compareStrategies(
    userId: string,
    strategyId1: string,
    strategyId2: string
  ): Promise<StrategyComparison> {
    try {
      const metrics1 = await this.getStrategyMetrics(userId, strategyId1);
      const metrics2 = await this.getStrategyMetrics(userId, strategyId2);

      const strategy1 = await this.getStrategy(userId, strategyId1);
      const strategy2 = await this.getStrategy(userId, strategyId2);

      const difference = {
        winRate: metrics1.averageWinRate - metrics2.averageWinRate,
        sharpeRatio: metrics1.averageSharpeRatio - metrics2.averageSharpeRatio,
        sortinoRatio: metrics1.averageSortinoRatio - metrics2.averageSortinoRatio,
        calmarRatio: metrics1.averageCalmarRatio - metrics2.averageCalmarRatio,
        maxDrawdown: metrics2.averageMaxDrawdown - metrics1.averageMaxDrawdown, // Inverso (menor é melhor)
        cagr: metrics1.averageCagr - metrics2.averageCagr,
      };

      // Determinar vencedora (soma ponderada)
      const score1 =
        difference.sharpeRatio * 0.3 +
        difference.winRate * 0.2 +
        difference.cagr * 0.3 +
        difference.maxDrawdown * 0.2; // maxDD negativo = menos drawdown

      const winner = score1 > 0 ? strategyId1 : strategyId2;

      logger.info(`[Strategy] Comparação: ${strategyId1} vs ${strategyId2}`, {
        winner,
        sharpeRatioDiff: difference.sharpeRatio.toFixed(2),
      });

      return {
        strategy1: {
          id: strategy1.id,
          name: strategy1.name,
          metrics: metrics1,
        },
        strategy2: {
          id: strategy2.id,
          name: strategy2.name,
          metrics: metrics2,
        },
        difference,
        winner,
      };
    } catch (error) {
      logger.error('[Strategy] Erro ao comparar estratégias:', error);
      throw error;
    }
  }

  /**
   * Adicionar tag à estratégia
   */
  static async addTag(userId: string, strategyId: string, tag: string): Promise<Strategy> {
    try {
      const strategy = await this.getStrategy(userId, strategyId);

      if (strategy.tags.includes(tag)) {
        return strategy; // Já contém a tag
      }

      const updated = await prisma.strategy.update({
        where: { id: strategyId },
        data: {
          tags: [...strategy.tags, tag],
        },
      });

      return updated as Strategy;
    } catch (error) {
      logger.error('[Strategy] Erro ao adicionar tag:', error);
      throw error;
    }
  }

  /**
   * Remover tag da estratégia
   */
  static async removeTag(userId: string, strategyId: string, tag: string): Promise<Strategy> {
    try {
      const strategy = await this.getStrategy(userId, strategyId);

      const updated = await prisma.strategy.update({
        where: { id: strategyId },
        data: {
          tags: strategy.tags.filter((t) => t !== tag),
        },
      });

      return updated as Strategy;
    } catch (error) {
      logger.error('[Strategy] Erro ao remover tag:', error);
      throw error;
    }
  }

  /**
   * PRIVATE: Validar configuração de estratégia
   */
  private static validateStrategyConfig(config: StrategyConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Nome da estratégia é obrigatório');
    }

    if (!config.description || config.description.trim().length === 0) {
      throw new Error('Descrição da estratégia é obrigatória');
    }

    if (!config.tickers || config.tickers.length === 0) {
      throw new Error('Pelo menos um ticker deve ser especificado');
    }

    if (!config.parameters || Object.keys(config.parameters).length === 0) {
      throw new Error('Parâmetros da estratégia são obrigatórios');
    }

    if (config.minWinRate !== undefined && (config.minWinRate < 0 || config.minWinRate > 100)) {
      throw new Error('minWinRate deve estar entre 0 e 100');
    }

    if (config.minSharpeRatio !== undefined && config.minSharpeRatio < -5) {
      throw new Error('minSharpeRatio deve ser >= -5');
    }

    if (config.maxDrawdown !== undefined && (config.maxDrawdown < 0 || config.maxDrawdown > 100)) {
      throw new Error('maxDrawdown deve estar entre 0 e 100');
    }
  }
}

export default StrategyService;
