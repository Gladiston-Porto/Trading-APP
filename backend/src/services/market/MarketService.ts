import BrapiAdapter from './adapters/BrapiAdapter';
import YahooAdapter from './adapters/YahooAdapter';
import prisma from '../../config/prisma';
import logger from '../../utils/logger';

/**
 * MarketService - Orquestradora de Data Providers
 * 
 * Estratégia:
 * 1. Para B3: Tentar Brapi primeiro (gratuito), fallback para Yahoo (.SA)
 * 2. Para EUA: Usar Yahoo Finance
 * 3. Cache local com Prisma Candle
 * 4. Atualiza a cada 60 segundos (durante pregão)
 */

export interface QuoteData {
  symbol: string;
  name: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  currency: string;
  timestamp: number;
  source: 'BRAPI' | 'YAHOO';
}

export interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class MarketService {
  /**
   * Obter cotação melhor esforço (tenta Brapi, fallback Yahoo)
   * @param ticker Símbolo (ex: PETR4 para B3, AAPL para EUA)
   * @returns Quote com fonte
   */
  async getQuote(ticker: string): Promise<QuoteData> {
    try {
      // Detectar se é B3 ou EUA
      const isB3 = !ticker.includes('.') && ticker.match(/^[A-Z]{4}\d$/);

      if (isB3) {
        logger.debug(`[MarketService] ${ticker} detectado como B3`);
        return await this.getQuoteB3(ticker);
      } else {
        logger.debug(`[MarketService] ${ticker} detectado como EUA/Global`);
        return await this.getQuoteUSA(ticker);
      }
    } catch (error) {
      logger.error(`[MarketService] Erro ao obter quote ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Obter cotação B3 (Brapi → Yahoo fallback)
   */
  private async getQuoteB3(ticker: string): Promise<QuoteData> {
    try {
      // Tentar Brapi (gratuito, rápido)
      const brapiQuote = await BrapiAdapter.getQuote(ticker);
      return {
        symbol: brapiQuote.symbol,
        name: brapiQuote.name,
        lastPrice: brapiQuote.lastPrice,
        change: brapiQuote.change,
        changePercent: brapiQuote.changePercent,
        volume: brapiQuote.volume,
        currency: brapiQuote.currency || 'BRL',
        timestamp: brapiQuote.timestamp,
        source: 'BRAPI',
      };
    } catch (brapiError) {
      logger.warn(`[MarketService] Brapi falhou para ${ticker}, tentando Yahoo...`);

      // Fallback para Yahoo (.SA suffix)
      const yahooTicker = `${ticker}.SA`;
      const yahooQuote = await YahooAdapter.getQuote(yahooTicker);
      return {
        symbol: yahooQuote.symbol,
        name: yahooQuote.name,
        lastPrice: yahooQuote.lastPrice,
        change: yahooQuote.change,
        changePercent: yahooQuote.changePercent,
        volume: yahooQuote.volume,
        currency: yahooQuote.currency || 'BRL',
        timestamp: yahooQuote.timestamp,
        source: 'YAHOO',
      };
    }
  }

  /**
   * Obter cotação EUA/Global (sempre Yahoo)
   */
  private async getQuoteUSA(ticker: string): Promise<QuoteData> {
    const yahooQuote = await YahooAdapter.getQuote(ticker);
    return {
      symbol: yahooQuote.symbol,
      name: yahooQuote.name,
      lastPrice: yahooQuote.lastPrice,
      change: yahooQuote.change,
      changePercent: yahooQuote.changePercent,
      volume: yahooQuote.volume,
      currency: yahooQuote.currency || 'USD',
      timestamp: yahooQuote.timestamp,
      source: 'YAHOO',
    };
  }

  /**
   * Obter múltiplas cotações
   */
  async getQuotes(tickers: string[]): Promise<QuoteData[]> {
    const quotes: QuoteData[] = [];

    // Separar B3 e EUA
    const b3Tickers = tickers.filter((t) => !t.includes('.') && t.match(/^[A-Z]{4}\d$/));
    const usaTickers = tickers.filter((t) => !b3Tickers.includes(t));

    // Buscar B3 via Brapi
    if (b3Tickers.length > 0) {
      try {
        const brapiQuotes = await BrapiAdapter.getQuotes(b3Tickers);
        brapiQuotes.forEach((quote, ticker) => {
          quotes.push({
            symbol: quote.symbol,
            name: quote.name,
            lastPrice: quote.lastPrice,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            currency: quote.currency || 'BRL',
            timestamp: quote.timestamp,
            source: 'BRAPI',
          });
        });
      } catch (error) {
        logger.warn('[MarketService] Erro ao buscar B3 via Brapi:', error);
      }
    }

    // Buscar EUA/Global via Yahoo
    if (usaTickers.length > 0) {
      try {
        const yahooQuotes = await YahooAdapter.getQuotes(usaTickers);
        yahooQuotes.forEach((quote, ticker) => {
          quotes.push({
            symbol: quote.symbol,
            name: quote.name,
            lastPrice: quote.lastPrice,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            currency: quote.currency || 'USD',
            timestamp: quote.timestamp,
            source: 'YAHOO',
          });
        });
      } catch (error) {
        logger.warn('[MarketService] Erro ao buscar EUA/Global via Yahoo:', error);
      }
    }

    return quotes;
  }

  /**
   * Obter histórico diário com cache Prisma
   * @param ticker Símbolo
   * @param days Número de dias
   * @returns Array de candles
   */
  async getHistoricalDaily(ticker: string, days: number = 365): Promise<CandleData[]> {
    try {
      logger.info(`[MarketService] Buscando histórico: ${ticker} (${days} dias)`);

      // Buscar Candle do Prisma (cache local)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Buscar ticker no Prisma
      let tickerRecord = await prisma.ticker.findUnique({
        where: { symbol: ticker },
      });

      if (!tickerRecord) {
        // Criar ticker se não existir
        const quote = await this.getQuote(ticker);
        tickerRecord = await prisma.ticker.create({
          data: {
            symbol: ticker,
            name: quote.name,
            exchange: ticker.includes('.SA') ? 'B3' : ticker.includes('-') ? 'CRYPTO' : 'NASDAQ',
            currency: quote.currency,
          },
        });
      }

      // Buscar candles do cache
      const cachedCandles = await prisma.candle.findMany({
        where: {
          tickerId: tickerRecord.id,
          timestamp: {
            gte: startDate,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      // Se temos 80%+ dos dados, retornar cache
      const expectedCandles = Math.floor(days * 0.7); // ~252 dias úteis por ano
      if (cachedCandles.length >= expectedCandles * 0.8) {
        logger.debug(`[MarketService] ${cachedCandles.length} candles do cache para ${ticker}`);
        return cachedCandles.map((c) => ({
          date: c.timestamp.toISOString().split('T')[0],
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));
      }

      // Buscar histórico da API
      logger.debug(`[MarketService] Buscando histórico da API para ${ticker}`);
      const isB3 = !ticker.includes('.') && ticker.match(/^[A-Z]{4}\d$/);
      let candles: CandleData[];

      if (isB3) {
        try {
          candles = await BrapiAdapter.getHistoricalDaily(ticker);
          if (candles.length === 0) {
            // Fallback para Yahoo
            candles = await YahooAdapter.getHistoricalDaily(`${ticker}.SA`, days);
          }
        } catch (error) {
          logger.warn(`[MarketService] Brapi falhou, usando Yahoo para ${ticker}`);
          candles = await YahooAdapter.getHistoricalDaily(`${ticker}.SA`, days);
        }
      } else {
        candles = await YahooAdapter.getHistoricalDaily(ticker, days);
      }

      // Armazenar no Prisma (cache)
      for (const candle of candles) {
        const timestamp = new Date(`${candle.date}T00:00:00Z`);

        // Não duplicar se já existe
        const exists = await prisma.candle.findUnique({
          where: {
            tickerId_timestamp_timeframe: {
              tickerId: tickerRecord.id,
              timestamp,
              timeframe: '1d',
            },
          },
        });

        if (!exists) {
          await prisma.candle.create({
            data: {
              tickerId: tickerRecord.id,
              timestamp,
              timeframe: '1d',
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
            },
          });
        }
      }

      logger.info(`[MarketService] ${candles.length} candles cachadas para ${ticker}`);
      return candles;
    } catch (error) {
      logger.error(`[MarketService] Erro ao buscar histórico ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Health check dos adapters
   */
  async health(): Promise<{
    brapi: boolean;
    yahoo: boolean;
    overall: boolean;
  }> {
    const [brapiHealth, yahooHealth] = await Promise.all([
      BrapiAdapter.health(),
      YahooAdapter.health(),
    ]);

    return {
      brapi: brapiHealth,
      yahoo: yahooHealth,
      overall: brapiHealth || yahooHealth,
    };
  }

  /**
   * Limpar cache de ambos adapters
   */
  clearCache(): void {
    BrapiAdapter.clearCache();
    YahooAdapter.clearCache();
    logger.info('[MarketService] Todos os caches limpos');
  }
}

export default new MarketService();
