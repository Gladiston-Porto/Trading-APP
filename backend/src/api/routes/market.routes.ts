import { Router, Request, Response } from 'express';
import { authMiddleware, rbacMiddleware, validateDto } from '../../middleware/auth.middleware';
import MarketService from '../../../services/market/MarketService';
import logger from '../../../utils/logger';
import Joi from 'joi';

const marketRouter = Router();

/**
 * Validação de DTOs
 */
const getQuoteSchema = Joi.object({
  ticker: Joi.string()
    .required()
    .min(1)
    .max(10)
    .message('Ticker inválido'),
});

const getQuotesSchema = Joi.object({
  tickers: Joi.array()
    .items(Joi.string().min(1).max(10))
    .required()
    .min(1)
    .max(20)
    .message('Array de tickers inválido (min 1, max 20)'),
});

const getHistoricalSchema = Joi.object({
  ticker: Joi.string()
    .required()
    .min(1)
    .max(10),
  days: Joi.number()
    .optional()
    .default(365)
    .min(1)
    .max(730)
    .message('Dias deve ser entre 1 e 730'),
});

/**
 * GET /api/market/quote/:ticker
 * Obter cotação atual de um ticker
 * 
 * @param ticker - Símbolo do ticker (ex: PETR4, AAPL, BTC-USD)
 * @returns QuoteData com lastPrice, change, volume
 */
marketRouter.get(
  '/quote/:ticker',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'TRADER', 'VIEW']),
  async (req: any, res: Response) => {
    try {
      const { ticker } = req.params;

      // Validar ticker
      const { error, value } = getQuoteSchema.validate({ ticker });
      if (error) {
        res.status(400).json({
          error: 'Ticker inválido',
          code: 'VALIDATION_ERROR',
          details: { ticker: error.message },
        });
        return;
      }

      logger.info(`[MarketRoute] GET /quote/${value.ticker} por ${req.user.email}`);

      const quote = await MarketService.getQuote(value.ticker);

      res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (error) {
      logger.error('[MarketRoute] Erro em GET /quote:', error);
      res.status(500).json({
        error: 'Erro ao obter cotação',
        code: 'MARKET_ERROR',
      });
    }
  }
);

/**
 * POST /api/market/quotes
 * Obter múltiplas cotações
 * 
 * @body { tickers: string[] }
 * @returns Array<QuoteData>
 */
marketRouter.post(
  '/quotes',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'TRADER', 'VIEW']),
  validateDto(getQuotesSchema),
  async (req: any, res: Response) => {
    try {
      const { tickers } = req.body;

      logger.info(
        `[MarketRoute] POST /quotes (${tickers.length} tickers) por ${req.user.email}`
      );

      const quotes = await MarketService.getQuotes(tickers);

      res.status(200).json({
        success: true,
        count: quotes.length,
        data: quotes,
      });
    } catch (error) {
      logger.error('[MarketRoute] Erro em POST /quotes:', error);
      res.status(500).json({
        error: 'Erro ao obter cotações',
        code: 'MARKET_ERROR',
      });
    }
  }
);

/**
 * GET /api/market/historical/:ticker
 * Obter histórico diário (com cache local)
 * 
 * @param ticker - Símbolo
 * @query days - Número de dias (default: 365)
 * @returns Array<CandleData>
 */
marketRouter.get(
  '/historical/:ticker',
  authMiddleware,
  rbacMiddleware(['ADMIN', 'TRADER']), // Apenas TRADER+ pode ver histórico
  async (req: any, res: Response) => {
    try {
      const { ticker } = req.params;
      const { days } = req.query;

      // Validar
      const { error, value } = getHistoricalSchema.validate({
        ticker,
        days: days ? parseInt(days as string) : undefined,
      });

      if (error) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          code: 'VALIDATION_ERROR',
          details: { message: error.message },
        });
        return;
      }

      logger.info(
        `[MarketRoute] GET /historical/${value.ticker} (${value.days} dias) por ${req.user.email}`
      );

      const candles = await MarketService.getHistoricalDaily(value.ticker, value.days);

      res.status(200).json({
        success: true,
        ticker: value.ticker,
        days: value.days,
        count: candles.length,
        data: candles,
      });
    } catch (error) {
      logger.error('[MarketRoute] Erro em GET /historical:', error);
      res.status(500).json({
        error: 'Erro ao obter histórico',
        code: 'MARKET_ERROR',
      });
    }
  }
);

/**
 * GET /api/market/health
 * Health check dos data providers
 * 
 * @returns { brapi, yahoo, overall }
 */
marketRouter.get(
  '/health',
  authMiddleware,
  rbacMiddleware(['ADMIN']), // Apenas ADMIN
  async (req: any, res: Response) => {
    try {
      logger.debug('[MarketRoute] GET /health');

      const health = await MarketService.health();

      const allHealthy = health.overall ? 200 : 503;

      res.status(allHealthy).json({
        success: health.overall,
        data: {
          brapi: health.brapi ? '✅ OK' : '❌ DOWN',
          yahoo: health.yahoo ? '✅ OK' : '❌ DOWN',
          overall: health.overall ? '✅ OK' : '❌ DEGRADED',
        },
      });
    } catch (error) {
      logger.error('[MarketRoute] Erro em GET /health:', error);
      res.status(503).json({
        success: false,
        error: 'Health check falhou',
      });
    }
  }
);

/**
 * POST /api/market/cache/clear
 * Limpar cache de data providers
 * 
 * @returns { success: true }
 */
marketRouter.post(
  '/cache/clear',
  authMiddleware,
  rbacMiddleware(['ADMIN']), // Apenas ADMIN
  async (req: any, res: Response) => {
    try {
      logger.warn('[MarketRoute] POST /cache/clear por ADMIN');

      MarketService.clearCache();

      res.status(200).json({
        success: true,
        message: 'Cache limpo com sucesso',
      });
    } catch (error) {
      logger.error('[MarketRoute] Erro em POST /cache/clear:', error);
      res.status(500).json({
        error: 'Erro ao limpar cache',
        code: 'MARKET_ERROR',
      });
    }
  }
);

export default marketRouter;
