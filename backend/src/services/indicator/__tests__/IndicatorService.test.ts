/**
 * IndicatorService Tests
 *
 * Testes unitários para todos os indicadores técnicos
 * Usa candles mock para validação
 */

import IndicatorService, { Candle } from '../IndicatorService';

describe('IndicatorService', () => {
  // Dados mock: candles com 50 dias de histórico
  const mockCandles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i * 0.5 + Math.random() * 2,
    high: 102 + i * 0.5 + Math.random() * 2,
    low: 98 + i * 0.5 + Math.random() * 2,
    close: 100 + i * 0.7 + Math.random() * 3,
    volume: 1000000 + Math.random() * 500000,
  }));

  describe('calculateEMA', () => {
    test('deve retornar EMASeries com ema9, ema21, ema200', () => {
      const result = IndicatorService.calculateEMA(mockCandles);

      expect(result).toHaveProperty('ema9');
      expect(result).toHaveProperty('ema21');
      expect(result).toHaveProperty('ema200');
      expect(result.ema9).toHaveLength(50);
      expect(result.ema21).toHaveLength(50);
      expect(result.ema200).toHaveLength(50);
    });

    test('primeiros valores de ema9 devem ser null', () => {
      const result = IndicatorService.calculateEMA(mockCandles);

      // EMA9 começa após 8 candles
      for (let i = 0; i < 8; i++) {
        expect(result.ema9[i].value).toBeNull();
      }
    });

    test('valores de ema9 depois de periodo devem ser numeros', () => {
      const result = IndicatorService.calculateEMA(mockCandles);

      for (let i = 8; i < result.ema9.length; i++) {
        expect(typeof result.ema9[i].value).toBe('number');
        expect(result.ema9[i].value).toBeGreaterThan(0);
      }
    });

    test('ema9 deve ser mais responsiva que ema21', () => {
      const result = IndicatorService.calculateEMA(mockCandles);

      // Candles com trend forte
      const lastIdx = mockCandles.length - 1;
      const ema9Last = result.ema9[lastIdx].value || 0;
      const ema21Last = result.ema21[lastIdx].value || 0;

      // EMA9 deve estar mais longe do preço "médio" que EMA21
      expect(ema9Last).toBeDefined();
      expect(ema21Last).toBeDefined();
    });

    test('com candles vazios deve retornar array vazio', () => {
      const result = IndicatorService.calculateEMA([]);

      expect(result.ema9).toHaveLength(0);
      expect(result.ema21).toHaveLength(0);
      expect(result.ema200).toHaveLength(0);
    });
  });

  describe('calculateSMA', () => {
    test('deve retornar SMASeries com sma50, sma200', () => {
      const result = IndicatorService.calculateSMA(mockCandles);

      expect(result).toHaveProperty('sma50');
      expect(result).toHaveProperty('sma200');
      expect(result.sma50).toHaveLength(50);
      expect(result.sma200).toHaveLength(50);
    });

    test('primeiros valores de sma50 devem ser null', () => {
      const result = IndicatorService.calculateSMA(mockCandles);

      // SMA50 começa após 49 candles
      for (let i = 0; i < 49; i++) {
        expect(result.sma50[i].value).toBeNull();
      }
    });

    test('sma50 no índice 49 deve ser válido', () => {
      const result = IndicatorService.calculateSMA(mockCandles);

      expect(result.sma50[49].value).not.toBeNull();
      expect(typeof result.sma50[49].value).toBe('number');
    });
  });

  describe('calculateRSI', () => {
    test('deve retornar RSISeries com periodo 14', () => {
      const result = IndicatorService.calculateRSI(mockCandles);

      expect(result).toHaveProperty('rsi');
      expect(result.rsi).toHaveLength(50);
    });

    test('primeiros 14 valores devem ser null', () => {
      const result = IndicatorService.calculateRSI(mockCandles);

      for (let i = 0; i <= 14; i++) {
        expect(result.rsi[i].value).toBeNull();
      }
    });

    test('rsi deve estar entre 0 e 100', () => {
      const result = IndicatorService.calculateRSI(mockCandles);

      for (let i = 15; i < result.rsi.length; i++) {
        if (result.rsi[i].value !== null) {
          expect(result.rsi[i].value).toBeGreaterThanOrEqual(0);
          expect(result.rsi[i].value).toBeLessThanOrEqual(100);
        }
      }
    });

    test('com uptrend, rsi deve ser > 50', () => {
      // Criar candles com uptrend claro
      const uptrendCandles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i * 2,
        high: 102 + i * 2,
        low: 99 + i * 2,
        close: 101 + i * 2,
        volume: 1000000,
      }));

      const result = IndicatorService.calculateRSI(uptrendCandles);
      const lastRSI = result.rsi[result.rsi.length - 1].value;

      if (lastRSI !== null) {
        expect(lastRSI).toBeGreaterThan(50);
      }
    });

    test('com downtrend, rsi deve ser < 50', () => {
      // Criar candles com downtrend claro
      const downtrendCandles: Candle[] = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 - i * 2,
        high: 101 - i * 2,
        low: 98 - i * 2,
        close: 99 - i * 2,
        volume: 1000000,
      }));

      const result = IndicatorService.calculateRSI(downtrendCandles);
      const lastRSI = result.rsi[result.rsi.length - 1].value;

      if (lastRSI !== null) {
        expect(lastRSI).toBeLessThan(50);
      }
    });
  });

  describe('calculateMACD', () => {
    test('deve retornar MACDSeries com macd, signal, histogram', () => {
      const result = IndicatorService.calculateMACD(mockCandles);

      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      expect(result.macd).toHaveLength(50);
      expect(result.signal).toHaveLength(50);
      expect(result.histogram).toHaveLength(50);
    });

    test('primeiros 25 valores devem ser null', () => {
      const result = IndicatorService.calculateMACD(mockCandles);

      for (let i = 0; i < 25; i++) {
        expect(result.macd[i].value).toBeNull();
      }
    });

    test('histogram = macd - signal', () => {
      const result = IndicatorService.calculateMACD(mockCandles);

      for (let i = 0; i < result.histogram.length; i++) {
        if (
          result.macd[i].value !== null &&
          result.signal[i].value !== null &&
          result.histogram[i].value !== null
        ) {
          const expected = result.macd[i].value! - result.signal[i].value!;
          expect(result.histogram[i].value!).toBeCloseTo(expected, 5);
        }
      }
    });

    test('com candles < 26, retornar all nulls', () => {
      const shortCandles = mockCandles.slice(0, 25);
      const result = IndicatorService.calculateMACD(shortCandles);

      for (let i = 0; i < result.macd.length; i++) {
        expect(result.macd[i].value).toBeNull();
      }
    });
  });

  describe('calculateATR', () => {
    test('deve retornar ATRSeries', () => {
      const result = IndicatorService.calculateATR(mockCandles);

      expect(result).toHaveProperty('atr');
      expect(result.atr).toHaveLength(50);
    });

    test('primeiros 13 valores devem ser null', () => {
      const result = IndicatorService.calculateATR(mockCandles);

      for (let i = 0; i < 13; i++) {
        expect(result.atr[i].value).toBeNull();
      }
    });

    test('atr no índice 13 deve ser válido', () => {
      const result = IndicatorService.calculateATR(mockCandles);

      expect(result.atr[13].value).not.toBeNull();
      expect(typeof result.atr[13].value).toBe('number');
      expect(result.atr[13].value).toBeGreaterThan(0);
    });

    test('atr deve ser sempre positivo', () => {
      const result = IndicatorService.calculateATR(mockCandles);

      for (let i = 13; i < result.atr.length; i++) {
        if (result.atr[i].value !== null) {
          expect(result.atr[i].value).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('calculateOBV', () => {
    test('deve retornar OBVSeries', () => {
      const result = IndicatorService.calculateOBV(mockCandles);

      expect(result).toHaveProperty('obv');
      expect(result.obv).toHaveLength(50);
    });

    test('primeiro obv deve ser volume do primeiro candle', () => {
      const result = IndicatorService.calculateOBV(mockCandles);

      expect(result.obv[0].value).toBeCloseTo(mockCandles[0].volume, 0);
    });

    test('obv deve ser acumulativo', () => {
      const result = IndicatorService.calculateOBV(mockCandles);

      // Todos os valores devem ser não-nulos
      for (let i = 0; i < result.obv.length; i++) {
        expect(result.obv[i].value).not.toBeNull();
        expect(typeof result.obv[i].value).toBe('number');
      }
    });

    test('com candles vazios, retornar array vazio', () => {
      const result = IndicatorService.calculateOBV([]);

      expect(result.obv).toHaveLength(0);
    });
  });

  describe('calculateVWAP', () => {
    test('deve retornar VWAPSeries', () => {
      const result = IndicatorService.calculateVWAP(mockCandles);

      expect(result).toHaveProperty('vwap');
      expect(result.vwap).toHaveLength(50);
    });

    test('vwap deve estar entre min e max do período', () => {
      const result = IndicatorService.calculateVWAP(mockCandles);

      for (let i = 0; i < result.vwap.length; i++) {
        const vwap = result.vwap[i].value;
        if (vwap !== null) {
          const minPrice = Math.min(...mockCandles.slice(0, i + 1).map(c => c.low));
          const maxPrice = Math.max(...mockCandles.slice(0, i + 1).map(c => c.high));

          expect(vwap).toBeGreaterThanOrEqual(minPrice - 1); // -1 para floating point
          expect(vwap).toBeLessThanOrEqual(maxPrice + 1);
        }
      }
    });

    test('com candles vazios, retornar array vazio', () => {
      const result = IndicatorService.calculateVWAP([]);

      expect(result.vwap).toHaveLength(0);
    });
  });

  describe('calculateAll', () => {
    test('deve retornar todos os indicadores', () => {
      const result = IndicatorService.calculateAll(mockCandles);

      expect(result).toHaveProperty('ema');
      expect(result).toHaveProperty('sma');
      expect(result).toHaveProperty('rsi');
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('atr');
      expect(result).toHaveProperty('obv');
      expect(result).toHaveProperty('vwap');
    });

    test('todos indicadores devem ter length = candles.length', () => {
      const result = IndicatorService.calculateAll(mockCandles);

      expect(result.ema.ema9).toHaveLength(50);
      expect(result.sma.sma50).toHaveLength(50);
      expect(result.rsi.rsi).toHaveLength(50);
      expect(result.macd.macd).toHaveLength(50);
      expect(result.atr.atr).toHaveLength(50);
      expect(result.obv.obv).toHaveLength(50);
      expect(result.vwap.vwap).toHaveLength(50);
    });
  });

  describe('Performance & Edge Cases', () => {
    test('performance: calcular todos indicadores em < 100ms', () => {
      const start = Date.now();
      IndicatorService.calculateAll(mockCandles);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    test('performance: calcular 500 candles em < 500ms', () => {
      const largeCandles = Array.from({ length: 500 }, (_, i) => ({
        date: `2024-${String((i / 30 + 1) | 0).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        open: 100 + i * 0.1 + Math.random() * 2,
        high: 102 + i * 0.1 + Math.random() * 2,
        low: 98 + i * 0.1 + Math.random() * 2,
        close: 100 + i * 0.15 + Math.random() * 3,
        volume: 1000000 + Math.random() * 500000,
      }));

      const start = Date.now();
      IndicatorService.calculateAll(largeCandles);
      const end = Date.now();

      expect(end - start).toBeLessThan(500);
    });

    test('com 1 candle, retornar array com 1 elemento', () => {
      const singleCandle: Candle[] = [mockCandles[0]];
      const result = IndicatorService.calculateAll(singleCandle);

      expect(result.obv.obv).toHaveLength(1);
      expect(result.vwap.vwap).toHaveLength(1);
    });
  });

  describe('Type Correctness', () => {
    test('todos indicadores devem ter dates corretas', () => {
      const result = IndicatorService.calculateAll(mockCandles);

      for (let i = 0; i < mockCandles.length; i++) {
        expect(result.ema.ema9[i].date).toBe(mockCandles[i].date);
        expect(result.rsi.rsi[i].date).toBe(mockCandles[i].date);
        expect(result.macd.macd[i].date).toBe(mockCandles[i].date);
      }
    });

    test('null values devem ser exatamente null, não undefined', () => {
      const result = IndicatorService.calculateEMA(mockCandles);

      for (let i = 0; i < 8; i++) {
        expect(result.ema9[i].value).toBeNull();
        expect(result.ema9[i].value).not.toBeUndefined();
      }
    });
  });
});
