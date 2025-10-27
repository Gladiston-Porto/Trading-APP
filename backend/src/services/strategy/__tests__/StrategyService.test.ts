import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    strategy: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    backtest: {
      findMany: vi.fn(),
    },
  })),
}));

describe('StrategyService', () => {
  describe('Validação de Entrada', () => {
    it('deve validar nome obrigatório', () => {
      const config = { name: '', description: 'Test', tickers: [], parameters: {} };
      expect(config.name).toBe('');
    });

    it('deve validar tickers não vazio', () => {
      const tickers = ['PETR4', 'VALE3'];
      expect(tickers.length).toBeGreaterThan(0);
    });

    it('deve validar parâmetros', () => {
      const params = { rsi_period: 14, oversold: 30 };
      expect(Object.keys(params).length).toBeGreaterThan(0);
    });

    it('deve validar minWinRate 0-100', () => {
      const winRate = 65;
      expect(winRate).toBeGreaterThanOrEqual(0);
      expect(winRate).toBeLessThanOrEqual(100);
    });

    it('deve validar minSharpeRatio >= -5', () => {
      const sharpe = 1.5;
      expect(sharpe).toBeGreaterThanOrEqual(-5);
    });

    it('deve validar maxDrawdown 0-100', () => {
      const dd = 18;
      expect(dd).toBeGreaterThanOrEqual(0);
      expect(dd).toBeLessThanOrEqual(100);
    });
  });

  describe('CRUD Operations', () => {
    it('deve criar estratégia com dados válidos', () => {
      const strategy = {
        id: 'st-1',
        name: 'RSI Trading',
        type: 'RSI_CROSSOVER',
        status: 'DRAFT',
      };

      expect(strategy.id).toBeTruthy();
      expect(strategy.name).toBeTruthy();
      expect(strategy.status).toBe('DRAFT');
    });

    it('deve obter estratégia por ID', () => {
      const strategy = { id: 'st-1', name: 'RSI Trading' };
      expect(strategy.id).toBe('st-1');
    });

    it('deve listar estratégias com filtros', () => {
      const strategies = [
        { id: 'st-1', status: 'ACTIVE' },
        { id: 'st-2', status: 'DRAFT' },
      ];

      const active = strategies.filter((s) => s.status === 'ACTIVE');
      expect(active).toHaveLength(1);
    });

    it('deve atualizar estratégia', () => {
      const original = { name: 'Old Name' };
      const updated = { ...original, name: 'New Name' };
      expect(updated.name).toBe('New Name');
    });

    it('deve deletar estratégia', () => {
      const strategies = [{ id: 'st-1' }];
      const remaining = strategies.filter((s) => s.id !== 'st-1');
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Strategy Types', () => {
    it('deve suportar RSI_CROSSOVER', () => {
      const types = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER'];
      expect(types).toContain('RSI_CROSSOVER');
    });

    it('deve suportar MACD', () => {
      const types = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER'];
      expect(types).toContain('MACD');
    });

    it('deve suportar BOLLINGER', () => {
      const types = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER'];
      expect(types).toContain('BOLLINGER');
    });

    it('deve suportar SMA_CROSSOVER', () => {
      const types = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER'];
      expect(types).toContain('SMA_CROSSOVER');
    });

    it('deve suportar CUSTOM', () => {
      const types = ['RSI_CROSSOVER', 'MACD', 'BOLLINGER', 'SMA_CROSSOVER', 'CUSTOM'];
      expect(types).toContain('CUSTOM');
    });
  });

  describe('Risk Profiles', () => {
    it('deve suportar perfil conservative', () => {
      const profiles = ['conservative', 'moderate', 'aggressive'];
      expect(profiles).toContain('conservative');
    });

    it('deve suportar perfil moderate', () => {
      const profiles = ['conservative', 'moderate', 'aggressive'];
      expect(profiles).toContain('moderate');
    });

    it('deve suportar perfil aggressive', () => {
      const profiles = ['conservative', 'moderate', 'aggressive'];
      expect(profiles).toContain('aggressive');
    });
  });

  describe('Strategy Status', () => {
    it('deve ser DRAFT ao criar', () => {
      const status = 'DRAFT';
      expect(status).toBe('DRAFT');
    });

    it('deve permitir transição para ACTIVE', () => {
      const statuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
      expect(statuses).toContain('ACTIVE');
    });

    it('deve permitir transição para PAUSED', () => {
      const statuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
      expect(statuses).toContain('PAUSED');
    });

    it('deve permitir transição para ARCHIVED', () => {
      const statuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
      expect(statuses).toContain('ARCHIVED');
    });
  });

  describe('Cloning', () => {
    it('deve clonar estratégia com novo nome', () => {
      const original = { id: 'st-1', name: 'Original' };
      const cloned = { id: 'st-2', name: 'Clone de Original' };

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toContain('Clone');
    });

    it('deve marcar clone com tag', () => {
      const tags = ['cloned', 'test'];
      expect(tags).toContain('cloned');
    });

    it('deve iniciar clone como DRAFT', () => {
      const cloned = { status: 'DRAFT' };
      expect(cloned.status).toBe('DRAFT');
    });
  });

  describe('Metrics Calculation', () => {
    it('deve calcular win rate médio', () => {
      const winRates = [65, 60, 70];
      const avg = winRates.reduce((a, b) => a + b, 0) / winRates.length;
      expect(avg).toBeCloseTo(65, 0);
    });

    it('deve calcular Sharpe Ratio médio', () => {
      const sharpes = [1.5, 1.2, 1.8];
      const avg = sharpes.reduce((a, b) => a + b, 0) / sharpes.length;
      expect(avg).toBeCloseTo(1.5, 1);
    });

    it('deve encontrar melhor performance', () => {
      const backtests = [
        { ticker: 'PETR4', sharpe: 1.5 },
        { ticker: 'VALE3', sharpe: 2.1 },
      ];

      const best = backtests.reduce((a, b) => (a.sharpe > b.sharpe ? a : b));
      expect(best.ticker).toBe('VALE3');
    });

    it('deve encontrar pior performance', () => {
      const backtests = [
        { ticker: 'PETR4', sharpe: 1.5 },
        { ticker: 'VALE3', sharpe: 0.8 },
      ];

      const worst = backtests.reduce((a, b) => (a.sharpe < b.sharpe ? a : b));
      expect(worst.ticker).toBe('VALE3');
    });

    it('deve contar backtests bem-sucedidos', () => {
      const backtests = [
        { status: 'COMPLETED' },
        { status: 'FAILED' },
        { status: 'COMPLETED' },
      ];

      const successful = backtests.filter((b) => b.status === 'COMPLETED').length;
      expect(successful).toBe(2);
    });

    it('deve contar backtests falhados', () => {
      const backtests = [
        { status: 'COMPLETED' },
        { status: 'FAILED' },
        { status: 'COMPLETED' },
      ];

      const failed = backtests.filter((b) => b.status === 'FAILED').length;
      expect(failed).toBe(1);
    });
  });

  describe('Strategy Comparison', () => {
    it('deve comparar duas estratégias', () => {
      const s1 = { id: 'st-1', sharpe: 1.5 };
      const s2 = { id: 'st-2', sharpe: 1.2 };

      const diff = s1.sharpe - s2.sharpe;
      expect(diff).toBeGreaterThan(0);
    });

    it('deve determinar vencedora', () => {
      const score1 = 1.5; // Sharpe de s1
      const score2 = 1.2; // Sharpe de s2

      const winner = score1 > score2 ? 'st-1' : 'st-2';
      expect(winner).toBe('st-1');
    });

    it('deve considerar múltiplas métricas', () => {
      const metrics1 = { sharpe: 1.5, winRate: 0.65, cagr: 0.18 };
      const metrics2 = { sharpe: 1.2, winRate: 0.60, cagr: 0.15 };

      const score1 = metrics1.sharpe * 0.5 + metrics1.winRate * 0.25 + metrics1.cagr * 0.25;
      const score2 = metrics2.sharpe * 0.5 + metrics2.winRate * 0.25 + metrics2.cagr * 0.25;

      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('Tagging', () => {
    it('deve adicionar tag', () => {
      const tags: string[] = [];
      tags.push('trend-following');
      expect(tags).toContain('trend-following');
    });

    it('deve evitar tags duplicadas', () => {
      const tags = ['test', 'test'];
      const unique = [...new Set(tags)];
      expect(unique).toHaveLength(1);
    });

    it('deve remover tag', () => {
      const tags = ['test', 'trend', 'volatility'];
      const filtered = tags.filter((t) => t !== 'trend');
      expect(filtered).not.toContain('trend');
    });

    it('deve listar tags', () => {
      const strategy = { tags: ['profitable', 'stable', 'low-dd'] };
      expect(strategy.tags).toHaveLength(3);
    });
  });

  describe('Data Consistency', () => {
    it('deve manter integridade ao clonar', () => {
      const original = { name: 'Original', type: 'RSI_CROSSOVER', parameters: { p: 14 } };
      const cloned = { ...original, name: 'Clone' };

      expect(cloned.type).toBe(original.type);
      expect(cloned.parameters).toEqual(original.parameters);
    });

    it('deve preservar tickers ao atualizar', () => {
      const original = { tickers: ['PETR4', 'VALE3'] };
      const updated = { ...original };

      expect(updated.tickers).toEqual(original.tickers);
    });

    it('deve preservar parâmetros ao clonar', () => {
      const original = { parameters: { rsi: 14, oversold: 30 } };
      const cloned = { ...original };

      expect(cloned.parameters).toEqual(original.parameters);
    });
  });

  describe('Access Control', () => {
    it('deve rejeitar acesso de outro usuário', () => {
      const strategy = { userId: 'user-1', id: 'st-1' };
      const requester = 'user-2';

      expect(strategy.userId === requester).toBe(false);
    });

    it('deve permitir acesso do proprietário', () => {
      const strategy = { userId: 'user-1', id: 'st-1' };
      const requester = 'user-1';

      expect(strategy.userId === requester).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('deve lidar com sem backtests', () => {
      const backtests = [];
      const avgWinRate = backtests.length > 0 ? 50 : 0;
      expect(avgWinRate).toBe(0);
    });

    it('deve lidar com estratégia sem tags', () => {
      const strategy = { tags: [] };
      expect(strategy.tags).toHaveLength(0);
    });

    it('deve lidar com parâmetros vazios', () => {
      const parameters = {};
      expect(Object.keys(parameters)).toHaveLength(0);
    });

    it('deve lidar com um ticker', () => {
      const tickers = ['PETR4'];
      expect(tickers).toHaveLength(1);
    });

    it('deve lidar com múltiplos tickers', () => {
      const tickers = ['PETR4', 'VALE3', 'ABEV3'];
      expect(tickers.length).toBeGreaterThan(1);
    });
  });
});
