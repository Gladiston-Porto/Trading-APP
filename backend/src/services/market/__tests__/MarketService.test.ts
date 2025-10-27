import MarketService from '../../../services/market/MarketService';
import BrapiAdapter from '../../../services/market/adapters/BrapiAdapter';
import YahooAdapter from '../../../services/market/adapters/YahooAdapter';

/**
 * Testes Unitários - MarketService
 * Testar: getQuote, getQuotes, getHistoricalDaily, health, cache
 */

jest.mock('../../../services/market/adapters/BrapiAdapter');
jest.mock('../../../services/market/adapters/YahooAdapter');
jest.mock('../../../config/prisma', () => ({
  ticker: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  candle: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

describe('MarketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuote()', () => {
    it('deve obter quote B3 via Brapi', async () => {
      const mockQuote = {
        symbol: 'PETR4',
        name: 'Petrobras',
        lastPrice: 28.5,
        change: 0.5,
        changePercent: 1.78,
        volume: 1000000,
        currency: 'BRL',
        timestamp: Date.now(),
      };

      (BrapiAdapter.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      const result = await MarketService.getQuote('PETR4');

      expect(result.symbol).toBe('PETR4');
      expect(result.lastPrice).toBe(28.5);
      expect(result.source).toBe('BRAPI');
      expect(result.currency).toBe('BRL');
    });

    it('deve obter quote EUA via Yahoo', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        name: 'Apple Inc',
        lastPrice: 150.25,
        change: 2.5,
        changePercent: 1.68,
        volume: 50000000,
        currency: 'USD',
        timestamp: Date.now(),
        exchange: 'NASDAQ',
      };

      (YahooAdapter.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      const result = await MarketService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.lastPrice).toBe(150.25);
      expect(result.source).toBe('YAHOO');
      expect(result.currency).toBe('USD');
    });

    it('deve fazer fallback Yahoo quando Brapi falha (B3)', async () => {
      const brapiError = new Error('Brapi API error');
      const yahooQuote = {
        symbol: 'PETR4.SA',
        name: 'Petrobras',
        lastPrice: 28.5,
        change: 0.5,
        changePercent: 1.78,
        volume: 1000000,
        currency: 'BRL',
        timestamp: Date.now(),
        exchange: 'B3',
      };

      (BrapiAdapter.getQuote as jest.Mock).mockRejectedValueOnce(brapiError);
      (YahooAdapter.getQuote as jest.Mock).mockResolvedValueOnce(yahooQuote);

      const result = await MarketService.getQuote('PETR4');

      expect(result.symbol).toBe('PETR4.SA');
      expect(result.source).toBe('YAHOO');
      expect(YahooAdapter.getQuote).toHaveBeenCalledWith('PETR4.SA');
    });
  });

  describe('getQuotes()', () => {
    it('deve obter múltiplas quotes separando B3 e EUA', async () => {
      const mockBrapiQuotes = new Map([
        [
          'PETR4',
          {
            symbol: 'PETR4',
            name: 'Petrobras',
            lastPrice: 28.5,
            change: 0.5,
            changePercent: 1.78,
            volume: 1000000,
            currency: 'BRL',
            timestamp: Date.now(),
          },
        ],
      ]);

      const mockYahooQuotes = new Map([
        [
          'AAPL',
          {
            symbol: 'AAPL',
            name: 'Apple',
            lastPrice: 150.25,
            change: 2.5,
            changePercent: 1.68,
            volume: 50000000,
            currency: 'USD',
            timestamp: Date.now(),
            exchange: 'NASDAQ',
          },
        ],
      ]);

      (BrapiAdapter.getQuotes as jest.Mock).mockResolvedValueOnce(mockBrapiQuotes);
      (YahooAdapter.getQuotes as jest.Mock).mockResolvedValueOnce(mockYahooQuotes);

      const result = await MarketService.getQuotes(['PETR4', 'AAPL']);

      expect(result.length).toBe(2);
      expect(result[0].symbol).toBe('PETR4');
      expect(result[0].currency).toBe('BRL');
      expect(result[1].symbol).toBe('AAPL');
      expect(result[1].currency).toBe('USD');
    });

    it('deve continuar mesmo se algum adapter falhar', async () => {
      const mockBrapiQuotes = new Map([
        [
          'PETR4',
          {
            symbol: 'PETR4',
            name: 'Petrobras',
            lastPrice: 28.5,
            change: 0.5,
            changePercent: 1.78,
            volume: 1000000,
            currency: 'BRL',
            timestamp: Date.now(),
          },
        ],
      ]);

      (BrapiAdapter.getQuotes as jest.Mock).mockResolvedValueOnce(mockBrapiQuotes);
      (YahooAdapter.getQuotes as jest.Mock).mockRejectedValueOnce(
        new Error('Yahoo error')
      );

      const result = await MarketService.getQuotes(['PETR4', 'AAPL']);

      // Deve ter apenas a quote da Brapi
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe('PETR4');
    });
  });

  describe('getHistoricalDaily()', () => {
    it('deve retornar histórico com candles formatadas', async () => {
      const mockCandles = [
        { date: '2024-01-01', open: 28.0, high: 29.0, low: 27.5, close: 28.5, volume: 1000000 },
        { date: '2024-01-02', open: 28.5, high: 29.5, low: 28.0, close: 29.0, volume: 1100000 },
      ];

      (YahooAdapter.getHistoricalDaily as jest.Mock).mockResolvedValueOnce(mockCandles);

      const result = await MarketService.getHistoricalDaily('AAPL', 365);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).toHaveProperty('volume');
    });

    it('deve retornar array vazio se histórico não disponível', async () => {
      (YahooAdapter.getHistoricalDaily as jest.Mock).mockResolvedValueOnce([]);

      const result = await MarketService.getHistoricalDaily('INVALID_TICKER', 365);

      expect(result).toEqual([]);
    });
  });

  describe('health()', () => {
    it('deve retornar health status de ambos adapters', async () => {
      (BrapiAdapter.health as jest.Mock).mockResolvedValueOnce(true);
      (YahooAdapter.health as jest.Mock).mockResolvedValueOnce(true);

      const result = await MarketService.health();

      expect(result.brapi).toBe(true);
      expect(result.yahoo).toBe(true);
      expect(result.overall).toBe(true);
    });

    it('deve marcar como degradado se um adapter cai', async () => {
      (BrapiAdapter.health as jest.Mock).mockResolvedValueOnce(false);
      (YahooAdapter.health as jest.Mock).mockResolvedValueOnce(true);

      const result = await MarketService.health();

      expect(result.brapi).toBe(false);
      expect(result.yahoo).toBe(true);
      expect(result.overall).toBe(true); // Ainda OK se um está up
    });

    it('deve marcar como crítico se ambos adapters caem', async () => {
      (BrapiAdapter.health as jest.Mock).mockResolvedValueOnce(false);
      (YahooAdapter.health as jest.Mock).mockResolvedValueOnce(false);

      const result = await MarketService.health();

      expect(result.brapi).toBe(false);
      expect(result.yahoo).toBe(false);
      expect(result.overall).toBe(false);
    });
  });

  describe('clearCache()', () => {
    it('deve limpar cache de ambos adapters', async () => {
      const clearCacheSpy1 = jest.spyOn(BrapiAdapter, 'clearCache');
      const clearCacheSpy2 = jest.spyOn(YahooAdapter, 'clearCache');

      MarketService.clearCache();

      expect(clearCacheSpy1).toHaveBeenCalled();
      expect(clearCacheSpy2).toHaveBeenCalled();
    });
  });

  describe('Detecção de Ticker', () => {
    it('deve detectar B3 corretamente', async () => {
      const mockQuote = {
        symbol: 'PETR4',
        name: 'Petrobras',
        lastPrice: 28.5,
        change: 0.5,
        changePercent: 1.78,
        volume: 1000000,
        currency: 'BRL',
        timestamp: Date.now(),
      };

      (BrapiAdapter.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      // B3 é: 4 letras + 1 número (PETR4, VALE3, etc)
      const result = await MarketService.getQuote('PETR4');

      expect(BrapiAdapter.getQuote).toHaveBeenCalledWith('PETR4');
      expect(result.source).toBe('BRAPI');
    });

    it('deve detectar EUA/outros formatos corretamente', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        name: 'Apple',
        lastPrice: 150.25,
        change: 2.5,
        changePercent: 1.68,
        volume: 50000000,
        currency: 'USD',
        timestamp: Date.now(),
        exchange: 'NASDAQ',
      };

      (YahooAdapter.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      // EUA é: qualquer format que não seja B3 (AAPL, MSFT, BTC-USD, etc)
      const result = await MarketService.getQuote('AAPL');

      expect(YahooAdapter.getQuote).toHaveBeenCalledWith('AAPL');
      expect(result.source).toBe('YAHOO');
    });
  });

  describe('Erro Handling', () => {
    it('deve rejeitar com erro descritivo se ambos adapters falham', async () => {
      (BrapiAdapter.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Brapi error')
      );
      (YahooAdapter.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Yahoo error')
      );

      await expect(MarketService.getQuote('INVALID')).rejects.toThrow();
    });

    it('deve lidar com timeouts', async () => {
      (BrapiAdapter.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      );
      (YahooAdapter.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      await expect(MarketService.getQuote('PETR4')).rejects.toThrow();
    });
  });
});
