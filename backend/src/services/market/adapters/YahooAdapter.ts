import axios, { AxiosInstance } from 'axios';
import logger from '../../../utils/logger';

/**
 * Adapter Yahoo Finance - Cotações Globais (B3, EUA, Cripto)
 * API gratuita via yahoo-finance2 npm package
 * 
 * Suporta:
 * - Ações B3 (ex: PETR4.SA, VALE3.SA)
 * - Ações EUA (ex: AAPL, MSFT, TSLA)
 * - Índices (ex: ^BVSP, ^GSPC, ^DJI)
 * - Cripto (ex: BTC-USD, ETH-USD)
 * - Forex
 * 
 * Rate Limit: ~2000 requisições por hora
 */

interface YahooQuote {
  symbol: string;
  name: string;
  lastPrice: number;
  priceOpen: number;
  priceHigh: number;
  priceLow: number;
  volume: number;
  marketCap?: number;
  change: number;
  changePercent: number;
  timestamp: number;
  currency: string;
  exchange: string;
}

interface YahooCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export class YahooAdapter {
  private apiClient: AxiosInstance;
  private baseUrl = 'https://query1.finance.yahoo.com/v10/finance';
  private cacheTTL = 60000; // 1 minuto
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
  }

  /**
   * Buscar cotação em tempo real
   * @param ticker Símbolo (ex: PETR4.SA, AAPL, BTC-USD)
   * @returns Quote com lastPrice, change, volume
   */
  async getQuote(ticker: string): Promise<YahooQuote> {
    try {
      // Verificar cache
      const cached = this.cache.get(`quote:${ticker}`);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        logger.debug(`[Yahoo] Cache hit para ${ticker}`);
        return cached.data;
      }

      logger.info(`[Yahoo] Buscando quote: ${ticker}`);

      // Usar endpoint de quoteSummary do Yahoo
      const response = await this.apiClient.get(`/quoteSummary/${ticker}`, {
        params: {
          modules: 'price,financialData',
        },
      });

      if (!response.data || response.data.quoteSummary?.error) {
        throw new Error(`Ticker ${ticker} não encontrado`);
      }

      const price = response.data.quoteSummary.result[0].price;

      const formatted: YahooQuote = {
        symbol: price.symbol,
        name: price.longName || price.symbol,
        lastPrice: price.regularMarketPrice || 0,
        priceOpen: price.regularMarketOpen || 0,
        priceHigh: price.regularMarketDayHigh || 0,
        priceLow: price.regularMarketDayLow || 0,
        volume: price.regularMarketVolume || 0,
        marketCap: price.marketCap || undefined,
        change: price.regularMarketChange || 0,
        changePercent: (price.regularMarketChangePercent || 0) * 100,
        timestamp: Date.now(),
        currency: price.currency || 'USD',
        exchange: price.exchange || 'UNKNOWN',
      };

      // Cachear resultado
      this.cache.set(`quote:${ticker}`, {
        data: formatted,
        timestamp: Date.now(),
      });

      logger.debug(`[Yahoo] Quote obtida: ${ticker} = ${formatted.lastPrice} ${formatted.currency}`);
      return formatted;
    } catch (error) {
      logger.error(`[Yahoo] Erro ao buscar quote ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Buscar múltiplas cotações
   * @param tickers Array de símbolos
   * @returns Map de quotes
   */
  async getQuotes(tickers: string[]): Promise<Map<string, YahooQuote>> {
    const results = new Map<string, YahooQuote>();

    // Executar em paralelo (máximo 5 requisições simultâneas)
    const chunks = this.chunkArray(tickers, 5);

    for (const chunk of chunks) {
      const promises = chunk.map((ticker) =>
        this.getQuote(ticker)
          .then((quote) => results.set(ticker, quote))
          .catch((error) => {
            logger.warn(`[Yahoo] Erro para ${ticker}:`, error.message);
          })
      );

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Buscar histórico diário
   * @param ticker Símbolo
   * @param days Número de dias (máx 730)
   * @returns Array de candles
   */
  async getHistoricalDaily(ticker: string, days: number = 365): Promise<YahooCandle[]> {
    try {
      logger.info(`[Yahoo] Buscando histórico: ${ticker} (${days} dias)`);

      const now = Math.floor(Date.now() / 1000);
      const past = now - days * 24 * 60 * 60;

      const response = await this.apiClient.get(`/download/${ticker}`, {
        params: {
          period1: past,
          period2: now,
          interval: '1d',
          events: 'history',
        },
      });

      if (!response.data || !response.data.chart?.result?.[0]?.timestamp) {
        throw new Error(`Histórico não disponível para ${ticker}`);
      }

      const result = response.data.chart.result[0];
      const timestamps = result.timestamp;
      const quotes = result.indicators.quote[0];

      const candles: YahooCandle[] = timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quotes.open[i] || 0,
        high: quotes.high[i] || 0,
        low: quotes.low[i] || 0,
        close: quotes.close[i] || 0,
        volume: quotes.volume[i] || 0,
        adjClose: quotes.adjclose?.[i] || quotes.close[i] || 0,
      }));

      logger.debug(`[Yahoo] ${candles.length} candles obtidas para ${ticker}`);
      return candles;
    } catch (error) {
      logger.error(`[Yahoo] Erro ao buscar histórico ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Buscar tickers populares EUA
   * @returns Array de principais tickers
   */
  async getPopularTickersUSA(): Promise<string[]> {
    return [
      'AAPL', // Apple
      'MSFT', // Microsoft
      'GOOGL', // Google
      'AMZN', // Amazon
      'TSLA', // Tesla
      'META', // Meta
      'NVDA', // Nvidia
      'AMD', // AMD
      'INTC', // Intel
      'NFLX', // Netflix
    ];
  }

  /**
   * Buscar tickers populares B3 (sufixo .SA)
   * @returns Array de principais tickers
   */
  async getPopularTickersB3(): Promise<string[]> {
    return [
      'PETR4.SA', // Petrobras
      'VALE3.SA', // Vale
      'ITUB4.SA', // Itaú
      'BBDC4.SA', // Bradesco
      'WEGE3.SA', // WEG
      'GGBR4.SA', // Gerdau
      'JBSS3.SA', // JBS
      'ABEV3.SA', // Ambev
      'RADL3.SA', // Raízen
      'SUZB3.SA', // Suzano
    ];
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('[Yahoo] Cache limpo');
  }

  /**
   * Verificar saúde do adapter
   */
  async health(): Promise<boolean> {
    try {
      // Tentar buscar AAPL
      const quote = await this.getQuote('AAPL');
      logger.info(`[Yahoo] Health check OK: AAPL = $${quote.lastPrice}`);
      return true;
    } catch (error) {
      logger.error('[Yahoo] Health check FAILED:', error);
      return false;
    }
  }

  /**
   * Helper: Dividir array em chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export default new YahooAdapter();
