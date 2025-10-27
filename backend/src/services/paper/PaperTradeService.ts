/**
 * Paper Trade Service
 * Simulator de trading com persistência em Prisma
 * 
 * Features:
 * - Record/Close trades com P&L
 * - Session tracking com estatísticas
 * - Sharpe, Sortino, Calmar ratios
 * - Max drawdown tracking
 * - Trade history persistent
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger';

// Será injetado pelo server.ts
let prisma: PrismaClient;

export function setPrisma(prismaClient: PrismaClient): void {
  prisma = prismaClient;
}

export interface TradeInput {
  userId: string;
  ticker: string;
  entryPrice: number;
  direction: 'BUY' | 'SELL';
  shares: number;
  stopLoss: number;
  takeProfit: number;
  signal?: string;
  notes?: string;
}

export interface TradeOutput {
  id: string;
  ticker: string;
  entryPrice: number;
  entryTime: Date;
  direction: 'BUY' | 'SELL';
  shares: number;
  stopLoss: number;
  takeProfit: number;
  status: string;
  profit?: number;
  profitPct?: number;
}

export interface SessionMetrics {
  totalTrades: number;
  winningTrades: number;
  loosingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  totalPnL: number;
  largestWin: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
}

/**
 * Paper Trade Service
 * Singleton com métodos estáticos
 */
class PaperTradeService {
  /**
   * Registra novo paper trade
   */
  static async recordTrade(input: TradeInput): Promise<TradeOutput> {
    try {
      const positionSize = input.shares * input.entryPrice;
      const riskAmount = Math.abs(input.entryPrice - input.stopLoss) * input.shares;

      const trade = await prisma.paperTrade.create({
        data: {
          userId: input.userId,
          ticker: input.ticker,
          entryPrice: input.entryPrice,
          entryTime: new Date(),
          direction: input.direction as any,
          shares: input.shares,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          positionSize,
          riskAmount,
          signal: input.signal,
          notes: input.notes,
          status: 'OPEN',
        },
      });

      logger.info('Paper trade recorded', {
        ticker: input.ticker,
        shares: input.shares,
        direction: input.direction,
      });

      return this.formatTrade(trade);
    } catch (error) {
      logger.error('Failed to record trade', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Fecha trade com cálculo de P&L
   */
  static async closeTrade(
    tradeId: string,
    exitPrice: number,
    exitType: 'TP' | 'SL' | 'MANUAL' = 'MANUAL'
  ): Promise<TradeOutput> {
    try {
      const trade = await prisma.paperTrade.findUnique({
        where: { id: tradeId },
      });

      if (!trade) {
        throw new Error(`Trade ${tradeId} not found`);
      }

      if (trade.status !== 'OPEN') {
        throw new Error(`Trade ${tradeId} is not open`);
      }

      // Cálculo de P&L
      let profit: number;
      if (trade.direction === 'BUY') {
        profit = (exitPrice - trade.entryPrice) * trade.shares;
      } else {
        // SELL: lucro = (entry - exit) × shares
        profit = (trade.entryPrice - exitPrice) * trade.shares;
      }

      const profitPct = (profit / trade.positionSize) * 100;

      const closedStatus = `CLOSED_${exitType}`;

      const updatedTrade = await prisma.paperTrade.update({
        where: { id: tradeId },
        data: {
          exitPrice,
          exitTime: new Date(),
          exitType,
          profit,
          profitPct,
          status: closedStatus as any,
        },
      });

      logger.info('Paper trade closed', {
        ticker: trade.ticker,
        profit,
        profitPct,
        exitType,
      });

      // Atualizar sessão
      await this.updateSessionMetrics(trade.userId);

      return this.formatTrade(updatedTrade);
    } catch (error) {
      logger.error('Failed to close trade', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Obtém todas as transações aberta do usuário
   */
  static async getOpenTrades(userId: string): Promise<TradeOutput[]> {
    try {
      const trades = await prisma.paperTrade.findMany({
        where: {
          userId,
          status: 'OPEN',
        },
        orderBy: {
          entryTime: 'desc',
        },
      });

      return trades.map((t: any) => this.formatTrade(t));
    } catch (error) {
      logger.error('Failed to get open trades', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Obtém histórico de trades fechados
   */
  static async getClosedTrades(userId: string, limit: number = 100): Promise<TradeOutput[]> {
    try {
      const trades = await prisma.paperTrade.findMany({
        where: {
          userId,
          status: {
            not: 'OPEN',
          },
        },
        orderBy: {
          exitTime: 'desc',
        },
        take: limit,
      });

      return trades.map((t: any) => this.formatTrade(t));
    } catch (error) {
      logger.error('Failed to get closed trades', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Obtém todos os trades do usuário com filtro
   */
  static async getTrades(
    userId: string,
    filters?: {
      status?: string;
      ticker?: string;
      from?: Date;
      to?: Date;
    }
  ): Promise<TradeOutput[]> {
    try {
      const where: any = { userId };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.ticker) {
        where.ticker = filters.ticker;
      }

      if (filters?.from || filters?.to) {
        where.entryTime = {};
        if (filters.from) {
          where.entryTime.gte = filters.from;
        }
        if (filters.to) {
          where.entryTime.lte = filters.to;
        }
      }

      const trades = await prisma.paperTrade.findMany({
        where,
        orderBy: {
          entryTime: 'desc',
        },
      });

      return trades.map((t: any) => this.formatTrade(t));
    } catch (error) {
      logger.error('Failed to get trades', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Cria/atualiza sessão de paper trading
   */
  static async startSession(userId: string, initialCapital: number): Promise<string> {
    try {
      // Fechar sessão anterior se ativa
      await prisma.paperSession.updateMany({
        where: {
          userId,
          active: true,
        },
        data: {
          active: false,
          endDate: new Date(),
        },
      });

      // Criar nova sessão
      const session = await prisma.paperSession.create({
        data: {
          userId,
          startDate: new Date(),
          initialCapital,
          finalCapital: initialCapital,
          active: true,
        },
      });

      logger.info('Paper session started', {
        userId,
        capital: initialCapital,
      });

      return session.id;
    } catch (error) {
      logger.error('Failed to start session', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Atualiza métricas da sessão
   */
  private static async updateSessionMetrics(userId: string): Promise<void> {
    try {
      // Obter sessão ativa
      const session = await prisma.paperSession.findFirst({
        where: {
          userId,
          active: true,
        },
      });

      if (!session) {
        return;
      }

      // Obter todos os trades fechados desde início da sessão
      const closedTrades = await prisma.paperTrade.findMany({
        where: {
          userId,
          exitTime: {
            gte: session.startDate,
          },
          profit: {
            not: null,
          },
        },
      });

      if (closedTrades.length === 0) {
        await prisma.paperSession.update({
          where: { id: session.id },
          data: {
            totalTrades: 0,
            winningTrades: 0,
            loosingTrades: 0,
          },
        });
        return;
      }

      // Calcular métricas
      const winningTrades = closedTrades.filter((t: any) => (t.profit ?? 0) > 0);
      const loosingTrades = closedTrades.filter((t: any) => (t.profit ?? 0) < 0);

      const totalPnL = closedTrades.reduce((sum: number, t: any) => sum + (t.profit ?? 0), 0);
      const winRate = (winningTrades.length / closedTrades.length) * 100;

      const totalWins = winningTrades.reduce((sum: number, t: any) => sum + (t.profit ?? 0), 0);
      const totalLosses = Math.abs(loosingTrades.reduce((sum: number, t: any) => sum + (t.profit ?? 0), 0));

      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins;
      const largestWin = Math.max(...winningTrades.map((t: any) => t.profit ?? 0), 0);
      const largestLoss = Math.min(...loosingTrades.map((t: any) => t.profit ?? 0), 0);
      const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
      const averageLoss = loosingTrades.length > 0 ? totalLosses / loosingTrades.length : 0;

      // Calcular Sharpe Ratio
      const returns = closedTrades.map((t: any) => (t.profitPct ?? 0) / 100);
      const avgReturn = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
      const stdDev = Math.sqrt(
        returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      );
      const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // 252 trading days

      // Calcular Sortino Ratio (apenas downside volatility)
      const downsideReturns = returns.filter((r: number) => r < 0);
      const downstdDev = Math.sqrt(
        downsideReturns.reduce((sum: number, r: number) => sum + Math.pow(r, 2), 0) / Math.max(downsideReturns.length, 1)
      );
      const sortinoRatio = downstdDev > 0 ? (avgReturn / downstdDev) * Math.sqrt(252) : 0;

      // Calcular Max Drawdown e Calmar Ratio
      let peak = session.initialCapital;
      let maxDD = 0;
      let currentCapital = session.initialCapital;

      for (const trade of closedTrades) {
        currentCapital += trade.profit ?? 0;
        const drawdown = (peak - currentCapital) / peak;
        if (drawdown > maxDD) {
          maxDD = drawdown;
        }
        if (currentCapital > peak) {
          peak = currentCapital;
        }
      }

      const finalCapital = session.initialCapital + totalPnL;
      const cagr = ((finalCapital / session.initialCapital) - 1) * (365 / this.daysBetween(session.startDate, new Date()));
      const calmarRatio = maxDD > 0 ? cagr / maxDD : 0;

      // Atualizar session
      await prisma.paperSession.update({
        where: { id: session.id },
        data: {
          totalTrades: closedTrades.length,
          winningTrades: winningTrades.length,
          loosingTrades: loosingTrades.length,
          totalPnL,
          finalCapital,
          winRate,
          profitFactor,
          largestWin,
          largestLoss: Math.abs(largestLoss),
          averageWin,
          averageLoss: Math.abs(averageLoss),
          sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
          sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
          calmarRatio: parseFloat(calmarRatio.toFixed(2)),
          maxDrawdown: parseFloat((maxDD * 100).toFixed(2)),
        },
      });

      logger.info('Session metrics updated', {
        userId,
        totalTrades: closedTrades.length,
        winRate,
        totalPnL,
      });
    } catch (error) {
      logger.error('Failed to update session metrics', { error: (error as Error).message });
    }
  }

  /**
   * Obtém métricas da sessão ativa
   */
  static async getSessionMetrics(userId: string): Promise<SessionMetrics> {
    try {
      const session = await prisma.paperSession.findFirst({
        where: {
          userId,
          active: true,
        },
      });

      if (!session) {
        return this.getEmptyMetrics();
      }

      return {
        totalTrades: session.totalTrades ?? 0,
        winningTrades: session.winningTrades ?? 0,
        loosingTrades: session.loosingTrades ?? 0,
        winRate: session.winRate ?? 0,
        profitFactor: session.profitFactor ?? 0,
        sharpeRatio: session.sharpeRatio ?? 0,
        sortinoRatio: session.sortinoRatio ?? 0,
        calmarRatio: session.calmarRatio ?? 0,
        maxDrawdown: session.maxDrawdown ?? 0,
        totalPnL: session.totalPnL ?? 0,
        largestWin: session.largestWin ?? 0,
        largestLoss: session.largestLoss ?? 0,
        averageWin: session.averageWin ?? 0,
        averageLoss: session.averageLoss ?? 0,
      };
    } catch (error) {
      logger.error('Failed to get session metrics', { error: (error as Error).message });
      return this.getEmptyMetrics();
    }
  }

  /**
   * Obtém histórico de sessões
   */
  static async getSessionHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const sessions = await prisma.paperSession.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: limit,
      });

      return sessions;
    } catch (error) {
      logger.error('Failed to get session history', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Helpers
   */
  private static formatTrade(trade: any): TradeOutput {
    return {
      id: trade.id,
      ticker: trade.ticker,
      entryPrice: trade.entryPrice,
      entryTime: trade.entryTime,
      direction: trade.direction,
      shares: trade.shares,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      status: trade.status,
      profit: trade.profit,
      profitPct: trade.profitPct,
    };
  }

  private static getEmptyMetrics(): SessionMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      loosingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      totalPnL: 0,
      largestWin: 0,
      largestLoss: 0,
      averageWin: 0,
      averageLoss: 0,
    };
  }

  private static daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 1);
  }
}

export default PaperTradeService;
