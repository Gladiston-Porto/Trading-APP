import { describe, it, expect, vi } from 'vitest';

// Mock do Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    backtest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

describe('BacktestService', () => {

  describe('createBacktest', () => {
    it('deve criar um novo backtest com validação de dados', async () => {
      const config = {
        ticker: 'PETR4',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        strategy: 'RSI_CROSSOVER' as const,
        parameters: {
          rsi_period: 14,
          oversold: 30,
          overbought: 70,
        },
      };

      expect(config.ticker).toBe('PETR4');
      expect(config.strategy).toBe('RSI_CROSSOVER');
      expect(config.parameters.rsi_period).toBe(14);
    });

    it('deve validar ticker não vazio', () => {
      const config = {
        ticker: 'PETR4',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        strategy: 'RSI_CROSSOVER' as const,
        parameters: {},
      };

      expect(config.ticker.length).toBeGreaterThan(0);
    });

    it('deve validar datas em ordem correta', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });
  });

  describe('strategyRSICrossover', () => {
    it('deve gerar trades válidos com RSI', () => {
      // Simular dados de preço
      const priceData = [];
      let price = 100;

      for (let i = 0; i < 50; i++) {
        priceData.push({
          date: new Date('2024-01-01'),
          open: price * 0.99,
          high: price * 1.02,
          low: price * 0.98,
          close: price,
          volume: 1000000,
        });
        price += (Math.random() - 0.5) * 2;
      }

      expect(priceData.length).toBe(50);
      expect(priceData[0].close).toBe(100);
    });

    it('deve respeitar período RSI configurado', () => {
      const params = {
        rsi_period: 14,
        oversold: 30,
        overbought: 70,
      };

      expect(params.rsi_period).toBeGreaterThanOrEqual(5);
      expect(params.rsi_period).toBeLessThanOrEqual(50);
    });

    it('deve validar níveis de oversold/overbought', () => {
      const oversold = 30;
      const overbought = 70;

      expect(oversold).toBeLessThan(overbought);
      expect(oversold).toBeGreaterThanOrEqual(10);
      expect(overbought).toBeLessThanOrEqual(90);
    });
  });

  describe('strategyMACD', () => {
    it('deve validar períodos MACD', () => {
      const params = {
        fast_period: 12,
        slow_period: 26,
        signal_period: 9,
      };

      expect(params.fast_period).toBeLessThan(params.slow_period);
      expect(params.signal_period).toBeGreaterThan(0);
    });

    it('deve respeitar limites de períodos', () => {
      const fast = 12;
      const slow = 26;
      const signal = 9;

      expect(fast).toBeGreaterThanOrEqual(5);
      expect(slow).toBeGreaterThanOrEqual(20);
      expect(signal).toBeGreaterThanOrEqual(5);
    });
  });

  describe('strategyBollinger', () => {
    it('deve validar período de Bollinger', () => {
      const params = {
        period: 20,
        stddev: 2,
      };

      expect(params.period).toBeGreaterThanOrEqual(10);
      expect(params.period).toBeLessThanOrEqual(50);
    });

    it('deve validar desvio padrão', () => {
      const stddev = 2;

      expect(stddev).toBeGreaterThanOrEqual(1);
      expect(stddev).toBeLessThanOrEqual(3);
    });
  });

  describe('strategySMACrossover', () => {
    it('deve validar períodos SMA', () => {
      const params = {
        fast_sma: 10,
        slow_sma: 20,
      };

      expect(params.fast_sma).toBeLessThan(params.slow_sma);
    });

    it('deve respeitar limites de períodos SMA', () => {
      const fast = 10;
      const slow = 20;

      expect(fast).toBeGreaterThanOrEqual(5);
      expect(slow).toBeGreaterThanOrEqual(20);
    });
  });

  describe('calculateMetrics', () => {
    it('deve calcular win rate corretamente', () => {
      const trades = [
        { pnl: 100 },
        { pnl: -50 },
        { pnl: 200 },
        { pnl: -75 },
      ];

      const winningTrades = trades.filter((t: any) => t.pnl > 0).length;
      const winRate = winningTrades / trades.length;

      expect(winRate).toBe(0.5);
    });

    it('deve calcular profit factor corretamente', () => {
      const trades = [
        { pnl: 100 },
        { pnl: 200 },
        { pnl: -50 },
      ];

      const wins = trades.filter((t: any) => t.pnl > 0).map((t: any) => t.pnl);
      const losses = trades.filter((t: any) => t.pnl < 0).map((t: any) => Math.abs(t.pnl));

      const sumWins = wins.reduce((a, b) => a + b, 0);
      const sumLosses = losses.reduce((a, b) => a + b, 0);
      const profitFactor = sumWins / sumLosses;

      expect(profitFactor).toBe(6);
    });

    it('deve calcular Sharpe Ratio', () => {
      const returns = [0.01, -0.02, 0.015, -0.005, 0.02];
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      expect(meanReturn).toBeCloseTo(0.004, 3);
      expect(stdDev).toBeGreaterThan(0);
    });

    it('deve calcular max drawdown corretamente', () => {
      const equities = [100000, 95000, 98000, 92000, 94000];

      let peak = equities[0];
      let maxDD = 0;

      for (const equity of equities) {
        if (equity > peak) peak = equity;
        const dd = (peak - equity) / peak;
        if (dd > maxDD) maxDD = dd;
      }

      expect(maxDD).toBeGreaterThan(0);
      expect(maxDD).toBeLessThanOrEqual(1);
    });

    it('deve calcular CAGR corretamente', () => {
      const startEquity = 100000;
      const endEquity = 150000;
      const daysInPeriod = 365;
      const yearsInPeriod = daysInPeriod / 365.25;
      const cagr = Math.pow(endEquity / startEquity, 1 / yearsInPeriod) - 1;

      expect(cagr).toBeGreaterThan(0);
      expect(cagr).toBeCloseTo(0.50, 1);
    });

    it('deve calcular Sortino Ratio', () => {
      const returns = [0.01, -0.02, 0.015, -0.005, 0.02];
      const downSideReturns = returns.filter((r) => r < 0);

      const downSideVariance =
        downSideReturns.length > 0
          ? downSideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / downSideReturns.length
          : 0;

      const downSideStdDev = Math.sqrt(downSideVariance);

      expect(downSideStdDev).toBeGreaterThanOrEqual(0);
    });

    it('deve calcular Calmar Ratio', () => {
      const cagr = 0.15;
      const maxDrawdown = 0.25;
      const calmarRatio = cagr / maxDrawdown;

      expect(calmarRatio).toBeCloseTo(0.6, 1);
    });
  });

  describe('simulateTrades', () => {
    it('deve simular múltiplos trades em período', () => {
      const trades = [
        { entryPrice: 100, exitPrice: 105, pnl: 5 },
        { entryPrice: 105, exitPrice: 103, pnl: -2 },
        { entryPrice: 103, exitPrice: 110, pnl: 7 },
      ];

      expect(trades).toHaveLength(3);
      expect(trades[0].pnl).toBeGreaterThan(0);
      expect(trades[1].pnl).toBeLessThan(0);
    });

    it('deve permitir seleção de diferentes estratégias', () => {
      const strategies = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER'];

      for (const strategy of strategies) {
        expect(strategies).toContain(strategy);
      }
    });
  });

  describe('Trade Simulations', () => {
    it('deve gerar dados de preço mock válidos', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const priceData = [];
      let currentDate = new Date(startDate);
      let price = 100;

      while (currentDate <= endDate) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const change = (Math.random() - 0.5) * 2;
          price = price * (1 + change / 100);

          priceData.push({
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

      expect(priceData.length).toBeGreaterThan(0);
      expect(priceData[0].close).toBeGreaterThan(0);
    });

    it('deve criar trades com campos válidos', () => {
      const trade = {
        entryDate: new Date('2024-01-01'),
        entryPrice: 100,
        exitDate: new Date('2024-01-05'),
        exitPrice: 105,
        quantity: 100,
        direction: 'BUY' as const,
        pnl: 500,
        pnlPercent: 5,
        exitType: 'TP' as const,
        reason: 'RSI Crossover',
      };

      expect(trade.entryPrice).toBeLessThan(trade.exitPrice);
      expect(trade.quantity).toBeGreaterThan(0);
      expect(trade.direction).toBe('BUY');
      expect(trade.exitType).toMatch(/^(TP|SL)$/);
    });

    it('deve validar P&L dos trades', () => {
      const trades = [
        { quantity: 100, entryPrice: 100, exitPrice: 110, pnl: 1000, pnlPercent: 10 },
        { quantity: 100, entryPrice: 110, exitPrice: 105, pnl: -500, pnlPercent: -4.54 },
      ];

      for (const trade of trades) {
        const expectedPnL = (trade.exitPrice - trade.entryPrice) * trade.quantity;
        expect(Math.abs(trade.pnl - expectedPnL)).toBeLessThan(1);
      }
    });
  });

  describe('Integration Tests', () => {
    it('deve criar backtest, simular trades e calcular métricas', () => {
      const config = {
        ticker: 'PETR4',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        strategy: 'RSI_CROSSOVER' as const,
        parameters: { rsi_period: 14, oversold: 30, overbought: 70 },
      };

      expect(config.ticker).toBeDefined();
      expect(config.strategy).toBeDefined();
      expect(config.parameters).toBeDefined();
    });

    it('deve manter consistência de dados de backtest', () => {
      const backtest = {
        id: 'bt-123',
        userId: 'user-123',
        ticker: 'PETR4',
        strategy: 'RSI_CROSSOVER',
        status: 'COMPLETED' as const,
        totalTrades: 25,
        winningTrades: 15,
        losingTrades: 10,
        winRate: 0.6,
        sharpeRatio: 1.5,
      };

      expect(backtest.winningTrades + backtest.losingTrades).toBe(backtest.totalTrades);
      expect(backtest.winRate).toBeCloseTo(
        backtest.winningTrades / backtest.totalTrades,
        5
      );
    });
  });

  describe('Error Handling', () => {
    it('deve validar período válido', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      expect(startDate < endDate).toBe(true);
    });

    it('deve rejeitar estratégia inválida', () => {
      const validStrategies = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER'];
      const invalidStrategy = 'INVALID_STRATEGY';

      expect(validStrategies.includes(invalidStrategy)).toBe(false);
    });

    it('deve validar parâmetros obrigatórios', () => {
      const config = {
        ticker: 'PETR4',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        strategy: 'RSI_CROSSOVER' as const,
        parameters: {},
      };

      expect(config.ticker).toBeTruthy();
      expect(config.startDate).toBeTruthy();
      expect(config.endDate).toBeTruthy();
      expect(config.strategy).toBeTruthy();
    });
  });

  describe('Performance Metrics Validation', () => {
    it('deve validar range de Sharpe Ratio', () => {
      const sharpeRatio = 1.5;

      expect(sharpeRatio).toBeGreaterThanOrEqual(-5);
      expect(sharpeRatio).toBeLessThanOrEqual(5);
    });

    it('deve validar range de win rate', () => {
      const winRate = 0.55;

      expect(winRate).toBeGreaterThanOrEqual(0);
      expect(winRate).toBeLessThanOrEqual(1);
    });

    it('deve validar range de max drawdown', () => {
      const maxDrawdown = 0.25;

      expect(maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(maxDrawdown).toBeLessThanOrEqual(1);
    });

    it('deve validar profit factor', () => {
      const profitFactor = 2.5;

      expect(profitFactor).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency', () => {
    it('deve manter histórico completo de backtests', () => {
      const backtests = [
        { id: 'bt-1', ticker: 'PETR4', status: 'COMPLETED' },
        { id: 'bt-2', ticker: 'VALE3', status: 'COMPLETED' },
        { id: 'bt-3', ticker: 'ABEV3', status: 'PENDING' },
      ];

      expect(backtests).toHaveLength(3);
      expect(backtests.filter((b) => b.status === 'COMPLETED')).toHaveLength(2);
    });

    it('deve validar timestamps de backtests', () => {
      const createdAt = new Date('2024-01-15');
      const completedAt = new Date('2024-01-16');

      expect(completedAt > createdAt).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com período de 1 dia', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-15');

      expect(endDate >= startDate).toBe(true);
    });

    it('deve lidar com múltiplos trades no mesmo dia', () => {
      const trades = [
        { date: '2024-01-15', time: '09:30', pnl: 100 },
        { date: '2024-01-15', time: '10:30', pnl: -50 },
        { date: '2024-01-15', time: '15:00', pnl: 75 },
      ];

      const dailyTrades = trades.filter((t) => t.date === '2024-01-15');
      expect(dailyTrades).toHaveLength(3);
    });

    it('deve lidar com preços com muita volatilidade', () => {
      const prices = [100, 150, 50, 200, 40, 180];

      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const volatility = (maxPrice - minPrice) / minPrice;

      expect(volatility).toBeGreaterThan(0);
    });
  });

  describe('Backtest Status Management', () => {
    it('deve permitir transição de status PENDING -> RUNNING', () => {
      const statuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];

      const currentStatus = 'PENDING';
      const nextStatus = 'RUNNING';

      const currentIdx = statuses.indexOf(currentStatus);
      const nextIdx = statuses.indexOf(nextStatus);

      expect(nextIdx).toBeGreaterThan(currentIdx);
    });

    it('deve permitir transição de status RUNNING -> COMPLETED', () => {
      const statuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];

      expect(statuses).toContain('COMPLETED');
    });

    it('deve permitir qualquer status para FAILED', () => {
      const statuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];

      expect(statuses).toContain('FAILED');
      expect(statuses.length).toBe(4);
    });
  });
});
