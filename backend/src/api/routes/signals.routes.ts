/**
 * Trading Signals Routes
 * Endpoints para geração de sinais de trading
 * 
 * Base path: /api/signals
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import ConfluenceEngine, { TradingSignal, IndicatorValues } from '../../services/confluence/ConfluenceEngine';
import IndicatorService from '../../services/indicator/IndicatorService';
import PatternService from '../../services/pattern/PatternService';
import MarketService from '../../services/market/MarketService';
import logger from '../../utils/logger';

const router = Router();

/**
 * Adapta a saída do IndicatorService (arrays de IndicatorValue)
 * para o formato esperado pelo ConfluenceEngine (valores escalares)
 */
function adaptIndicatorsToConfluence(indicatorResults: any, candles: any[]): IndicatorValues {
  const lastIndex = candles.length - 1;
  
  return {
    ema9: indicatorResults.ema.ema9[lastIndex]?.value || 0,
    ema21: indicatorResults.ema.ema21[lastIndex]?.value || 0,
    ema200: indicatorResults.ema.ema200[lastIndex]?.value || 0,
    sma50: indicatorResults.sma.sma50[lastIndex]?.value || 0,
    sma200: indicatorResults.sma.sma200[lastIndex]?.value || 0,
    rsi14: indicatorResults.rsi.rsi[lastIndex]?.value || 0,
    macd: {
      macd: indicatorResults.macd.macd[lastIndex]?.value || 0,
      signal: indicatorResults.macd.signal[lastIndex]?.value || 0,
      histogram: indicatorResults.macd.histogram[lastIndex]?.value || 0,
    },
    atr14: indicatorResults.atr.atr[lastIndex]?.value || 0,
    obv: indicatorResults.obv.obv[lastIndex]?.value || 0,
    vwap: indicatorResults.vwap.vwap[lastIndex]?.value || 0,
  };
}

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

/**
 * POST /api/signals/generate/:ticker
 * Gera sinal de trading para um ativo
 * 
 * Query params:
 * - days: número de dias (default: 30)
 * - minConfidence: confiança mínima 0-100 (default: 60)
 */
router.post('/generate/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const minConfidence = parseInt(req.query.minConfidence as string) || 60;

    logger.info('Signal generation requested', {
      ticker,
      days,
      minConfidence,
    });

    // Validações
    if (!ticker || ticker.length === 0) {
      return res.status(400).json({ error: 'Ticker é obrigatório' });
    }

    if (minConfidence < 0 || minConfidence > 100) {
      return res.status(400).json({ error: 'minConfidence deve estar entre 0 e 100' });
    }

    // 1. Buscar dados históricos
    const candles = await MarketService.getHistoricalDaily(ticker, days);

    if (!candles || candles.length === 0) {
      logger.warn('No candles found for ticker', { ticker, days });
      return res.status(404).json({ error: `Nenhum dado histórico encontrado para ${ticker}` });
    }

    // 2. Calcular indicadores
    const indicatorResults = IndicatorService.calculateAll(candles);
    const indicators = adaptIndicatorsToConfluence(indicatorResults, candles);

    // 3. Detectar padrões
    const patterns = PatternService.detectAllPatterns(candles);

    // 4. Gerar sinal
    const signal = ConfluenceEngine.generateSignal(ticker, candles, indicators, patterns);

    // 5. Filtrar por confiança
    if (signal.confidence < minConfidence) {
      logger.info('Signal confidence below threshold', {
        ticker,
        confidence: signal.confidence,
        threshold: minConfidence,
      });
      return res.status(200).json({
        ticker,
        message: 'Confiança abaixo do limite',
        signal,
        threshold: minConfidence,
      });
    }

    logger.info('Signal generated successfully', {
      ticker,
      direction: signal.direction,
      confidence: signal.confidence,
      strength: signal.strength,
    });

    res.json({
      ticker,
      date: new Date().toISOString(),
      signal,
      summary: {
        direction: signal.direction,
        confidence: signal.confidence,
        strength: signal.strength,
        entryPrice: candles[candles.length - 1].close,
        stopLoss: signal.riskReward.stopLoss,
        takeProfit: signal.riskReward.takeProfit,
        riskRewardRatio: signal.riskReward.riskRewardRatio,
      },
    });
  } catch (error) {
    logger.error('Signal generation failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao gerar sinal de trading' });
  }
});

/**
 * POST /api/signals/scan-all
 * Escaneia múltiplos ativos e retorna sinais
 * 
 * Body:
 * {
 *   "tickers": ["PETR4", "VALE3"],
 *   "days": 30,
 *   "minConfidence": 60,
 *   "filterByStrength": "MEDIUM" | "STRONG" | null
 * }
 */
router.post('/scan-all', async (req: Request, res: Response) => {
  try {
    const {
      tickers,
      days = 30,
      minConfidence = 60,
      filterByStrength = null,
    } = req.body;

    logger.info('Bulk signal scan requested', {
      tickersCount: tickers?.length,
      days,
      minConfidence,
      filterByStrength,
    });

    // Validações
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'tickers deve ser um array não-vazio' });
    }

    if (tickers.length > 50) {
      return res.status(400).json({ error: 'Máximo de 50 ativos por requisição' });
    }

    if (minConfidence < 0 || minConfidence > 100) {
      return res.status(400).json({ error: 'minConfidence deve estar entre 0 e 100' });
    }

    // Processar cada ticker em paralelo
    const signalResults = await Promise.all(
      tickers.map(async (ticker: string) => {
        try {
          const candles = await MarketService.getHistoricalDaily(ticker, days);

          if (!candles || candles.length === 0) {
            return {
              ticker,
              error: 'Nenhum dado encontrado',
              signal: null,
            };
          }

          const indicatorResults = IndicatorService.calculateAll(candles);
          const indicators = adaptIndicatorsToConfluence(indicatorResults, candles);
          const patterns = PatternService.detectAllPatterns(candles);
          const signal = ConfluenceEngine.generateSignal(
            ticker,
            candles,
            indicators,
            patterns
          );

          return {
            ticker,
            signal:
              signal.confidence >= minConfidence
                ? signal
                : null,
            confidence: signal.confidence,
            direction: signal.direction,
          };
        } catch (tickerError) {
          logger.warn('Scan failed for ticker', {
            ticker,
            error: (tickerError as Error).message,
          });
          return {
            ticker,
            error: 'Erro ao processar',
            signal: null,
          };
        }
      })
    );

    // Filtrar sinais válidos
    let validSignals = signalResults.filter((r) => r.signal !== null);

    // Aplicar filtro de força se especificado
    if (filterByStrength) {
      validSignals = validSignals.filter(
        (r) => r.signal && r.signal.strength === filterByStrength
      );
    }

    // Ordenar por confiança (decrescente)
    validSignals.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    // Calcular estatísticas
    const signals = validSignals.map((r) => r.signal).filter(Boolean) as TradingSignal[];
    const stats = ConfluenceEngine.calculateStats(signals);

    logger.info('Bulk signal scan completed', {
      tickersRequested: tickers.length,
      signalsGenerated: validSignals.length,
      buySignals: stats.buyCount,
      sellSignals: stats.sellCount,
      strongSignals: stats.strongCount,
    });

    res.json({
      date: new Date().toISOString(),
      requestedTickers: tickers.length,
      signalsGenerated: validSignals.length,
      signals: validSignals.map((r) => ({
        ticker: r.ticker,
        ...r.signal,
      })),
      stats,
      filterApplied: {
        minConfidence,
        filterByStrength: filterByStrength || 'none',
      },
    });
  } catch (error) {
    logger.error('Bulk scan failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao processar requisição em lote' });
  }
});

/**
 * POST /api/signals/history
 * Retorna histórico de sinais gerados
 * 
 * Body:
 * {
 *   "ticker": "PETR4",
 *   "startDate": "2025-01-01",
 *   "endDate": "2025-01-14",
 *   "minStrength": "MEDIUM"
 * }
 */
router.post('/history', async (req: Request, res: Response) => {
  try {
    const { ticker, startDate, endDate, minStrength = 'WEAK' } = req.body;

    logger.info('Signal history requested', {
      ticker,
      startDate,
      endDate,
      minStrength,
    });

    // Validações
    if (!ticker) {
      return res.status(400).json({ error: 'ticker é obrigatório' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate e endDate são obrigatórios' });
    }

    // Calcular dias entre as datas
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 1 || daysDiff > 365) {
      return res.status(400).json({
        error: 'Intervalo deve estar entre 1 e 365 dias',
      });
    }

    logger.info('Generating historical signals', {
      ticker,
      daysDiff,
    });

    // Buscar dados históricos para o período
    const candles = await MarketService.getHistoricalDaily(ticker, daysDiff);

    if (!candles || candles.length === 0) {
      return res.status(404).json({ error: `Nenhum dado encontrado para ${ticker}` });
    }

    // Gerar sinais para cada período (simulado - em produção seria do DB)
    const indicatorResults = IndicatorService.calculateAll(candles);
    const indicators = adaptIndicatorsToConfluence(indicatorResults, candles);
    const patterns = PatternService.detectAllPatterns(candles);

    // Gerar sinal final com dados completos
    const signal = ConfluenceEngine.generateSignal(ticker, candles, indicators, patterns);

    // Simular histórico (em produção viria do DB)
    const historicalSignals = [signal];

    // Filtrar por força
    const strengthOrder = { WEAK: 1, MEDIUM: 2, STRONG: 3 };
    const filtered = historicalSignals.filter(
      (s) => strengthOrder[s.strength] >= strengthOrder[minStrength as keyof typeof strengthOrder]
    );

    logger.info('Historical signals retrieved', {
      ticker,
      period: `${startDate} a ${endDate}`,
      signalsCount: filtered.length,
    });

    res.json({
      ticker,
      period: { start: startDate, end: endDate },
      totalCandles: candles.length,
      signals: filtered,
      summary: {
        total: filtered.length,
        buy: filtered.filter((s) => s.direction === 'BUY').length,
        sell: filtered.filter((s) => s.direction === 'SELL').length,
        neutral: filtered.filter((s) => s.direction === 'NEUTRAL').length,
        avgConfidence:
          filtered.length > 0
            ? Math.round(
                filtered.reduce((sum, s) => sum + s.confidence, 0) / filtered.length
              )
            : 0,
      },
    });
  } catch (error) {
    logger.error('History retrieval failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao recuperar histórico de sinais' });
  }
});

/**
 * GET /api/signals/info
 * Informações sobre o motor de sinais
 */
router.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: 'ConfluenceEngine',
    version: '1.0.0',
    description: 'Motor de geração de sinais de trading via confluência de indicadores e padrões',
    components: {
      indicators: ['EMA', 'SMA', 'RSI', 'MACD', 'ATR', 'OBV', 'VWAP'],
      patterns: [
        'Hammer',
        'Doji',
        'Engulfing',
        'Inside Bar',
        'Pin Bar',
        'Morning Star',
        'Evening Star',
        'Three Soldiers',
        'Three Crows',
      ],
    },
    scoring: {
      trendWeight: 0.35,
      momentumWeight: 0.25,
      patternWeight: 0.2,
      volumeWeight: 0.15,
      volatilityWeight: 0.05,
    },
    directions: ['BUY', 'SELL', 'NEUTRAL'],
    strengths: ['WEAK', 'MEDIUM', 'STRONG'],
    endpoints: {
      generate: 'POST /api/signals/generate/:ticker',
      scanAll: 'POST /api/signals/scan-all',
      history: 'POST /api/signals/history',
      info: 'GET /api/signals/info',
    },
  });
});

export default router;
