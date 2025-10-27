/**
 * IndicatorService - Serviço de Indicadores Técnicos
 *
 * Implementa indicadores técnicos puros (sem side effects):
 * - EMA (Exponential Moving Average): 9, 21, 200 períodos
 * - SMA (Simple Moving Average): 50, 200 períodos
 * - RSI (Relative Strength Index): 14 períodos
 * - MACD (Moving Average Convergence Divergence): 12, 26, 9
 * - ATR (Average True Range): 14 períodos
 * - OBV (On-Balance Volume)
 * - VWAP (Volume Weighted Average Price)
 *
 * Todos os métodos são puros (sem cache/DB) - caller é responsável por cache
 */

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorValue {
  date: string;
  value: number | null;
}

interface EMASeries {
  ema9: IndicatorValue[];
  ema21: IndicatorValue[];
  ema200: IndicatorValue[];
}

interface SMASeries {
  sma50: IndicatorValue[];
  sma200: IndicatorValue[];
}

interface MACDSeries {
  macd: IndicatorValue[];
  signal: IndicatorValue[];
  histogram: IndicatorValue[];
}

interface RSISeries {
  rsi: IndicatorValue[];
}

interface ATRSeries {
  atr: IndicatorValue[];
}

interface OBVSeries {
  obv: IndicatorValue[];
}

interface VWAPSeries {
  vwap: IndicatorValue[];
}

class IndicatorService {
  /**
   * Calcula EMA para múltiplos períodos
   *
   * EMA = (Close - EMA_anterior) * multiplier + EMA_anterior
   * multiplier = 2 / (period + 1)
   *
   * @param candles - Array de candles (deve estar em ordem cronológica ASC)
   * @returns EMASeries com ema9, ema21, ema200
   */
  static calculateEMA(candles: Candle[]): EMASeries {
    const ema9 = this.calculateEMAPeriod(candles, 9);
    const ema21 = this.calculateEMAPeriod(candles, 21);
    const ema200 = this.calculateEMAPeriod(candles, 200);

    return { ema9, ema21, ema200 };
  }

  private static calculateEMAPeriod(candles: Candle[], period: number): IndicatorValue[] {
    if (candles.length === 0) return [];

    const result: IndicatorValue[] = [];
    const multiplier = 2 / (period + 1);
    let ema: number | null = null;

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];

      if (i < period - 1) {
        // Primeiros period-1 candles: return null
        result.push({ date: candle.date, value: null });
      } else if (i === period - 1) {
        // No período-ésimo candle: calcular SMA simples
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += candles[j].close;
        }
        ema = sum / period;
        result.push({ date: candle.date, value: ema });
      } else {
        // Após período: aplicar fórmula EMA
        if (ema !== null) {
          ema = (candle.close - ema) * multiplier + ema;
        }
        result.push({ date: candle.date, value: ema });
      }
    }

    return result;
  }

  /**
   * Calcula SMA para múltiplos períodos
   *
   * SMA = SUM(close, period) / period
   *
   * @param candles - Array de candles
   * @returns SMASeries com sma50, sma200
   */
  static calculateSMA(candles: Candle[]): SMASeries {
    const sma50 = this.calculateSMAPeriod(candles, 50);
    const sma200 = this.calculateSMAPeriod(candles, 200);

    return { sma50, sma200 };
  }

  private static calculateSMAPeriod(candles: Candle[], period: number): IndicatorValue[] {
    if (candles.length === 0) return [];

    const result: IndicatorValue[] = [];

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        // Primeiros period-1 candles: return null
        result.push({ date: candles[i].date, value: null });
      } else {
        // Calcular SMA
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += candles[j].close;
        }
        const sma = sum / period;
        result.push({ date: candles[i].date, value: sma });
      }
    }

    return result;
  }

  /**
   * Calcula RSI (Relative Strength Index)
   *
   * RSI = 100 - (100 / (1 + RS))
   * RS = Average Gain / Average Loss
   *
   * @param candles - Array de candles
   * @param period - Período (default 14)
   * @returns RSISeries
   */
  static calculateRSI(candles: Candle[], period: number = 14): RSISeries {
    if (candles.length < period + 1) {
      return { rsi: candles.map(c => ({ date: c.date, value: null })) };
    }

    const result: IndicatorValue[] = [];
    let avgGain = 0;
    let avgLoss = 0;

    // Calcular ganhos e perdas iniciais
    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) {
        avgGain += change;
      } else {
        avgLoss += Math.abs(change);
      }
    }

    avgGain /= period;
    avgLoss /= period;

    // Primeiros candles: null
    for (let i = 0; i <= period; i++) {
      result.push({ date: candles[i].date, value: null });
    }

    // Calcular RSI para resto dos candles
    for (let i = period + 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      result.push({ date: candles[i].date, value: rsi });
    }

    return { rsi: result };
  }

  /**
   * Calcula MACD (Moving Average Convergence Divergence)
   *
   * MACD = EMA12 - EMA26
   * Signal = EMA9(MACD)
   * Histogram = MACD - Signal
   *
   * @param candles - Array de candles
   * @returns MACDSeries com macd, signal, histogram
   */
  static calculateMACD(candles: Candle[]): MACDSeries {
    if (candles.length < 26) {
      return {
        macd: candles.map(c => ({ date: c.date, value: null })),
        signal: candles.map(c => ({ date: c.date, value: null })),
        histogram: candles.map(c => ({ date: c.date, value: null })),
      };
    }

    // Calcular EMA12 e EMA26
    const ema12 = this.calculateEMAPeriod(candles, 12);
    const ema26 = this.calculateEMAPeriod(candles, 26);

    // Calcular MACD line
    const macdLine: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (ema12[i].value !== null && ema26[i].value !== null) {
        macdLine.push(ema12[i].value! - ema26[i].value!);
      } else {
        macdLine.push(NaN);
      }
    }

    // Calcular Signal line (EMA9 do MACD)
    const signalLine: (number | null)[] = [];
    const multiplier = 2 / (9 + 1);
    let signalEma: number | null = null;

    for (let i = 0; i < macdLine.length; i++) {
      if (isNaN(macdLine[i])) {
        signalLine.push(null);
      } else if (signalEma === null && i >= 8) {
        // Primeiro valor válido: média simples dos primeiros 9
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - 8); j <= i; j++) {
          if (!isNaN(macdLine[j])) {
            sum += macdLine[j];
            count++;
          }
        }
        signalEma = count > 0 ? sum / count : null;
        signalLine.push(signalEma);
      } else if (signalEma !== null) {
        signalEma = (macdLine[i] - signalEma) * multiplier + signalEma;
        signalLine.push(signalEma);
      } else {
        signalLine.push(null);
      }
    }

    // Calcular Histogram
    const histogram: (number | null)[] = [];
    for (let i = 0; i < macdLine.length; i++) {
      if (!isNaN(macdLine[i]) && signalLine[i] !== null) {
        histogram.push(macdLine[i] - (signalLine[i] as number));
      } else {
        histogram.push(null);
      }
    }

    return {
      macd: candles.map((c, i) => ({
        date: c.date,
        value: isNaN(macdLine[i]) ? null : macdLine[i],
      })),
      signal: candles.map((c, i) => ({
        date: c.date,
        value: signalLine[i],
      })),
      histogram: candles.map((c, i) => ({
        date: c.date,
        value: histogram[i],
      })),
    };
  }

  /**
   * Calcula ATR (Average True Range)
   *
   * TR = MAX(high - low, ABS(high - close_prev), ABS(low - close_prev))
   * ATR = SMA(TR, period)
   *
   * @param candles - Array de candles
   * @param period - Período (default 14)
   * @returns ATRSeries
   */
  static calculateATR(candles: Candle[], period: number = 14): ATRSeries {
    if (candles.length < period) {
      return { atr: candles.map(c => ({ date: c.date, value: null })) };
    }

    const result: IndicatorValue[] = [];
    const trValues: number[] = [];

    // Calcular True Range para cada candle
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      let tr: number;

      if (i === 0) {
        tr = candle.high - candle.low;
      } else {
        const prevClose = candles[i - 1].close;
        const tr1 = candle.high - candle.low;
        const tr2 = Math.abs(candle.high - prevClose);
        const tr3 = Math.abs(candle.low - prevClose);
        tr = Math.max(tr1, tr2, tr3);
      }

      trValues.push(tr);

      if (i < period - 1) {
        result.push({ date: candle.date, value: null });
      } else if (i === period - 1) {
        // Primeira ATR: SMA dos primeiros `period` TRs
        const sum = trValues.reduce((a, b) => a + b, 0);
        const atr = sum / period;
        result.push({ date: candle.date, value: atr });
      } else {
        // ATR subsequentes: (ATR_prev * (period-1) + TR_atual) / period
        const prevAtr = (result[i - 1].value || 0) * (period - 1);
        const atr = (prevAtr + tr) / period;
        result.push({ date: candle.date, value: atr });
      }
    }

    return { atr: result };
  }

  /**
   * Calcula OBV (On-Balance Volume)
   *
   * OBV = OBV_anterior + volume (se close > close_anterior)
   * OBV = OBV_anterior - volume (se close < close_anterior)
   * OBV = OBV_anterior (se close == close_anterior)
   *
   * @param candles - Array de candles
   * @returns OBVSeries
   */
  static calculateOBV(candles: Candle[]): OBVSeries {
    if (candles.length === 0) return { obv: [] };

    const result: IndicatorValue[] = [];
    let obv = 0;

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];

      if (i === 0) {
        obv = candle.volume;
      } else {
        const prevClose = candles[i - 1].close;
        if (candle.close > prevClose) {
          obv += candle.volume;
        } else if (candle.close < prevClose) {
          obv -= candle.volume;
        }
      }

      result.push({ date: candle.date, value: obv });
    }

    return { obv: result };
  }

  /**
   * Calcula VWAP (Volume Weighted Average Price)
   *
   * VWAP = CUM(TP * Volume) / CUM(Volume)
   * TP = (high + low + close) / 3
   *
   * @param candles - Array de candles
   * @returns VWAPSeries
   */
  static calculateVWAP(candles: Candle[]): VWAPSeries {
    if (candles.length === 0) return { vwap: [] };

    const result: IndicatorValue[] = [];
    let cumTPVolume = 0;
    let cumVolume = 0;

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const tp = (candle.high + candle.low + candle.close) / 3;

      cumTPVolume += tp * candle.volume;
      cumVolume += candle.volume;

      const vwap = cumVolume > 0 ? cumTPVolume / cumVolume : tp;
      result.push({ date: candle.date, value: vwap });
    }

    return { vwap: result };
  }

  /**
   * Calcula todos os indicadores de uma vez
   *
   * @param candles - Array de candles
   * @returns Objeto com todos os indicadores
   */
  static calculateAll(candles: Candle[]) {
    return {
      ema: this.calculateEMA(candles),
      sma: this.calculateSMA(candles),
      rsi: this.calculateRSI(candles),
      macd: this.calculateMACD(candles),
      atr: this.calculateATR(candles),
      obv: this.calculateOBV(candles),
      vwap: this.calculateVWAP(candles),
    };
  }
}

export default IndicatorService;
export type {
  Candle,
  IndicatorValue,
  EMASeries,
  SMASeries,
  RSISeries,
  MACDSeries,
  ATRSeries,
  OBVSeries,
  VWAPSeries,
};
