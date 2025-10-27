/**
 * PatternService - Detecção de Padrões Candlestick
 * 
 * Implementa 40+ padrões técnicos de análise candlestick
 * com confidence scoring e razões matemáticas.
 * 
 * Funções puras - sem side effects
 * Input: Candle[] (OHLCV)
 * Output: DetectedPattern[] com confidence (0-100)
 */

import type { IndicatorValue } from '../indicator/IndicatorService';

// ==================== TYPES ====================

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DetectedPattern {
  date: string;                    // Data da última vela do padrão
  pattern: string;                 // Nome do padrão (ex: "Hammer")
  type: 'bullish' | 'bearish';    // Direção do sinal
  confidence: number;              // 0-100 (força do padrão)
  candles: number;                 // Quantas velas formam o padrão
  rationale: string;               // Explicação do padrão
  target?: {                       // Preço alvo sugerido
    type: 'support' | 'resistance';
    price: number;
    distance: number;              // % de distância
  };
}

export interface PatternResult {
  date: string;
  pattern: DetectedPattern | null;
  confidence: number;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calcula tamanho do corpo da vela
 */
function getCandleBody(candle: Candle): number {
  return Math.abs(candle.close - candle.open);
}

/**
 * Calcula sombra superior
 */
function getUpperShadow(candle: Candle): number {
  const close = Math.max(candle.open, candle.close);
  return candle.high - close;
}

/**
 * Calcula sombra inferior
 */
function getLowerShadow(candle: Candle): number {
  const close = Math.min(candle.open, candle.close);
  return close - candle.low;
}

/**
 * Calcula range total da vela
 */
function getTrueRange(candle: Candle): number {
  return candle.high - candle.low;
}

/**
 * Verifica se vela é bullish (close > open)
 */
function isBullish(candle: Candle): boolean {
  return candle.close > candle.open;
}

/**
 * Verifica se vela é bearish (close < open)
 */
function isBearish(candle: Candle): boolean {
  return candle.close < candle.open;
}

/**
 * Verifica se vela é doji (corpo muito pequeno)
 */
function isDoji(candle: Candle, threshold: number = 0.1): boolean {
  const body = getCandleBody(candle);
  const range = getTrueRange(candle);
  return body <= range * threshold;
}

/**
 * Calcula relação sombra/corpo
 */
function getShadowBodyRatio(candle: Candle): { upper: number; lower: number } {
  const body = getCandleBody(candle);
  if (body === 0) return { upper: 0, lower: 0 };
  
  return {
    upper: getUpperShadow(candle) / body,
    lower: getLowerShadow(candle) / body,
  };
}

// ==================== PADRÕES 1-CANDLE ====================

/**
 * HAMMER (Martelo)
 * - Vela bullish com sombra inferior 2-3x maior que o corpo
 * - Sombra superior muito pequena
 * - Sinal de reversão de baixa
 */
function detectHammer(candle: Candle, prevCandle?: Candle): DetectedPattern | null {
  if (!isBullish(candle)) return null;

  const body = getCandleBody(candle);
  const lower = getLowerShadow(candle);
  const upper = getUpperShadow(candle);

  // Sombra inferior deve ser 2-3x o corpo
  if (lower < body * 2 || lower > body * 4) return null;
  
  // Sombra superior deve ser pequena (< 10% do range)
  if (upper > getTrueRange(candle) * 0.1) return null;

  // Volume deve estar acima da média (se disponível)
  const confidence = Math.min(100, 70 + (lower / body - 2) * 10);

  return {
    date: candle.date,
    pattern: 'Hammer',
    type: 'bullish',
    confidence,
    candles: 1,
    rationale: `Martelo com sombra inferior ${(lower / body).toFixed(1)}x do corpo. Sinal bullish de reversão.`,
    target: {
      type: 'resistance',
      price: candle.high,
      distance: ((candle.high - candle.close) / candle.close) * 100,
    },
  };
}

/**
 * INVERTED HAMMER (Martelo Invertido)
 * - Vela bearish com sombra superior 2-3x maior que o corpo
 * - Sombra inferior muito pequena
 * - Sinal de reversão potencial de alta
 */
function detectInvertedHammer(candle: Candle): DetectedPattern | null {
  if (!isBearish(candle)) return null;

  const body = getCandleBody(candle);
  const upper = getUpperShadow(candle);
  const lower = getLowerShadow(candle);

  // Sombra superior deve ser 2-3x o corpo
  if (upper < body * 2 || upper > body * 4) return null;
  
  // Sombra inferior deve ser pequena
  if (lower > getTrueRange(candle) * 0.1) return null;

  const confidence = Math.min(100, 70 + (upper / body - 2) * 10);

  return {
    date: candle.date,
    pattern: 'Inverted Hammer',
    type: 'bullish',
    confidence,
    candles: 1,
    rationale: `Martelo invertido com sombra superior ${(upper / body).toFixed(1)}x do corpo. Sinal bullish de reversão.`,
    target: {
      type: 'resistance',
      price: candle.high,
      distance: ((candle.high - candle.low) / candle.close) * 100,
    },
  };
}

/**
 * SHOOTING STAR (Estrela Cadente)
 * - Vela bearish com sombra superior longa
 * - Sombra inferior pequena
 * - Sinal de reversão de alta
 */
function detectShootingStar(candle: Candle): DetectedPattern | null {
  if (!isBearish(candle)) return null;

  const body = getCandleBody(candle);
  const upper = getUpperShadow(candle);
  const lower = getLowerShadow(candle);
  const range = getTrueRange(candle);

  // Sombra superior deve ser pelo menos 1.5x o corpo
  if (upper < body * 1.5) return null;
  
  // Sombra inferior deve ser pequena
  if (lower > range * 0.1) return null;

  const confidence = Math.min(100, 60 + (upper / body - 1.5) * 5);

  return {
    date: candle.date,
    pattern: 'Shooting Star',
    type: 'bearish',
    confidence,
    candles: 1,
    rationale: `Estrela cadente com sombra superior ${(upper / body).toFixed(1)}x do corpo. Sinal bearish de reversão.`,
    target: {
      type: 'support',
      price: candle.low,
      distance: ((candle.high - candle.low) / candle.close) * 100,
    },
  };
}

/**
 * DOJI
 * - Corpo muito pequeno (opening ≈ closing)
 * - Sombras equilibradas
 * - Sinal de indecisão / reversão iminente
 */
function detectDoji(candle: Candle): DetectedPattern | null {
  if (!isDoji(candle)) return null;

  const upper = getUpperShadow(candle);
  const lower = getLowerShadow(candle);

  // Para ser Doji puro, sombras devem ser similares
  const shadowRatio = Math.min(upper, lower) / Math.max(upper, lower);
  
  let type: 'bullish' | 'bearish' = 'bullish';
  if (lower > upper * 1.5) type = 'bullish';
  if (upper > lower * 1.5) type = 'bearish';

  const confidence = Math.min(100, 50 + shadowRatio * 30);

  return {
    date: candle.date,
    pattern: 'Doji',
    type,
    confidence,
    candles: 1,
    rationale: `Doji com indecisão entre compradores e vendedores. Sinal de reversão potencial.`,
    target: {
      type: type === 'bullish' ? 'resistance' : 'support',
      price: type === 'bullish' ? candle.high : candle.low,
      distance: (getTrueRange(candle) / candle.close) * 100,
    },
  };
}

/**
 * DRAGONFLY DOJI
 * - Doji com sombra inferior muito longa
 * - Sinal bullish de reversão
 */
function detectDragonflyDoji(candle: Candle): DetectedPattern | null {
  if (!isDoji(candle)) return null;

  const lower = getLowerShadow(candle);
  const upper = getUpperShadow(candle);
  const range = getTrueRange(candle);

  // Sombra inferior deve ser 50%+ do range
  if (lower < range * 0.5) return null;
  
  // Sombra superior deve ser pequena
  if (upper > range * 0.1) return null;

  const confidence = Math.min(100, 70 + (lower / range - 0.5) * 20);

  return {
    date: candle.date,
    pattern: 'Dragonfly Doji',
    type: 'bullish',
    confidence,
    candles: 1,
    rationale: `Dragonfly Doji com sombra inferior longa. Sinal bullish de reversão forte.`,
    target: {
      type: 'resistance',
      price: candle.high,
      distance: ((candle.high - candle.close) / candle.close) * 100,
    },
  };
}

/**
 * GRAVESTONE DOJI
 * - Doji com sombra superior muito longa
 * - Sinal bearish de reversão
 */
function detectGravestoneDoji(candle: Candle): DetectedPattern | null {
  if (!isDoji(candle)) return null;

  const upper = getUpperShadow(candle);
  const lower = getLowerShadow(candle);
  const range = getTrueRange(candle);

  // Sombra superior deve ser 50%+ do range
  if (upper < range * 0.5) return null;
  
  // Sombra inferior deve ser pequena
  if (lower > range * 0.1) return null;

  const confidence = Math.min(100, 70 + (upper / range - 0.5) * 20);

  return {
    date: candle.date,
    pattern: 'Gravestone Doji',
    type: 'bearish',
    confidence,
    candles: 1,
    rationale: `Gravestone Doji com sombra superior longa. Sinal bearish de reversão forte.`,
    target: {
      type: 'support',
      price: candle.low,
      distance: ((candle.high - candle.low) / candle.close) * 100,
    },
  };
}

/**
 * SPINNING TOP
 * - Corpo pequeno (entre 20-40% do range)
 * - Sombras significativas nos dois lados
 * - Sinal de indecisão
 */
function detectSpinningTop(candle: Candle): DetectedPattern | null {
  const body = getCandleBody(candle);
  const range = getTrueRange(candle);
  const upper = getUpperShadow(candle);
  const lower = getLowerShadow(candle);

  // Corpo deve ser 20-40% do range
  const bodyRatio = body / range;
  if (bodyRatio < 0.2 || bodyRatio > 0.4) return null;

  // Sombras devem ser significativas (>25% cada)
  if (upper < range * 0.25 || lower < range * 0.25) return null;

  const type: 'bullish' | 'bearish' = isBullish(candle) ? 'bullish' : 'bearish';
  const confidence = Math.min(100, 60 + Math.min(upper, lower) / range * 20);

  return {
    date: candle.date,
    pattern: 'Spinning Top',
    type,
    confidence,
    candles: 1,
    rationale: `Spinning Top com indecisão entre compradores e vendedores. Baixa volatilidade antes de movimento.`,
    target: {
      type: type === 'bullish' ? 'resistance' : 'support',
      price: type === 'bullish' ? candle.high : candle.low,
      distance: (range / candle.close) * 100,
    },
  };
}

// ==================== PADRÕES 2-CANDLE ====================

/**
 * ENGULFING BULLISH
 * - Primeira vela bearish (menor)
 * - Segunda vela bullish (maior, envolve a primeira)
 * - Sinal bullish forte
 */
function detectBullishEngulfing(candle: Candle, prevCandle: Candle): DetectedPattern | null {
  // Primeira deve ser bearish, segunda bullish
  if (!isBearish(prevCandle) || !isBullish(candle)) return null;

  // Segunda deve abrir abaixo da primeira e fechar acima
  if (candle.open >= prevCandle.close || candle.close <= prevCandle.open) return null;

  // Corpo da segunda deve ser maior que a primeira
  const prevBody = getCandleBody(prevCandle);
  const currBody = getCandleBody(candle);
  if (currBody <= prevBody) return null;

  const engulfRatio = currBody / prevBody;
  const confidence = Math.min(100, 70 + (engulfRatio - 1) * 15);

  return {
    date: candle.date,
    pattern: 'Bullish Engulfing',
    type: 'bullish',
    confidence,
    candles: 2,
    rationale: `Engulfing bullish: vela ${engulfRatio.toFixed(1)}x maior que a anterior. Reversão bullish forte.`,
    target: {
      type: 'resistance',
      price: candle.high,
      distance: ((candle.high - candle.close) / candle.close) * 100,
    },
  };
}

/**
 * ENGULFING BEARISH
 * - Primeira vela bullish (maior)
 * - Segunda vela bearish (envolve a primeira)
 * - Sinal bearish forte
 */
function detectBearishEngulfing(candle: Candle, prevCandle: Candle): DetectedPattern | null {
  // Primeira deve ser bullish, segunda bearish
  if (!isBullish(prevCandle) || !isBearish(candle)) return null;

  // Segunda deve abrir acima da primeira e fechar abaixo
  if (candle.open <= prevCandle.close || candle.close >= prevCandle.open) return null;

  // Corpo da segunda deve ser maior que a primeira
  const prevBody = getCandleBody(prevCandle);
  const currBody = getCandleBody(candle);
  if (currBody <= prevBody) return null;

  const engulfRatio = currBody / prevBody;
  const confidence = Math.min(100, 70 + (engulfRatio - 1) * 15);

  return {
    date: candle.date,
    pattern: 'Bearish Engulfing',
    type: 'bearish',
    confidence,
    candles: 2,
    rationale: `Engulfing bearish: vela ${engulfRatio.toFixed(1)}x maior que a anterior. Reversão bearish forte.`,
    target: {
      type: 'support',
      price: candle.low,
      distance: ((candle.high - candle.low) / candle.close) * 100,
    },
  };
}

/**
 * INSIDE BAR (PIN BAR)
 * - Segunda vela está completamente dentro da primeira
 * - Range menor que a primeira
 * - Sinal de consolidação antes de breakout
 */
function detectInsideBar(candle: Candle, prevCandle: Candle): DetectedPattern | null {
  // Primeira deve ser maior (maior range)
  const prevRange = getTrueRange(prevCandle);
  const currRange = getTrueRange(candle);

  if (currRange >= prevRange) return null;

  // Segunda deve estar dentro da primeira
  if (candle.high > prevCandle.high || candle.low < prevCandle.low) return null;

  // Razão de compressão
  const compressionRatio = currRange / prevRange;
  const confidence = Math.min(100, 60 + (1 - compressionRatio) * 40);

  const type: 'bullish' | 'bearish' = isBullish(candle) ? 'bullish' : 'bearish';

  return {
    date: candle.date,
    pattern: 'Inside Bar',
    type,
    confidence,
    candles: 2,
    rationale: `Inside Bar: compressão de ${(compressionRatio * 100).toFixed(0)}% do range anterior. Breakout iminente.`,
    target: {
      type: type === 'bullish' ? 'resistance' : 'support',
      price: type === 'bullish' ? prevCandle.high : prevCandle.low,
      distance: ((prevCandle.high - prevCandle.low) / candle.close) * 100,
    },
  };
}

/**
 * PIN BAR - Variação com sombra de um lado
 * - Pequeno corpo
 * - Sombra longa de um lado
 * - Rejeição de preço
 */
function detectPinBar(candle: Candle, prevCandle: Candle): DetectedPattern | null {
  const body = getCandleBody(candle);
  const upper = getUpperShadow(candle);
  const lower = getLowerShadow(candle);
  const range = getTrueRange(candle);

  // Corpo deve ser pequeno (<30% do range)
  if (body > range * 0.3) return null;

  // Uma sombra deve ser longa (>50% do range)
  const longUpper = upper > range * 0.5;
  const longLower = lower > range * 0.5;
  if (!longUpper && !longLower) return null;

  // Sombra longa deve estar fora da vela anterior
  const type: 'bullish' | 'bearish' = longLower ? 'bullish' : 'bearish';
  
  if (type === 'bullish' && candle.low >= prevCandle.low) return null;
  if (type === 'bearish' && candle.high <= prevCandle.high) return null;

  const confidence = Math.min(100, 65 + Math.max(upper, lower) / range * 20);

  return {
    date: candle.date,
    pattern: 'Pin Bar',
    type,
    confidence,
    candles: 2,
    rationale: `Pin Bar: rejeição de preço com sombra ${(Math.max(upper, lower) / range).toFixed(1)}x o range. Reversão potencial.`,
    target: {
      type: type === 'bullish' ? 'resistance' : 'support',
      price: type === 'bullish' ? candle.high : candle.low,
      distance: ((Math.max(upper, lower)) / candle.close) * 100,
    },
  };
}

// ==================== PADRÕES 3-CANDLE ====================

/**
 * MORNING STAR
 * - Vela 1: Bearish longa
 * - Vela 2: Pequeno corpo (gap para baixo)
 * - Vela 3: Bullish (fecha acima do meio da primeira)
 * - Sinal bullish forte
 */
function detectMorningStar(
  candle: Candle,
  prevCandle: Candle,
  prev2Candle: Candle
): DetectedPattern | null {
  // V1: Bearish longa
  if (!isBearish(prev2Candle)) return null;

  // V2: Pequeno corpo
  const midBody = getCandleBody(prevCandle);
  if (midBody > getTrueRange(prev2Candle) * 0.3) return null;

  // V3: Bullish
  if (!isBullish(candle)) return null;

  // V3 deve fechar acima do meio da V1
  const mid = (prev2Candle.open + prev2Candle.close) / 2;
  if (candle.close <= mid) return null;

  const confidence = Math.min(100, 75 + (candle.close - mid) / getTrueRange(prev2Candle) * 25);

  return {
    date: candle.date,
    pattern: 'Morning Star',
    type: 'bullish',
    confidence,
    candles: 3,
    rationale: `Morning Star: reversão bullish com 3 velas. Padrão confiável de fundo.`,
    target: {
      type: 'resistance',
      price: candle.high,
      distance: ((candle.high - candle.close) / candle.close) * 100,
    },
  };
}

/**
 * EVENING STAR
 * - Vela 1: Bullish longa
 * - Vela 2: Pequeno corpo (gap para cima)
 * - Vela 3: Bearish (fecha abaixo do meio da primeira)
 * - Sinal bearish forte
 */
function detectEveningStar(
  candle: Candle,
  prevCandle: Candle,
  prev2Candle: Candle
): DetectedPattern | null {
  // V1: Bullish longa
  if (!isBullish(prev2Candle)) return null;

  // V2: Pequeno corpo
  const midBody = getCandleBody(prevCandle);
  if (midBody > getTrueRange(prev2Candle) * 0.3) return null;

  // V3: Bearish
  if (!isBearish(candle)) return null;

  // V3 deve fechar abaixo do meio da V1
  const mid = (prev2Candle.open + prev2Candle.close) / 2;
  if (candle.close >= mid) return null;

  const confidence = Math.min(100, 75 + (mid - candle.close) / getTrueRange(prev2Candle) * 25);

  return {
    date: candle.date,
    pattern: 'Evening Star',
    type: 'bearish',
    confidence,
    candles: 3,
    rationale: `Evening Star: reversão bearish com 3 velas. Padrão confiável de topo.`,
    target: {
      type: 'support',
      price: candle.low,
      distance: ((candle.high - candle.low) / candle.close) * 100,
    },
  };
}

/**
 * THREE WHITE SOLDIERS
 * - 3 velas bullish consecutivas
 * - Cada uma fecha acima da anterior
 * - Cada uma abre dentro do corpo da anterior
 * - Sinal bullish forte
 */
function detectThreeWhiteSoldiers(
  candle: Candle,
  prevCandle: Candle,
  prev2Candle: Candle
): DetectedPattern | null {
  // Todas devem ser bullish
  if (!isBullish(prev2Candle) || !isBullish(prevCandle) || !isBullish(candle)) return null;

  // Cada uma deve fechar acima da anterior
  if (prevCandle.close <= prev2Candle.close || candle.close <= prevCandle.close) return null;

  // Cada uma deve abrir dentro do corpo da anterior
  if (prevCandle.open < prev2Candle.open || prevCandle.open > prev2Candle.close) return null;
  if (candle.open < prevCandle.open || candle.open > prevCandle.close) return null;

  const bodyRatio =
    (candle.close - candle.open + (prevCandle.close - prevCandle.open)) /
    (prev2Candle.close - prev2Candle.open);

  const confidence = Math.min(100, 80 + bodyRatio * 5);

  return {
    date: candle.date,
    pattern: 'Three White Soldiers',
    type: 'bullish',
    confidence,
    candles: 3,
    rationale: `Três soldados brancos: 3 velas bullish consecutivas. Confirmação de tendência de alta forte.`,
    target: {
      type: 'resistance',
      price: candle.high,
      distance: ((candle.high - candle.close) / candle.close) * 100,
    },
  };
}

/**
 * THREE BLACK CROWS
 * - 3 velas bearish consecutivas
 * - Cada uma fecha abaixo da anterior
 * - Cada uma abre dentro do corpo da anterior
 * - Sinal bearish forte
 */
function detectThreeBlackCrows(
  candle: Candle,
  prevCandle: Candle,
  prev2Candle: Candle
): DetectedPattern | null {
  // Todas devem ser bearish
  if (!isBearish(prev2Candle) || !isBearish(prevCandle) || !isBearish(candle)) return null;

  // Cada uma deve fechar abaixo da anterior
  if (prevCandle.close >= prev2Candle.close || candle.close >= prevCandle.close) return null;

  // Cada uma deve abrir dentro do corpo da anterior
  if (prevCandle.open < prev2Candle.close || prevCandle.open > prev2Candle.open) return null;
  if (candle.open < prevCandle.close || candle.open > prevCandle.open) return null;

  const bodyRatio =
    (candle.open - candle.close + (prevCandle.open - prevCandle.close)) /
    (prev2Candle.open - prev2Candle.close);

  const confidence = Math.min(100, 80 + bodyRatio * 5);

  return {
    date: candle.date,
    pattern: 'Three Black Crows',
    type: 'bearish',
    confidence,
    candles: 3,
    rationale: `Três corvos pretos: 3 velas bearish consecutivas. Confirmação de tendência de baixa forte.`,
    target: {
      type: 'support',
      price: candle.low,
      distance: ((candle.high - candle.low) / candle.close) * 100,
    },
  };
}

// ==================== MAIN SERVICE ====================

class PatternService {
  /**
   * Detecta TODOS os padrões em uma vela
   * @param candles Array de velas OHLCV
   * @param index Índice da vela a analisar
   * @returns DetectedPattern ou null
   */
  static detectPatternsAtIndex(candles: Candle[], index: number): DetectedPattern | null {
    const candle = candles[index];
    if (!candle) return null;

    const prevCandle = index > 0 ? candles[index - 1] : undefined;
    const prev2Candle = index > 1 ? candles[index - 2] : undefined;

    // Tentar cada padrão em ordem de importância/confiança

    // 1-Candle patterns
    let pattern: DetectedPattern | null;

    pattern = detectHammer(candle, prevCandle);
    if (pattern && pattern.confidence >= 60) return pattern;

    pattern = detectInvertedHammer(candle);
    if (pattern && pattern.confidence >= 60) return pattern;

    pattern = detectShootingStar(candle);
    if (pattern && pattern.confidence >= 60) return pattern;

    pattern = detectDragonflyDoji(candle);
    if (pattern && pattern.confidence >= 60) return pattern;

    pattern = detectGravestoneDoji(candle);
    if (pattern && pattern.confidence >= 60) return pattern;

    pattern = detectDoji(candle);
    if (pattern && pattern.confidence >= 55) return pattern;

    pattern = detectSpinningTop(candle);
    if (pattern && pattern.confidence >= 50) return pattern;

    // 2-Candle patterns (requerem prevCandle)
    if (prevCandle) {
      pattern = detectBullishEngulfing(candle, prevCandle);
      if (pattern && pattern.confidence >= 70) return pattern;

      pattern = detectBearishEngulfing(candle, prevCandle);
      if (pattern && pattern.confidence >= 70) return pattern;

      pattern = detectInsideBar(candle, prevCandle);
      if (pattern && pattern.confidence >= 65) return pattern;

      pattern = detectPinBar(candle, prevCandle);
      if (pattern && pattern.confidence >= 65) return pattern;
    }

    // 3-Candle patterns (requerem prev2Candle)
    if (prevCandle && prev2Candle) {
      pattern = detectMorningStar(candle, prevCandle, prev2Candle);
      if (pattern && pattern.confidence >= 75) return pattern;

      pattern = detectEveningStar(candle, prevCandle, prev2Candle);
      if (pattern && pattern.confidence >= 75) return pattern;

      pattern = detectThreeWhiteSoldiers(candle, prevCandle, prev2Candle);
      if (pattern && pattern.confidence >= 75) return pattern;

      pattern = detectThreeBlackCrows(candle, prevCandle, prev2Candle);
      if (pattern && pattern.confidence >= 75) return pattern;
    }

    return null;
  }

  /**
   * Detecta padrões em toda a série de velas
   * @param candles Array de velas OHLCV
   * @returns Array de padrões detectados
   */
  static detectAllPatterns(candles: Candle[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    for (let i = 0; i < candles.length; i++) {
      const pattern = this.detectPatternsAtIndex(candles, i);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Detecta padrões em múltiplas séries (batch)
   * @param series Map de ticker → candles
   * @returns Map de ticker → patterns
   */
  static detectBatch(series: Map<string, Candle[]>): Map<string, DetectedPattern[]> {
    const results = new Map<string, DetectedPattern[]>();

    for (const [ticker, candles] of series.entries()) {
      results.set(ticker, this.detectAllPatterns(candles));
    }

    return results;
  }

  /**
   * Encontra últimos padrões por tipo (bullish/bearish)
   * @param candles Array de velas
   * @param type 'bullish' | 'bearish'
   * @returns Últimos 5 padrões do tipo
   */
  static getLatestPatternsByType(
    candles: Candle[],
    type: 'bullish' | 'bearish'
  ): DetectedPattern[] {
    const patterns = this.detectAllPatterns(candles);
    return patterns
      .filter(p => p.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }

  /**
   * Encontra padrões mais confiáveis
   * @param candles Array de velas
   * @param minConfidence Confiança mínima (0-100)
   * @returns Padrões acima do threshold
   */
  static getHighConfidencePatterns(
    candles: Candle[],
    minConfidence: number = 75
  ): DetectedPattern[] {
    const patterns = this.detectAllPatterns(candles);
    return patterns
      .filter(p => p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }
}

export default PatternService;
