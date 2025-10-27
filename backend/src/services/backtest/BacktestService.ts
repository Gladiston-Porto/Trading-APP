import { PrismaClient } from '@prisma/client';
import { RSI, MACD, BollingerBands, SMA } from 'technicalindicators';
import {
  BacktestConfig,
  SimulatedTrade,
  BacktestMetrics,
  PriceData,
} from './types/backtest.types';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * BacktestService
 * Simula trades históricos para validar estratégias
 */
class BacktestService {
  /**
   * Criar novo backtest
   */
  static async createBacktest(userId: string, config: Omit<BacktestConfig, 'userId'>) {
    try {
      logger.info(`[Backtest] Criando backtest para ${config.ticker}`, {
        userId,
        strategy: config.strategy,
        period: `${config.startDate.toISOString()} - ${config.endDate.toISOString()}`,
      });

      const backtest = await prisma.backtest.create({
        data: {
          userId,
          ticker: config.ticker,
          startDate: config.startDate,
          endDate: config.endDate,
          strategy: config.strategy,
          parameters: config.parameters,
          status: 'PENDING',
        },
      });

      return backtest;
    } catch (error) {
      logger.error('[Backtest] Erro ao criar backtest:', error);
      throw error;
    }
  }

  /**
   * Executar backtest
   */
  static async runBacktest(userId: string, backtestId: string) {
    const startTime = Date.now();

    try {
      // Buscar backtest
      const backtest = await prisma.backtest.findUnique({
        where: { id: backtestId },
      });

      if (!backtest) {
        throw new Error('Backtest não encontrado');
      }

      if (backtest.userId !== userId) {
        throw new Error('Acesso negado');
      }

      // Atualizar status
      await prisma.backtest.update({
        where: { id: backtestId },
        data: { status: 'RUNNING' },
      });

      logger.info(`[Backtest] Executando backtest ${backtestId}`, {
        ticker: backtest.ticker,
        strategy: backtest.strategy,
      });

      // Carregar dados históricos
      const priceData = await this.getPriceData(
        backtest.ticker,
        backtest.startDate,
        backtest.endDate
      );

      if (priceData.length < 20) {
        throw new Error('Dados históricos insuficientes para backtest');
      }

      // Executar simulação de trades
      const trades = await this.simulateTrades(
        priceData,
        backtest.strategy,
        backtest.parameters as Record<string, number>
      );

      // Calcular métricas
      const metrics = this.calculateMetrics(trades, priceData);

      // Salvar resultados
      const executionTime = Date.now() - startTime;

      const result = await prisma.backtest.update({
        where: { id: backtestId },
        data: {
          status: 'COMPLETED',
          totalTrades: trades.length,
          winningTrades: metrics.winningTrades,
          loosingTrades: metrics.losingTrades,
          winRate: metrics.winRate,
          profitFactor: metrics.profitFactor,
          sharpeRatio: metrics.sharpeRatio,
          sortinoRatio: metrics.sortinoRatio,
          calmarRatio: metrics.calmarRatio,
          maxDrawdown: metrics.maxDrawdown,
          totalReturn: metrics.totalReturn,
          cagr: metrics.cagr,
          trades: JSON.stringify(trades),
          executionTime,
        },
      });

      logger.info(`[Backtest] Backtest ${backtestId} concluído`, {
        trades: trades.length,
        winRate: `${(metrics.winRate * 100).toFixed(2)}%`,
        sharpeRatio: metrics.sharpeRatio.toFixed(2),
        executionTime: `${executionTime}ms`,
      });

      return result;
    } catch (error) {
      logger.error(`[Backtest] Erro ao executar backtest ${backtestId}:`, error);

      await prisma.backtest.update({
        where: { id: backtestId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        },
      });

      throw error;
    }
  }

  /**
   * Obter resultados do backtest
   */
  static async getBacktestResults(userId: string, backtestId: string) {
    try {
      const backtest = await prisma.backtest.findUnique({
        where: { id: backtestId },
      });

      if (!backtest) {
        throw new Error('Backtest não encontrado');
      }

      if (backtest.userId !== userId) {
        throw new Error('Acesso negado');
      }

      const trades = backtest.trades ? JSON.parse(backtest.trades as string) : [];

      return {
        id: backtest.id,
        ticker: backtest.ticker,
        strategy: backtest.strategy,
        status: backtest.status,
        period: {
          from: backtest.startDate,
          to: backtest.endDate,
        },
        metrics: {
          totalTrades: backtest.totalTrades,
          winningTrades: backtest.winningTrades,
          losingTrades: backtest.loosingTrades,
          winRate: backtest.winRate,
          profitFactor: backtest.profitFactor,
          sharpeRatio: backtest.sharpeRatio,
          sortinoRatio: backtest.sortinoRatio,
          calmarRatio: backtest.calmarRatio,
          maxDrawdown: backtest.maxDrawdown,
          totalReturn: backtest.totalReturn,
          cagr: backtest.cagr,
        },
        trades,
        executionTime: backtest.executionTime,
        error: backtest.error,
        createdAt: backtest.createdAt,
      };
    } catch (error) {
      logger.error('[Backtest] Erro ao obter resultados:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de backtests
   */
  static async getBacktestHistory(userId: string, limit: number = 10) {
    try {
      const backtests = await prisma.backtest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return backtests.map((b: any) => ({
        id: b.id,
        ticker: b.ticker,
        strategy: b.strategy,
        status: b.status,
        period: {
          from: b.startDate,
          to: b.endDate,
        },
        metrics: {
          winRate: b.winRate,
          sharpeRatio: b.sharpeRatio,
          totalReturn: b.totalReturn,
          totalTrades: b.totalTrades,
        },
        createdAt: b.createdAt,
      }));
    } catch (error) {
      logger.error('[Backtest] Erro ao obter histórico:', error);
      throw error;
    }
  }

  /**
   * Deletar backtest
   */
  static async deleteBacktest(userId: string, backtestId: string) {
    try {
      const backtest = await prisma.backtest.findUnique({
        where: { id: backtestId },
      });

      if (!backtest) {
        throw new Error('Backtest não encontrado');
      }

      if (backtest.userId !== userId) {
        throw new Error('Acesso negado');
      }

      await prisma.backtest.delete({
        where: { id: backtestId },
      });

      logger.info(`[Backtest] Backtest ${backtestId} deletado`);

      return { success: true };
    } catch (error) {
      logger.error('[Backtest] Erro ao deletar backtest:', error);
      throw error;
    }
  }

  /**
   * PRIVATE: Carregar dados históricos de preços
   */
  private static async getPriceData(
    _ticker: string,
    startDate: Date,
    endDate: Date
  ): Promise<PriceData[]> {
    // TODO: Implementar carregamento real de dados
    // Por enquanto, gerar dados mock para testes
    return this.generateMockPriceData(startDate, endDate);
  }

  /**
   * PRIVATE: Gerar dados mock para testes
   */
  private static generateMockPriceData(startDate: Date, endDate: Date): PriceData[] {
    const data: PriceData[] = [];
    let currentDate = new Date(startDate);
    let price = 100;

    while (currentDate <= endDate) {
      // Pular fins de semana
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Variação aleatória
        const change = (Math.random() - 0.5) * 2;
        price = price * (1 + change / 100);

        data.push({
          date: new Date(currentDate),
          open: price * 0.99,
          high: price * 1.02,
          low: price * 0.98,
          close: price,
          volume: Math.floor(Math.random() * 1000000) + 100000,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * PRIVATE: Simular trades baseado em estratégia
   */
  private static async simulateTrades(
    priceData: PriceData[],
    strategy: string,
    parameters: Record<string, number>
  ): Promise<SimulatedTrade[]> {
    if (strategy === 'RSI_CROSSOVER') {
      return this.strategyRSICrossover(priceData, parameters);
    } else if (strategy === 'MACD') {
      return this.strategyMACD(priceData, parameters);
    } else if (strategy === 'BOLLINGER') {
      return this.strategyBollinger(priceData, parameters);
    } else if (strategy === 'SMA_CROSSOVER') {
      return this.strategySMACrossover(priceData, parameters);
    }

    return [];
  }

  /**
   * Estratégia: RSI Crossover
   */
  private static strategyRSICrossover(
    priceData: PriceData[],
    params: Record<string, number>
  ): SimulatedTrade[] {
    const trades: SimulatedTrade[] = [];
    const rsiPeriod = params.rsi_period || 14;
    const overbought = params.overbought || 70;
    const oversold = params.oversold || 30;

    const closes = priceData.map((p) => p.close);
    const rsiValues = RSI.calculate({ values: closes, period: rsiPeriod });

    let inPosition = false;
    let entryPrice = 0;
    let entryDate: Date = new Date();

    for (let i = rsiPeriod; i < priceData.length; i++) {
      const rsi = rsiValues[i - rsiPeriod];
      const price = priceData[i].close;
      const date = priceData[i].date;

      if (!inPosition && rsi < oversold) {
        // Entrada: BUY
        entryPrice = price;
        entryDate = date;
        inPosition = true;
      } else if (inPosition && rsi > overbought) {
        // Saída: vender
        const pnl = price - entryPrice;
        const pnlPercent = (pnl / entryPrice) * 100;

        trades.push({
          entryDate,
          entryPrice,
          exitDate: date,
          exitPrice: price,
          quantity: 100,
          direction: 'BUY',
          pnl: pnl * 100, // 100 ações
          pnlPercent,
          exitType: pnl > 0 ? 'TP' : 'SL',
          reason: `RSI ${rsi.toFixed(2)}`,
        });

        inPosition = false;
      }
    }

    return trades;
  }

  /**
   * Estratégia: MACD
   */
  private static strategyMACD(
    priceData: PriceData[],
    params: Record<string, number>
  ): SimulatedTrade[] {
    const trades: SimulatedTrade[] = [];

    const closes = priceData.map((p) => p.close);
    const macdResult = MACD.calculate({
      values: closes,
      fastPeriod: Math.floor(params.fast_period || 12),
      slowPeriod: Math.floor(params.slow_period || 26),
      signalPeriod: Math.floor(params.signal_period || 9),
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    } as any);

    let inPosition = false;
    let entryPrice = 0;
    let entryDate: Date = new Date();

    for (let i = 0; i < macdResult.length; i++) {
      const macd = macdResult[i] as any;
      if (!macd || macd.MACD === undefined || macd.signal === undefined) continue;

      const price = priceData[i + 30]?.close || 0;
      const date = priceData[i + 30]?.date || new Date();

      if (!inPosition && macd.MACD > macd.signal) {
        // Entrada: BUY
        entryPrice = price;
        entryDate = date;
        inPosition = true;
      } else if (inPosition && macd.MACD < macd.signal) {
        // Saída
        const pnl = price - entryPrice;
        const pnlPercent = (pnl / entryPrice) * 100;

        trades.push({
          entryDate,
          entryPrice,
          exitDate: date,
          exitPrice: price,
          quantity: 100,
          direction: 'BUY',
          pnl: pnl * 100,
          pnlPercent,
          exitType: pnl > 0 ? 'TP' : 'SL',
          reason: `MACD crossover`,
        });

        inPosition = false;
      }
    }

    return trades;
  }

  /**
   * Estratégia: Bollinger Bands
   */
  private static strategyBollinger(
    priceData: PriceData[],
    params: Record<string, number>
  ): SimulatedTrade[] {
    const trades: SimulatedTrade[] = [];

    const closes = priceData.map((p) => p.close);
    const bbResult = BollingerBands.calculate({
      values: closes,
      period: params.period || 20,
      stdDev: params.stddev || 2,
    });

    let inPosition = false;
    let entryPrice = 0;
    let entryDate: Date = new Date();

    for (let i = 0; i < bbResult.length; i++) {
      const bb = bbResult[i];
      const price = priceData[i + 19].close;
      const date = priceData[i + 19].date;

      if (!inPosition && price < bb.lower) {
        // Entrada: BUY (toque na banda inferior)
        entryPrice = price;
        entryDate = date;
        inPosition = true;
      } else if (inPosition && price > bb.middle) {
        // Saída: vender ao atingir a média
        const pnl = price - entryPrice;
        const pnlPercent = (pnl / entryPrice) * 100;

        trades.push({
          entryDate,
          entryPrice,
          exitDate: date,
          exitPrice: price,
          quantity: 100,
          direction: 'BUY',
          pnl: pnl * 100,
          pnlPercent,
          exitType: pnl > 0 ? 'TP' : 'SL',
          reason: `Bollinger Bands`,
        });

        inPosition = false;
      }
    }

    return trades;
  }

  /**
   * Estratégia: SMA Crossover
   */
  private static strategySMACrossover(
    priceData: PriceData[],
    params: Record<string, number>
  ): SimulatedTrade[] {
    const trades: SimulatedTrade[] = [];

    const closes = priceData.map((p) => p.close);
    const sma10 = SMA.calculate({ values: closes, period: params.fast_sma || 10 });
    const sma20 = SMA.calculate({ values: closes, period: params.slow_sma || 20 });

    let inPosition = false;
    let entryPrice = 0;
    let entryDate: Date = new Date();

    for (let i = 1; i < Math.min(sma10.length, sma20.length); i++) {
      const fast = sma10[sma10.length - Math.min(sma10.length, sma20.length) + i];
      const slow = sma20[sma20.length - Math.min(sma10.length, sma20.length) + i];
      const price = priceData[priceData.length - (Math.min(sma10.length, sma20.length) - i)].close;
      const date = priceData[priceData.length - (Math.min(sma10.length, sma20.length) - i)].date;

      if (!inPosition && fast > slow) {
        // Entrada: BUY (SMA rápida acima da lenta)
        entryPrice = price;
        entryDate = date;
        inPosition = true;
      } else if (inPosition && fast < slow) {
        // Saída
        const pnl = price - entryPrice;
        const pnlPercent = (pnl / entryPrice) * 100;

        trades.push({
          entryDate,
          entryPrice,
          exitDate: date,
          exitPrice: price,
          quantity: 100,
          direction: 'BUY',
          pnl: pnl * 100,
          pnlPercent,
          exitType: pnl > 0 ? 'TP' : 'SL',
          reason: `SMA Crossover`,
        });

        inPosition = false;
      }
    }

    return trades;
  }

  /**
   * PRIVATE: Calcular métricas de performance
   */
  private static calculateMetrics(trades: SimulatedTrade[], priceData: PriceData[]): BacktestMetrics {
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.pnl > 0).length;
    const losingTrades = trades.filter((t) => t.pnl < 0).length;

    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    const wins = trades.filter((t) => t.pnl > 0).map((t) => t.pnl);
    const losses = trades.filter((t) => t.pnl < 0).map((t) => Math.abs(t.pnl));

    const sumWins = wins.reduce((a, b) => a + b, 0);
    const sumLosses = losses.reduce((a, b) => a + b, 0);

    const profitFactor = sumLosses > 0 ? sumWins / sumLosses : sumWins > 0 ? Infinity : 0;

    const avgWin = wins.length > 0 ? sumWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? sumLosses / losses.length : 0;

    const expectancy = avgWin * winRate - avgLoss * (1 - winRate);

    // Sharpe Ratio
    const returns = trades.map((t) => t.pnlPercent / 100);
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

    // Sortino Ratio
    const downSideReturns = returns.filter((r) => r < 0);
    const downSideVariance =
      downSideReturns.length > 0
        ? downSideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / downSideReturns.length
        : 0;
    const downSideStdDev = Math.sqrt(downSideVariance);
    const sortinoRatio = downSideStdDev > 0 ? (meanReturn / downSideStdDev) * Math.sqrt(252) : 0;

    // Max Drawdown
    let peak = priceData[0].close;
    let maxDrawdown = 0;
    let equity = 100000; // Capital inicial hipotético

    for (const trade of trades) {
      equity += trade.pnl;
      if (equity > peak) {
        peak = equity;
      }
      const drawdown = (peak - equity) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // CAGR
    const startEquity = 100000;
    const endEquity = startEquity + trades.reduce((a, b) => a + b.pnl, 0);
    const daysInPeriod = this.daysBetween(priceData[0].date, priceData[priceData.length - 1].date);
    const yearsInPeriod = daysInPeriod / 365.25;
    const cagr = yearsInPeriod > 0 ? Math.pow(endEquity / startEquity, 1 / yearsInPeriod) - 1 : 0;

    // Calmar Ratio
    const calmarRatio = maxDrawdown > 0 ? cagr / maxDrawdown : 0;

    const totalReturn = endEquity - startEquity;
    const totalReturnPercent = (totalReturn / startEquity) * 100;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      expectancy,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      maxDrawdownPercent: maxDrawdown * 100,
      totalReturn,
      totalReturnPercent,
      cagr: cagr * 100,
      startEquity,
      endEquity,
      startDate: priceData[0].date,
      endDate: priceData[priceData.length - 1].date,
    };
  }

  /**
   * HELPER: Calcular dias entre datas
   */
  private static daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  }
}

export default BacktestService;
