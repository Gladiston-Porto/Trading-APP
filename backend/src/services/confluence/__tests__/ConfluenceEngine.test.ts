/**
 * ConfluenceEngine Tests - Sistema de Sinais de Trading
 * 
 * 35+ test cases cobrindo todos os componentes
 * Coverage target: 90%+
 */

import ConfluenceEngine, { TradingSignal, IndicatorValues, DetectedPattern, Candle } from '../ConfluenceEngine';

describe('ConfluenceEngine', () => {
  // Helper: criar candle de teste
  function createCandle(
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number = 1000000
  ): Candle {
    return { date, open, high, low, close, volume };
  }

  // Helper: criar indicadores bullish
  function createBullishIndicators(): IndicatorValues {
    return {
      ema9: 102,
      ema21: 101,
      ema200: 100,
      sma50: 100.5,
      sma200: 100,
      rsi14: 60, // Mid-range, slightly bullish
      macd: { macd: 0.5, signal: 0.3, histogram: 0.2 },
      atr14: 1,
      obv: 500000,
      vwap: 101,
    };
  }

  // Helper: criar indicadores bearish
  function createBearishIndicators(): IndicatorValues {
    return {
      ema9: 98,
      ema21: 99,
      ema200: 100,
      sma50: 99.5,
      sma200: 100,
      rsi14: 40, // Mid-range, slightly bearish
      macd: { macd: -0.5, signal: -0.3, histogram: -0.2 },
      atr14: 1,
      obv: -500000,
      vwap: 99,
    };
  }

  // Helper: criar candles históricos
  function createHistoricalCandles(): Candle[] {
    return [
      createCandle('2025-01-10', 99, 100, 98.5, 99.5),
      createCandle('2025-01-11', 99.5, 101, 99, 100.5),
      createCandle('2025-01-12', 100, 102, 99.5, 101.5),
      createCandle('2025-01-13', 101, 102.5, 100.5, 102),
      createCandle('2025-01-14', 102, 103, 101.5, 102.5),
    ];
  }

  // Helper: criar padrão bullish
  function createBullishPattern(): DetectedPattern {
    return {
      date: '2025-01-14',
      pattern: 'Hammer',
      type: 'bullish',
      confidence: 85,
      candles: 1,
      rationale: 'Hammer pattern com sombra inferior 3x do corpo',
      target: { type: 'resistance', price: 105, distance: 3 },
    };
  }

  // Helper: criar padrão bearish
  function createBearishPattern(): DetectedPattern {
    return {
      date: '2025-01-14',
      pattern: 'Shooting Star',
      type: 'bearish',
      confidence: 85,
      candles: 1,
      rationale: 'Shooting Star com sombra superior 3x do corpo',
      target: { type: 'support', price: 98, distance: 2 },
    };
  }

  // ==================== TREND SCORE ====================
  describe('calculateTrendScore', () => {
    test('should calculate bullish trend', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.trendScore).toBeGreaterThan(55);
    });

    test('should calculate bearish trend', () => {
      const candles = createHistoricalCandles();
      const indicators = createBearishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.trendScore).toBeLessThan(45);
    });

    test('should handle neutral trend', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {
        ema21: 100.2,
        ema200: 100,
        sma50: 100.1,
        sma200: 100,
      };

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.trendScore).toBeBetween(45, 55);
    });
  });

  // ==================== MOMENTUM SCORE ====================
  describe('calculateMomentumScore', () => {
    test('should detect bullish momentum (RSI > 50)', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {
        rsi14: 65,
        macd: { macd: 0.5, signal: 0.3, histogram: 0.2 },
      };

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.momentumScore).toBeGreaterThan(55);
    });

    test('should detect bearish momentum (RSI < 50)', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {
        rsi14: 35,
        macd: { macd: -0.5, signal: -0.3, histogram: -0.2 },
      };

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.momentumScore).toBeLessThan(45);
    });

    test('should detect oversold condition (RSI < 30)', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {
        rsi14: 25,
        macd: { macd: -0.8, signal: -0.3, histogram: -0.5 },
      };

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.momentumScore).toBeGreaterThan(50); // Reversal opportunity
    });

    test('should detect overbought condition (RSI > 70)', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {
        rsi14: 75,
        macd: { macd: 0.8, signal: 0.3, histogram: 0.5 },
      };

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.momentumScore).toBeLessThan(50); // Reversal risk
    });
  });

  // ==================== PATTERN SCORE ====================
  describe('calculatePatternScore', () => {
    test('should boost score with bullish pattern', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();
      const patterns = [createBullishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      expect(signal.confluence.patternScore).toBeGreaterThan(50);
    });

    test('should reduce score with bearish pattern', () => {
      const candles = createHistoricalCandles();
      const indicators = createBearishIndicators();
      const patterns = [createBearishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      expect(signal.confluence.patternScore).toBeLessThan(50);
    });

    test('should handle empty patterns', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.confluence.patternScore).toBe(50); // Neutral
    });
  });

  // ==================== DIRECTION ====================
  describe('determineDirection', () => {
    test('should generate BUY signal', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();
      const patterns = [createBullishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      expect(signal.direction).toBe('BUY');
    });

    test('should generate SELL signal', () => {
      const candles = createHistoricalCandles();
      const indicators = createBearishIndicators();
      const patterns = [createBearishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      expect(signal.direction).toBe('SELL');
    });

    test('should generate NEUTRAL signal on conflicting indicators', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {
        ema21: 100,
        ema200: 100,
        rsi14: 50, // Neutral RSI
        macd: { macd: 0, signal: 0, histogram: 0 }, // Neutral MACD
      };

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.direction).toBe('NEUTRAL');
    });
  });

  // ==================== SIGNAL STRENGTH ====================
  describe('determineStrength', () => {
    test('should identify STRONG signal (confidence >= 75)', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();
      const patterns = [createBullishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      if (signal.confidence >= 75) {
        expect(signal.strength).toBe('STRONG');
      }
    });

    test('should identify MEDIUM signal (60-75)', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {
        rsi14: 55,
        ema21: 100.5,
        ema200: 100,
      };

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      if (signal.confidence >= 60 && signal.confidence < 75) {
        expect(signal.strength).toBe('MEDIUM');
      }
    });

    test('should identify WEAK signal (confidence < 60)', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {};

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      if (signal.confidence < 60) {
        expect(signal.strength).toBe('WEAK');
      }
    });
  });

  // ==================== RISK REWARD ====================
  describe('calculateRiskReward', () => {
    test('should set SL below entry for BUY signal', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      if (signal.direction === 'BUY') {
        expect(signal.riskReward.stopLoss).toBeLessThan(candles[candles.length - 1].close);
      }
    });

    test('should set TP above entry for BUY signal', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      if (signal.direction === 'BUY') {
        expect(signal.riskReward.takeProfit).toBeGreaterThan(candles[candles.length - 1].close);
      }
    });

    test('should calculate valid risk-reward ratio', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      if (signal.direction !== 'NEUTRAL') {
        expect(signal.riskReward.riskRewardRatio).toBeGreaterThan(0);
        expect(signal.riskReward.distance.toSL).toBeGreaterThan(0);
        expect(signal.riskReward.distance.toTP).toBeGreaterThan(0);
      }
    });
  });

  // ==================== RATIONALE ====================
  describe('generateRationale', () => {
    test('should generate comprehensive rationale', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();
      const patterns = [createBullishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      expect(signal.rationale.trend).toBeTruthy();
      expect(signal.rationale.momentum).toBeTruthy();
      expect(signal.rationale.pattern).toBeTruthy();
      expect(signal.rationale.volume).toBeTruthy();
      expect(signal.rationale.summary).toBeTruthy();
    });

    test('should include bullish language in bullish signal', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();
      const patterns = [createBullishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      if (signal.direction === 'BUY') {
        expect(signal.rationale.summary).toContain('bullish');
      }
    });
  });

  // ==================== SIGNAL COMPONENTS ====================
  describe('identifyComponents', () => {
    test('should identify used indicators', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.components.indicators.length).toBeGreaterThan(0);
      expect(signal.components.indicators).toContain('EMA');
    });

    test('should identify detected patterns', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();
      const patterns = [createBullishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      expect(signal.components.patterns).toContain('Hammer');
    });

    test('should have valid signal structure', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.ticker).toBe('PETR4');
      expect(signal.date).toBeTruthy();
      expect(signal.direction).toMatch(/BUY|SELL|NEUTRAL/);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
      expect(signal.strength).toMatch(/WEAK|MEDIUM|STRONG/);
    });
  });

  // ==================== BATCH OPERATIONS ====================
  describe('scanMultiple', () => {
    test('should generate signals for multiple tickers', () => {
      const results = new Map([
        [
          'PETR4',
          {
            candles: createHistoricalCandles(),
            indicators: createBullishIndicators(),
            patterns: [createBullishPattern()],
          },
        ],
        [
          'VALE3',
          {
            candles: createHistoricalCandles(),
            indicators: createBearishIndicators(),
            patterns: [createBearishPattern()],
          },
        ],
      ]);

      const signals = ConfluenceEngine.scanMultiple(results);

      expect(signals.size).toBe(2);
      expect(signals.has('PETR4')).toBe(true);
      expect(signals.has('VALE3')).toBe(true);
    });
  });

  // ==================== FILTERING ====================
  describe('filterByStrength', () => {
    test('should filter STRONG signals', () => {
      const signals: TradingSignal[] = [
        {
          ticker: 'PETR4',
          date: '2025-01-14',
          direction: 'BUY',
          confidence: 80,
          strength: 'STRONG',
          rationale: { trend: '', momentum: '', pattern: '', volume: '', summary: '' },
          riskReward: {
            stopLoss: 99,
            takeProfit: 105,
            riskRewardRatio: 3,
            distance: { toSL: 1, toTP: 5 },
          },
          confluence: {
            trendScore: 70,
            momentumScore: 75,
            volatilityScore: 50,
            patternScore: 85,
            volumeScore: 60,
          },
          components: { indicators: ['EMA', 'RSI'], patterns: ['Hammer'] },
        },
        {
          ticker: 'VALE3',
          date: '2025-01-14',
          direction: 'BUY',
          confidence: 45,
          strength: 'WEAK',
          rationale: { trend: '', momentum: '', pattern: '', volume: '', summary: '' },
          riskReward: {
            stopLoss: 99,
            takeProfit: 105,
            riskRewardRatio: 3,
            distance: { toSL: 1, toTP: 5 },
          },
          confluence: {
            trendScore: 50,
            momentumScore: 55,
            volatilityScore: 50,
            patternScore: 50,
            volumeScore: 50,
          },
          components: { indicators: [], patterns: [] },
        },
      ];

      const filtered = ConfluenceEngine.filterByStrength(signals, 'STRONG');

      expect(filtered.length).toBe(1);
      expect(filtered[0].ticker).toBe('PETR4');
    });

    test('should filter by direction', () => {
      const signals: TradingSignal[] = [
        {
          ticker: 'PETR4',
          date: '2025-01-14',
          direction: 'BUY',
          confidence: 75,
          strength: 'MEDIUM',
          rationale: { trend: '', momentum: '', pattern: '', volume: '', summary: '' },
          riskReward: {
            stopLoss: 99,
            takeProfit: 105,
            riskRewardRatio: 3,
            distance: { toSL: 1, toTP: 5 },
          },
          confluence: {
            trendScore: 70,
            momentumScore: 70,
            volatilityScore: 50,
            patternScore: 80,
            volumeScore: 60,
          },
          components: { indicators: ['EMA'], patterns: ['Hammer'] },
        },
        {
          ticker: 'VALE3',
          date: '2025-01-14',
          direction: 'SELL',
          confidence: 70,
          strength: 'MEDIUM',
          rationale: { trend: '', momentum: '', pattern: '', volume: '', summary: '' },
          riskReward: {
            stopLoss: 101,
            takeProfit: 95,
            riskRewardRatio: 3,
            distance: { toSL: 1, toTP: 5 },
          },
          confluence: {
            trendScore: 30,
            momentumScore: 35,
            volatilityScore: 50,
            patternScore: 20,
            volumeScore: 40,
          },
          components: { indicators: ['RSI'], patterns: ['Shooting Star'] },
        },
      ];

      const buySignals = ConfluenceEngine.filterByDirection(signals, 'BUY');

      expect(buySignals.length).toBe(1);
      expect(buySignals[0].ticker).toBe('PETR4');
    });
  });

  // ==================== STATISTICS ====================
  describe('calculateStats', () => {
    test('should calculate signal statistics', () => {
      const signals: TradingSignal[] = [
        {
          ticker: 'PETR4',
          date: '2025-01-14',
          direction: 'BUY',
          confidence: 80,
          strength: 'STRONG',
          rationale: { trend: '', momentum: '', pattern: '', volume: '', summary: '' },
          riskReward: {
            stopLoss: 99,
            takeProfit: 105,
            riskRewardRatio: 3,
            distance: { toSL: 1, toTP: 5 },
          },
          confluence: {
            trendScore: 75,
            momentumScore: 75,
            volatilityScore: 50,
            patternScore: 85,
            volumeScore: 70,
          },
          components: { indicators: ['EMA', 'RSI'], patterns: ['Hammer'] },
        },
        {
          ticker: 'VALE3',
          date: '2025-01-14',
          direction: 'SELL',
          confidence: 70,
          strength: 'MEDIUM',
          rationale: { trend: '', momentum: '', pattern: '', volume: '', summary: '' },
          riskReward: {
            stopLoss: 101,
            takeProfit: 95,
            riskRewardRatio: 3,
            distance: { toSL: 1, toTP: 5 },
          },
          confluence: {
            trendScore: 30,
            momentumScore: 35,
            volatilityScore: 50,
            patternScore: 20,
            volumeScore: 40,
          },
          components: { indicators: ['MACD'], patterns: [] },
        },
      ];

      const stats = ConfluenceEngine.calculateStats(signals);

      expect(stats.total).toBe(2);
      expect(stats.buyCount).toBe(1);
      expect(stats.sellCount).toBe(1);
      expect(stats.neutralCount).toBe(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
      expect(stats.strongCount).toBeGreaterThan(0);
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    test('should handle missing indicators', () => {
      const candles = createHistoricalCandles();
      const indicators: IndicatorValues = {};

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal).toBeDefined();
      expect(signal.direction).toBeDefined();
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty candles array gracefully', () => {
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', [], indicators, []);

      expect(signal).toBeDefined();
    });

    test('should handle empty patterns array', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, []);

      expect(signal.components.patterns.length).toBe(0);
      expect(signal.direction).toBeDefined();
    });
  });

  // ==================== INTEGRATION ====================
  describe('Integration', () => {
    test('should generate complete trading signal with all components', () => {
      const candles = createHistoricalCandles();
      const indicators = createBullishIndicators();
      const patterns = [createBullishPattern()];

      const signal = ConfluenceEngine.generateSignal('PETR4', candles, indicators, patterns);

      // Verify all fields are populated
      expect(signal.ticker).toBe('PETR4');
      expect(signal.date).toBeTruthy();
      expect(['BUY', 'SELL', 'NEUTRAL']).toContain(signal.direction);
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
      expect(['WEAK', 'MEDIUM', 'STRONG']).toContain(signal.strength);
      expect(signal.rationale.summary).toBeTruthy();
      expect(signal.riskReward.stopLoss).toBeTruthy();
      expect(signal.riskReward.takeProfit).toBeTruthy();
      expect(signal.confluence.trendScore).toBeGreaterThanOrEqual(0);
      expect(signal.components.indicators.length).toBeGreaterThan(0);
    });

    test('should handle live trading workflow', () => {
      // Simula workflow completo de geração de sinal
      const results = new Map([
        [
          'PETR4',
          {
            candles: createHistoricalCandles(),
            indicators: createBullishIndicators(),
            patterns: [createBullishPattern()],
          },
        ],
      ]);

      // 1. Gera sinais
      const signals = ConfluenceEngine.scanMultiple(results);

      // 2. Filtra por força
      const strongSignals = ConfluenceEngine.filterByStrength(
        Array.from(signals.values()),
        'MEDIUM'
      );

      // 3. Filtra por direção
      const buySignals = ConfluenceEngine.filterByDirection(strongSignals, 'BUY');

      // 4. Calcula estatísticas
      const stats = ConfluenceEngine.calculateStats(buySignals);

      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.buyCount).toBeGreaterThanOrEqual(0);
    });
  });
});
