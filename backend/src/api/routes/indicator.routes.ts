/**
 * Rotas de Indicadores Técnicos
 *
 * GET  /api/indicators/quote/:ticker         - Quotação com indicadores
 * POST /api/indicators/batch                 - Múltiplos tickers
 * GET  /api/indicators/historical/:ticker    - Série completa
 * POST /api/indicators/calculate             - Calcular customizado
 */

import { Router, Response } from 'express';
import { authMiddleware, rbacMiddleware } from '../middleware/auth.middleware';
import IndicatorService from '../../services/indicator/IndicatorService';
import MarketService from '../../services/market/MarketService';
import logger from '../../utils/logger';

const router: Router = Router();

/**
 * GET /api/indicators/quote/:ticker
 * Retorna cotação atual com indicadores calculados do histórico
 */
router.get(
  '/quote/:ticker',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'TRADER', 'VIEW']),
  async (req: any, res: Response) => {
    try {
      const { ticker } = req.params;

      // Validar ticker
      if (!ticker.match(/^[A-Z0-9.^-]+$/)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Ticker inválido',
        });
      }

      logger.info('Fetching indicator quote', { ticker, userId: req.user?.id });

      // 1. Obter cotação atual
      const quote = await MarketService.getQuote(ticker);

      // 2. Obter histórico (últimos 365 dias)
      const candles = await MarketService.getHistoricalDaily(ticker, 365);

      if (candles.length < 14) {
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_DATA',
          message: 'Histórico insuficiente para calcular indicadores (min 14 candles)',
        });
      }

      // 3. Calcular indicadores
      const indicators = IndicatorService.calculateAll(candles);

      // 4. Extrair últimos valores dos indicadores
      const lastIdx = candles.length - 1;
      const response = {
        success: true,
        data: {
          quote,
          indicators: {
            ema: {
              ema9: indicators.ema.ema9[lastIdx]?.value || null,
              ema21: indicators.ema.ema21[lastIdx]?.value || null,
              ema200: indicators.ema.ema200[lastIdx]?.value || null,
            },
            sma: {
              sma50: indicators.sma.sma50[lastIdx]?.value || null,
              sma200: indicators.sma.sma200[lastIdx]?.value || null,
            },
            rsi: indicators.rsi.rsi[lastIdx]?.value || null,
            macd: {
              value: indicators.macd.macd[lastIdx]?.value || null,
              signal: indicators.macd.signal[lastIdx]?.value || null,
              histogram: indicators.macd.histogram[lastIdx]?.value || null,
            },
            atr: indicators.atr.atr[lastIdx]?.value || null,
            obv: indicators.obv.obv[lastIdx]?.value || null,
            vwap: indicators.vwap.vwap[lastIdx]?.value || null,
          },
          lastUpdate: new Date(candles[lastIdx].date).toISOString(),
        },
      };

      logger.info('Indicator quote fetched successfully', { ticker });
      res.json(response);
    } catch (error) {
      logger.error('Error fetching indicator quote', {
        ticker: req.params.ticker,
        error: (error as Error).message,
      });

      res.status(500).json({
        success: false,
        error: 'INDICATOR_ERROR',
        message: 'Erro ao calcular indicadores',
      });
    }
  }
);

/**
 * POST /api/indicators/batch
 * Retorna indicadores para múltiplos tickers
 */
router.post(
  '/batch',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'TRADER']),
  async (req: any, res: Response) => {
    try {
      // Validar request
      const { tickers } = req.body;
      if (!Array.isArray(tickers) || tickers.length === 0 || tickers.length > 20) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Entre 1 e 20 tickers requeridos',
        });
      }

      logger.info('Fetching batch indicators', { count: tickers.length, userId: req.user?.id });

      // Processar em paralelo
      const results = await Promise.allSettled(
        tickers.map(async (ticker) => {
          const quote = await MarketService.getQuote(ticker);
          const candles = await MarketService.getHistoricalDaily(ticker, 365);

          if (candles.length < 14) {
            return {
              ticker,
              error: 'Histórico insuficiente',
            };
          }

          const indicators = IndicatorService.calculateAll(candles);
          const lastIdx = candles.length - 1;

          return {
            ticker,
            quote,
            indicators: {
              rsi: indicators.rsi.rsi[lastIdx]?.value || null,
              macd: {
                value: indicators.macd.macd[lastIdx]?.value || null,
                histogram: indicators.macd.histogram[lastIdx]?.value || null,
              },
              ema9: indicators.ema.ema9[lastIdx]?.value || null,
              atr: indicators.atr.atr[lastIdx]?.value || null,
            },
          };
        })
      );

      // Filtrar successos e erros
      const successful = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value);

      logger.info('Batch indicators fetched', { count: successful.length });

      res.json({
        success: true,
        count: successful.length,
        data: successful,
      });
    } catch (error) {
      logger.error('Error fetching batch indicators', {
        error: (error as Error).message,
      });

      res.status(500).json({
        success: false,
        error: 'INDICATOR_ERROR',
        message: 'Erro ao calcular indicadores',
      });
    }
  }
);

/**
 * GET /api/indicators/historical/:ticker
 * Retorna série histórica completa de indicadores
 */
router.get(
  '/historical/:ticker',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'TRADER']),
  async (req: any, res: Response) => {
    try {
      const { ticker } = req.params;
      const { days = 365 } = req.query;

      // Validar
      if (!ticker.match(/^[A-Z0-9.^-]+$/)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Ticker inválido',
        });
      }

      const numDays = Math.min(Math.max(parseInt(String(days)) || 365, 1), 730);

      logger.info('Fetching indicator historical', { ticker, days: numDays });

      // 1. Obter histórico
      const candles = await MarketService.getHistoricalDaily(ticker, numDays);

      if (candles.length < 14) {
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_DATA',
          message: 'Histórico insuficiente',
        });
      }

      // 2. Calcular indicadores
      const indicators = IndicatorService.calculateAll(candles);

      // 3. Combinar em uma série
      const series = candles.map((candle, idx) => ({
        date: candle.date,
        price: candle.close,
        volume: candle.volume,
        ema: {
          ema9: indicators.ema.ema9[idx]?.value || null,
          ema21: indicators.ema.ema21[idx]?.value || null,
          ema200: indicators.ema.ema200[idx]?.value || null,
        },
        rsi: indicators.rsi.rsi[idx]?.value || null,
        macd: {
          value: indicators.macd.macd[idx]?.value || null,
          signal: indicators.macd.signal[idx]?.value || null,
          histogram: indicators.macd.histogram[idx]?.value || null,
        },
        atr: indicators.atr.atr[idx]?.value || null,
        obv: indicators.obv.obv[idx]?.value || null,
        vwap: indicators.vwap.vwap[idx]?.value || null,
      }));

      logger.info('Indicator historical fetched', { ticker, count: series.length });

      res.json({
        success: true,
        ticker,
        count: series.length,
        data: series,
      });
    } catch (error) {
      logger.error('Error fetching indicator historical', {
        ticker: req.params.ticker,
        error: (error as Error).message,
      });

      res.status(500).json({
        success: false,
        error: 'INDICATOR_ERROR',
        message: 'Erro ao obter histórico de indicadores',
      });
    }
  }
);

/**
 * POST /api/indicators/calculate
 * Calcula indicadores customizados
 */
router.post(
  '/calculate',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'TRADER']),
  async (req: any, res: Response) => {
    try {
      const { ticker, days = 365, indicators: requestedIndicators } = req.body;

      if (!requestedIndicators || !Array.isArray(requestedIndicators)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'indicators array requerido',
        });
      }

      const numDays = Math.min(Math.max(days || 365, 1), 730);

      logger.info('Custom indicator calculation', {
        ticker,
        days: numDays,
        indicators: requestedIndicators,
      });

      // Obter histórico
      const candles = await MarketService.getHistoricalDaily(ticker, numDays);

      if (candles.length < 14) {
        return res.status(400).json({
          success: false,
          error: 'INSUFFICIENT_DATA',
          message: 'Histórico insuficiente',
        });
      }

      // Calcular todos
      const allIndicators = IndicatorService.calculateAll(candles);

      // Filtrar apenas solicitados
      const result: Record<string, any> = { success: true, ticker };

      if (requestedIndicators.includes('ema')) {
        result.ema = allIndicators.ema;
      }
      if (requestedIndicators.includes('sma')) {
        result.sma = allIndicators.sma;
      }
      if (requestedIndicators.includes('rsi')) {
        result.rsi = allIndicators.rsi;
      }
      if (requestedIndicators.includes('macd')) {
        result.macd = allIndicators.macd;
      }
      if (requestedIndicators.includes('atr')) {
        result.atr = allIndicators.atr;
      }
      if (requestedIndicators.includes('obv')) {
        result.obv = allIndicators.obv;
      }
      if (requestedIndicators.includes('vwap')) {
        result.vwap = allIndicators.vwap;
      }

      logger.info('Custom indicators calculated', { ticker, count: candles.length });

      res.json(result);
    } catch (error) {
      logger.error('Error calculating custom indicators', {
        error: (error as Error).message,
      });

      res.status(500).json({
        success: false,
        error: 'INDICATOR_ERROR',
        message: 'Erro ao calcular indicadores',
      });
    }
  }
);

export default router;
