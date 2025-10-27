/**
 * Pattern Detection Routes
 * Endpoints para detecção de padrões candlestick
 * 
 * Base path: /api/patterns
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import PatternService, { Candle } from '../../services/pattern/PatternService';
import MarketService from '../../services/market/MarketService';
import logger from '../../utils/logger';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

/**
 * GET /api/patterns/scan/:ticker
 * Escaneia padrões candlestick para um ativo
 * 
 * Query params:
 * - days: número de dias (default: 30)
 * - minConfidence: confiança mínima 0-100 (default: 60)
 */
router.get('/scan/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    const minConfidence = parseInt(req.query.minConfidence as string) || 60;

    logger.info('Pattern scan requested', {
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

    // Buscar dados históricos
    const candles = await MarketService.getHistoricalDaily(ticker, days);

    if (!candles || candles.length === 0) {
      logger.warn('No candles found for ticker', { ticker, days });
      return res.status(404).json({ error: `Nenhum dado histórico encontrado para ${ticker}` });
    }

    // Detectar padrões com filtro de confiança
    const allPatterns = PatternService.detectAllPatterns(candles);
    const filteredPatterns = allPatterns.filter(p => p.confidence >= minConfidence);

    // Ordenar por data (mais recente primeiro)
    const sortedPatterns = filteredPatterns.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    logger.info('Pattern scan completed', {
      ticker,
      totalCandles: candles.length,
      patternsDetected: allPatterns.length,
      patternsFiltered: filteredPatterns.length,
    });

    res.json({
      ticker,
      date: new Date().toISOString(),
      candles: candles.length,
      patterns: sortedPatterns,
      summary: {
        total: filteredPatterns.length,
        bullish: filteredPatterns.filter(p => p.type === 'bullish').length,
        bearish: filteredPatterns.filter(p => p.type === 'bearish').length,
        avgConfidence: filteredPatterns.length > 0
          ? Math.round(filteredPatterns.reduce((sum, p) => sum + p.confidence, 0) / filteredPatterns.length)
          : 0,
      },
    });
  } catch (error) {
    logger.error('Pattern scan failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao escanear padrões' });
  }
});

/**
 * POST /api/patterns/batch
 * Escaneia padrões para múltiplos ativos
 * 
 * Body:
 * {
 *   "tickers": ["PETR4", "VALE3"],
 *   "days": 30,
 *   "minConfidence": 60
 * }
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { tickers, days = 30, minConfidence = 60 } = req.body;

    logger.info('Batch pattern scan requested', {
      tickersCount: tickers?.length,
      days,
      minConfidence,
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
    const results = await Promise.all(
      tickers.map(async (ticker: string) => {
        try {
          const candles = await MarketService.getHistoricalDaily(ticker, days);

          if (!candles || candles.length === 0) {
            return {
              ticker,
              error: 'Nenhum dado encontrado',
              patterns: [],
            };
          }

          const allPatterns = PatternService.detectAllPatterns(candles);
          const filteredPatterns = allPatterns.filter(p => p.confidence >= minConfidence);

          return {
            ticker,
            candles: candles.length,
            patterns: filteredPatterns,
            summary: {
              total: filteredPatterns.length,
              bullish: filteredPatterns.filter(p => p.type === 'bullish').length,
              bearish: filteredPatterns.filter(p => p.type === 'bearish').length,
            },
          };
        } catch (tickerError) {
          logger.warn('Batch scan failed for ticker', {
            ticker,
            error: (tickerError as Error).message,
          });
          return {
            ticker,
            error: 'Erro ao processar',
            patterns: [],
          };
        }
      })
    );

    logger.info('Batch pattern scan completed', {
      tickersRequested: tickers.length,
      tickersProcessed: results.length,
    });

    res.json({
      date: new Date().toISOString(),
      requestedTickers: tickers.length,
      results,
    });
  } catch (error) {
    logger.error('Batch scan failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao processar requisição em lote' });
  }
});

/**
 * POST /api/patterns/analyze
 * Analisa padrões de um conjunto custom de candles
 * 
 * Body:
 * {
 *   "candles": [
 *     { "date": "2025-01-01", "open": 100, "high": 105, "low": 95, "close": 102, "volume": 1000000 }
 *   ],
 *   "minConfidence": 60
 * }
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { candles, minConfidence = 60 } = req.body;

    logger.info('Custom pattern analysis requested', {
      candlesCount: candles?.length,
      minConfidence,
    });

    // Validações
    if (!Array.isArray(candles) || candles.length === 0) {
      return res.status(400).json({ error: 'candles deve ser um array não-vazio' });
    }

    if (candles.length > 5000) {
      return res.status(400).json({ error: 'Máximo de 5000 candles por requisição' });
    }

    // Validar estrutura dos candles
    const validCandles = candles.every(
      c => c.date && typeof c.open === 'number' && typeof c.high === 'number' &&
           typeof c.low === 'number' && typeof c.close === 'number' && typeof c.volume === 'number'
    );

    if (!validCandles) {
      return res.status(400).json({
        error: 'Candles inválidos. Requerido: date, open, high, low, close, volume',
      });
    }

    // Detectar padrões
    const allPatterns = PatternService.detectAllPatterns(candles);
    const filteredPatterns = allPatterns.filter(p => p.confidence >= minConfidence);

    // Ordenar por confiança (decrescente)
    const sortedPatterns = filteredPatterns.sort((a, b) => b.confidence - a.confidence);

    logger.info('Pattern analysis completed', {
      totalCandles: candles.length,
      patternsDetected: allPatterns.length,
      patternsFiltered: filteredPatterns.length,
    });

    res.json({
      date: new Date().toISOString(),
      candles: candles.length,
      patterns: sortedPatterns,
      summary: {
        total: filteredPatterns.length,
        bullish: filteredPatterns.filter(p => p.type === 'bullish').length,
        bearish: filteredPatterns.filter(p => p.type === 'bearish').length,
        avgConfidence: filteredPatterns.length > 0
          ? Math.round(filteredPatterns.reduce((sum, p) => sum + p.confidence, 0) / filteredPatterns.length)
          : 0,
        topPattern: sortedPatterns[0] || null,
      },
    });
  } catch (error) {
    logger.error('Pattern analysis failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao analisar padrões' });
  }
});

/**
 * GET /api/patterns/types
 * Retorna lista de padrões suportados
 */
router.get('/types', (req: Request, res: Response) => {
  const patternTypes = {
    '1-candle': [
      'Hammer',
      'Inverted Hammer',
      'Shooting Star',
      'Doji',
      'Dragonfly Doji',
      'Gravestone Doji',
      'Spinning Top',
    ],
    '2-candle': [
      'Bullish Engulfing',
      'Bearish Engulfing',
      'Inside Bar',
      'Pin Bar',
    ],
    '3-candle': [
      'Morning Star',
      'Evening Star',
      'Three White Soldiers',
      'Three Black Crows',
    ],
  };

  res.json({
    patterns: patternTypes,
    total: Object.values(patternTypes).reduce((sum, arr) => sum + arr.length, 0),
  });
});

export default router;
