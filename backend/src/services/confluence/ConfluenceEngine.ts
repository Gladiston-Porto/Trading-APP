/**
 * ConfluenceEngine - Sistema de Sinais de Trading
 * 
 * Combina Indicadores Técnicos + Padrões Candlestick
 * Gera sinais BUY/SELL/NEUTRAL com confidence 0-100
 * 
 * Architecture:
 * - Pure functions (sem side effects)
 * - Input: Indicadores + Padrões de uma série de candles
 * - Output: Sinais com score, rationale, SL, TP
 * 
 * Scoring Logic:
 * - Cada indicador contribui com score 0-100
 * - Cada padrão contribui com score 0-100
 * - Score final é média ponderada com validações
 * - Gera rationale explicando a confluência
 */

export interface IndicatorValues {
  ema9?: number;
  ema21?: number;
  ema200?: number;
  sma50?: number;
  sma200?: number;
  rsi14?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  atr14?: number;
  obv?: number;
  vwap?: number;
}

export interface DetectedPattern {
  date: string;
  pattern: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  candles: number;
  rationale: string;
  target?: {
    type: 'support' | 'resistance';
    price: number;
    distance: number;
  };
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalConfidence {
  trendScore: number; // EMA/SMA alignment
  momentumScore: number; // RSI/MACD scores
  volatilityScore: number; // ATR/OBV scores
  patternScore: number; // Pattern confidence
  volumeScore: number; // Volume confirmation
}

export interface TradingSignal {
  ticker: string;
  date: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number; // 0-100
  strength: 'WEAK' | 'MEDIUM' | 'STRONG'; // Based on confidence
  rationale: {
    trend: string;
    momentum: string;
    pattern: string;
    volume: string;
    summary: string;
  };
  riskReward: {
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
    distance: {
      toSL: number; // %
      toTP: number; // %
    };
  };
  confluence: SignalConfidence;
  components: {
    indicators: string[];
    patterns: string[];
  };
}

/**
 * ConfluenceEngine - Main Service Class
 */
class ConfluenceEngine {
  /**
   * Gera sinal de trading a partir de indicadores e padrões
   */
  static generateSignal(
    ticker: string,
    candles: Candle[],
    indicators: IndicatorValues,
    patterns: DetectedPattern[]
  ): TradingSignal {
    const currentCandle = candles[candles.length - 1];
    
    // 1. Score individual de cada componente
    const trendScore = this.calculateTrendScore(indicators, candles);
    const momentumScore = this.calculateMomentumScore(indicators);
    const volatilityScore = this.calculateVolatilityScore(indicators);
    const patternScore = this.calculatePatternScore(patterns);
    const volumeScore = this.calculateVolumeScore(indicators, candles);

    // 2. Score final (média ponderada)
    const confidence = this.weightedConfidence(
      trendScore,
      momentumScore,
      volatilityScore,
      patternScore,
      volumeScore
    );

    // 3. Direção do sinal (BUY/SELL/NEUTRAL)
    const direction = this.determineDirection(
      trendScore,
      momentumScore,
      patternScore,
      patterns
    );

    // 4. Gera rationale explicando cada componente
    const rationale = this.generateRationale(
      trendScore,
      momentumScore,
      volatilityScore,
      patternScore,
      volumeScore,
      indicators,
      patterns
    );

    // 5. Calcula SL e TP
    const riskReward = this.calculateRiskReward(
      currentCandle,
      direction,
      volatilityScore,
      indicators
    );

    // 6. Determina força do sinal
    const strength = this.determineStrength(confidence);

    // 7. Coleta componentes que contribuiram
    const components = this.identifyComponents(indicators, patterns);

    return {
      ticker,
      date: currentCandle.date,
      direction,
      confidence,
      strength,
      rationale,
      riskReward,
      confluence: {
        trendScore,
        momentumScore,
        volatilityScore,
        patternScore,
        volumeScore,
      },
      components,
    };
  }

  /**
   * Calcula score de tendência (EMA/SMA alignment)
   * 0-100, onde 100 é tendência forte
   */
  private static calculateTrendScore(
    indicators: IndicatorValues,
    candles: Candle[]
  ): number {
    if (!candles || candles.length < 2) return 50;

    const close = candles[candles.length - 1].close;
    let score = 50;
    let count = 0;

    // EMA21 acima de EMA200 = bullish
    if (indicators.ema21 && indicators.ema200) {
      const emaDiff = indicators.ema21 - indicators.ema200;
      const emaPct = (emaDiff / indicators.ema200) * 100;
      
      if (emaPct > 0.5) {
        score += Math.min(25, emaPct * 2); // Bullish
      } else if (emaPct < -0.5) {
        score -= Math.min(25, Math.abs(emaPct) * 2); // Bearish
      }
      count++;
    }

    // SMA50 acima de SMA200 = bullish
    if (indicators.sma50 && indicators.sma200) {
      const smaDiff = indicators.sma50 - indicators.sma200;
      const smaPct = (smaDiff / indicators.sma200) * 100;
      
      if (smaPct > 0.5) {
        score += Math.min(15, smaPct * 1.5); // Bullish
      } else if (smaPct < -0.5) {
        score -= Math.min(15, Math.abs(smaPct) * 1.5); // Bearish
      }
      count++;
    }

    // Preço acima de EMA200 = bullish
    if (indicators.ema200) {
      const pricePct = ((close - indicators.ema200) / indicators.ema200) * 100;
      
      if (pricePct > 0.5) {
        score += Math.min(10, pricePct); // Bullish
      } else if (pricePct < -0.5) {
        score -= Math.min(10, Math.abs(pricePct)); // Bearish
      }
      count++;
    }

    // Normalize
    if (count > 0) {
      score = (score - 50) / count + 50;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcula score de momentum (RSI/MACD)
   */
  private static calculateMomentumScore(indicators: IndicatorValues): number {
    let score = 50;
    let count = 0;

    // RSI14: < 30 oversold (bullish), > 70 overbought (bearish)
    if (indicators.rsi14 !== undefined) {
      if (indicators.rsi14 < 30) {
        score += (30 - indicators.rsi14) * 0.67; // Bullish reversal opportunity
      } else if (indicators.rsi14 > 70) {
        score -= (indicators.rsi14 - 70) * 0.67; // Bearish reversal opportunity
      } else if (indicators.rsi14 > 50) {
        score += (indicators.rsi14 - 50) * 0.3; // Mild bullish
      } else if (indicators.rsi14 < 50) {
        score -= (50 - indicators.rsi14) * 0.3; // Mild bearish
      }
      count++;
    }

    // MACD: histogram > 0 e crescendo = bullish
    if (indicators.macd) {
      const { macd, signal, histogram } = indicators.macd;
      
      if (histogram > 0) {
        score += Math.min(20, histogram * 100); // Bullish momentum
      } else if (histogram < 0) {
        score -= Math.min(20, Math.abs(histogram) * 100); // Bearish momentum
      }

      // MACD acima de signal = bullish
      if (macd > signal) {
        score += 5; // Bullish confirmation
      } else if (macd < signal) {
        score -= 5; // Bearish confirmation
      }
      count++;
    }

    // Normalize
    if (count > 0) {
      score = (score - 50) / count + 50;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcula score de volatilidade (ATR/OBV)
   */
  private static calculateVolatilityScore(indicators: IndicatorValues): number {
    let score = 50;

    // ATR: maior ATR = maior volatilidade (pode ser oportunidade ou risco)
    // Usamos para ajustar SL/TP, não para sinal direto
    // Apenas confirmamos se ATR é razoável
    if (indicators.atr14) {
      // ATR muito baixo = mercado entediante
      if (indicators.atr14 < 0.001) {
        score -= 10; // Lower confidence em mercado parado
      } else if (indicators.atr14 > 0.05) {
        score += 5; // Volatilidade saudável
      }
    }

    // OBV: volume crescendo em direção da tendência
    if (indicators.obv !== undefined) {
      // OBV positivo = mais volume nos up days
      if (indicators.obv > 0) {
        score += 10; // Bullish volume
      } else if (indicators.obv < 0) {
        score -= 10; // Bearish volume
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcula score de padrões candlestick
   */
  private static calculatePatternScore(patterns: DetectedPattern[]): number {
    if (!patterns || patterns.length === 0) return 50;

    // Usa padrão mais confiante
    const topPattern = patterns.reduce((max, p) => 
      p.confidence > max.confidence ? p : max
    );

    // Padrões bullish aumentam score, bearish diminuem
    if (topPattern.type === 'bullish') {
      return 50 + (topPattern.confidence / 2); // 50-100
    } else if (topPattern.type === 'bearish') {
      return 50 - (topPattern.confidence / 2); // 0-50
    } else {
      return 50; // Neutral patterns não afetam
    }
  }

  /**
   * Calcula score de volume
   */
  private static calculateVolumeScore(
    indicators: IndicatorValues,
    candles: Candle[]
  ): number {
    if (!candles || candles.length < 2) return 50;

    const currentVolume = candles[candles.length - 1].volume;
    const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;

    let score = 50;

    // Volume acima da média = confirmação
    if (currentVolume > avgVolume * 1.2) {
      score += 15; // Good confirmation
    } else if (currentVolume < avgVolume * 0.8) {
      score -= 10; // Weak confirmation
    }

    // OBV também contribui
    if (indicators.obv !== undefined) {
      const obvConfirm = indicators.obv > 0 ? 10 : -10;
      score += obvConfirm;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score final ponderado
   */
  private static weightedConfidence(
    trendScore: number,
    momentumScore: number,
    volatilityScore: number,
    patternScore: number,
    volumeScore: number
  ): number {
    // Pesos: Tendência (35%), Momentum (25%), Padrão (20%), Volume (15%), Volatilidade (5%)
    const weights = {
      trend: 0.35,
      momentum: 0.25,
      pattern: 0.20,
      volume: 0.15,
      volatility: 0.05,
    };

    const weighted =
      trendScore * weights.trend +
      momentumScore * weights.momentum +
      patternScore * weights.pattern +
      volumeScore * weights.volume +
      volatilityScore * weights.volatility;

    return Math.round(weighted);
  }

  /**
   * Determina direção do sinal (BUY/SELL/NEUTRAL)
   */
  private static determineDirection(
    trendScore: number,
    momentumScore: number,
    patternScore: number,
    patterns: DetectedPattern[]
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    // Avaliar múltiplos critérios
    const bullishCount =
      (trendScore > 55 ? 1 : 0) +
      (momentumScore > 55 ? 1 : 0) +
      (patternScore > 55 ? 1 : 0) +
      (patterns.filter(p => p.type === 'bullish' && p.confidence > 70).length > 0 ? 1 : 0);

    const bearishCount =
      (trendScore < 45 ? 1 : 0) +
      (momentumScore < 45 ? 1 : 0) +
      (patternScore < 45 ? 1 : 0) +
      (patterns.filter(p => p.type === 'bearish' && p.confidence > 70).length > 0 ? 1 : 0);

    // Maioria de sinais bullish = BUY
    if (bullishCount >= 3) return 'BUY';

    // Maioria de sinais bearish = SELL
    if (bearishCount >= 3) return 'SELL';

    // Senão = NEUTRAL
    return 'NEUTRAL';
  }

  /**
   * Determina força do sinal
   */
  private static determineStrength(confidence: number): 'WEAK' | 'MEDIUM' | 'STRONG' {
    if (confidence >= 75) return 'STRONG';
    if (confidence >= 60) return 'MEDIUM';
    return 'WEAK';
  }

  /**
   * Calcula Stop Loss e Take Profit
   */
  private static calculateRiskReward(
    candle: Candle,
    direction: 'BUY' | 'SELL' | 'NEUTRAL',
    volatilityScore: number,
    indicators: IndicatorValues
  ): TradingSignal['riskReward'] {
    const atr = indicators.atr14 || (candle.high - candle.low) * 0.5;
    const atrPct = (atr / candle.close) * 100;

    let stopLoss: number;
    let takeProfit: number;

    if (direction === 'BUY') {
      // Stop Loss abaixo do low recente (1.5x ATR)
      stopLoss = candle.low - atr * 1.5;
      
      // Take Profit acima (3x ATR para 1:3 RR)
      takeProfit = candle.close + atr * 3;
    } else if (direction === 'SELL') {
      // Stop Loss acima do high recente
      stopLoss = candle.high + atr * 1.5;
      
      // Take Profit abaixo
      takeProfit = candle.close - atr * 3;
    } else {
      // NEUTRAL: não há sinal
      stopLoss = candle.close;
      takeProfit = candle.close;
    }

    const riskDistance = Math.abs(candle.close - stopLoss);
    const rewardDistance = Math.abs(takeProfit - candle.close);
    const riskRewardRatio = rewardDistance / (riskDistance || 1);

    return {
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      distance: {
        toSL: Math.round(((candle.close - stopLoss) / candle.close) * 10000) / 100,
        toTP: Math.round(((takeProfit - candle.close) / candle.close) * 10000) / 100,
      },
    };
  }

  /**
   * Gera rationale explicando a confluência
   */
  private static generateRationale(
    trendScore: number,
    momentumScore: number,
    volatilityScore: number,
    patternScore: number,
    volumeScore: number,
    indicators: IndicatorValues,
    patterns: DetectedPattern[]
  ): TradingSignal['rationale'] {
    const trend = this.generateTrendRationale(trendScore, indicators);
    const momentum = this.generateMomentumRationale(momentumScore, indicators);
    const pattern = patterns.length > 0
      ? patterns[0].rationale
      : 'Nenhum padrão detectado';
    const volume = this.generateVolumeRationale(volumeScore, indicators);
    
    const summary = this.generateSummary(
      trendScore,
      momentumScore,
      patternScore,
      volumeScore
    );

    return { trend, momentum, pattern, volume, summary };
  }

  private static generateTrendRationale(
    score: number,
    indicators: IndicatorValues
  ): string {
    if (score > 65) {
      return `Tendência bullish forte. EMA21 ${indicators.ema21?.toFixed(2)} > EMA200 ${indicators.ema200?.toFixed(2)}, SMA50 ${indicators.sma50?.toFixed(2)} > SMA200 ${indicators.sma200?.toFixed(2)}.`;
    } else if (score > 55) {
      return `Tendência bullish leve. Preço > EMA200 com médias móveis em alinhamento favorável.`;
    } else if (score < 35) {
      return `Tendência bearish forte. Preço < EMA200 com médias em desalinhamento.`;
    } else if (score < 45) {
      return `Tendência bearish leve. Médias móveis começando a se desalinhar.`;
    }
    return 'Tendência indefinida. Mercado em consolidação.';
  }

  private static generateMomentumRationale(
    score: number,
    indicators: IndicatorValues
  ): string {
    if (score > 65) {
      return `Momentum bullish. RSI(14) ${indicators.rsi14?.toFixed(0)} em zona de compra, MACD em alta.`;
    } else if (score > 55) {
      return `Momentum positivo. RSI ${indicators.rsi14?.toFixed(0)} em zona neutra com viés bullish.`;
    } else if (score < 35) {
      return `Momentum bearish. RSI ${indicators.rsi14?.toFixed(0)} em zona de venda, MACD em queda.`;
    } else if (score < 45) {
      return `Momentum negativo. RSI em zona neutra com viés bearish.`;
    }
    return 'Momentum indefinido. Aguardando impulso direcional.';
  }

  private static generateVolumeRationale(
    score: number,
    indicators: IndicatorValues
  ): string {
    if (score > 60) {
      return `Volume de confirmação forte. OBV crescendo com movimento.`;
    } else if (score > 50) {
      return `Volume adequado. Movimento sendo acompanhado por volume.`;
    } else if (score < 40) {
      return `Volume fraco. Movimento com pouca confirmação de volume.`;
    }
    return 'Volume neutro. Acompanhando média histórica.';
  }

  private static generateSummary(
    trendScore: number,
    momentumScore: number,
    patternScore: number,
    volumeScore: number
  ): string {
    const avgScore = (trendScore + momentumScore + patternScore + volumeScore) / 4;

    if (avgScore >= 70) {
      return 'Confluência forte. Múltiplos indicadores alinhados na mesma direção.';
    } else if (avgScore >= 60) {
      return 'Confluência moderada. Maioria dos indicadores em acordo.';
    } else if (avgScore <= 30) {
      return 'Confluência bearish forte. Mercado alinhado em queda.';
    } else if (avgScore <= 40) {
      return 'Confluência moderada em queda. Indicadores sinalizando fraqueza.';
    }
    return 'Confluência mista. Indicadores divergentes, aguarde clareza.';
  }

  /**
   * Identifica componentes que contribuiram ao sinal
   */
  private static identifyComponents(
    indicators: IndicatorValues,
    patterns: DetectedPattern[]
  ): TradingSignal['components'] {
    const indicators_used: string[] = [];
    const patterns_used: string[] = [];

    if (indicators.ema21 && indicators.ema200) indicators_used.push('EMA');
    if (indicators.sma50 && indicators.sma200) indicators_used.push('SMA');
    if (indicators.rsi14 !== undefined) indicators_used.push('RSI');
    if (indicators.macd) indicators_used.push('MACD');
    if (indicators.atr14) indicators_used.push('ATR');
    if (indicators.obv !== undefined) indicators_used.push('OBV');
    if (indicators.vwap) indicators_used.push('VWAP');

    patterns.forEach(p => {
      if (!patterns_used.includes(p.pattern) && p.confidence > 60) {
        patterns_used.push(p.pattern);
      }
    });

    return {
      indicators: indicators_used,
      patterns: patterns_used,
    };
  }

  /**
   * Scan múltiplos ativos com sinais
   */
  static scanMultiple(
    results: Map<string, {
      candles: Candle[];
      indicators: IndicatorValues;
      patterns: DetectedPattern[];
    }>
  ): Map<string, TradingSignal> {
    const signals = new Map<string, TradingSignal>();

    results.forEach((data, ticker) => {
      const signal = this.generateSignal(
        ticker,
        data.candles,
        data.indicators,
        data.patterns
      );
      signals.set(ticker, signal);
    });

    return signals;
  }

  /**
   * Filtra sinais por força (STRONG/MEDIUM/WEAK)
   */
  static filterByStrength(
    signals: TradingSignal[],
    minStrength: 'WEAK' | 'MEDIUM' | 'STRONG'
  ): TradingSignal[] {
    const strengthOrder = { WEAK: 1, MEDIUM: 2, STRONG: 3 };

    return signals.filter(
      s => strengthOrder[s.strength] >= strengthOrder[minStrength]
    );
  }

  /**
   * Filtra sinais por direção
   */
  static filterByDirection(
    signals: TradingSignal[],
    direction: 'BUY' | 'SELL'
  ): TradingSignal[] {
    return signals.filter(s => s.direction === direction);
  }

  /**
   * Calcula estatísticas dos sinais gerados
   */
  static calculateStats(signals: TradingSignal[]): {
    total: number;
    buyCount: number;
    sellCount: number;
    neutralCount: number;
    avgConfidence: number;
    strongCount: number;
  } {
    return {
      total: signals.length,
      buyCount: signals.filter(s => s.direction === 'BUY').length,
      sellCount: signals.filter(s => s.direction === 'SELL').length,
      neutralCount: signals.filter(s => s.direction === 'NEUTRAL').length,
      avgConfidence: Math.round(
        signals.reduce((sum, s) => sum + s.confidence, 0) / (signals.length || 1)
      ),
      strongCount: signals.filter(s => s.strength === 'STRONG').length,
    };
  }
}

export default ConfluenceEngine;
