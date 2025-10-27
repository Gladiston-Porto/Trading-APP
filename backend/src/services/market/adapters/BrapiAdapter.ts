import axios, { AxiosInstance } from 'axios';
import logger from '../../../utils/logger';

/**
 * Adapter Brapi - Cotações B3 (Bolsa Brasileira)
 * API gratuita sem API key: https://brapi.dev
 * 
 * Suporta:
 * - Ações B3 (ex: PETR4, VALE3, GGBR4)
 * - Índices (ex: ^BVSP - Ibovespa)
 * - Cripto em BRL
 * 
 * Rate Limit: ~60 requisições por minuto
 */

interface BrapiQuote {
  symbol: string;
  name: string;
  lastPrice: number;
  priceClose: number;
  priceOpen: number;
  priceHigh: number;
  priceLow: number;
  volume: number;
  marketCap: number;
  change: number;
  changePercent: number;
  timestamp: number;
  currency?: string;
}

interface BrapiCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class BrapiAdapter {
  private apiClient: AxiosInstance;
  private baseUrl = 'https://brapi.dev/api';
  private cacheTTL = 60000; // 1 minuto
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'User-Agent': 'TradingApp/1.0',
      },
    });
  }

  /**
   * Buscar cotação em tempo real (melhor esforço, gratuito)
   * @param ticker Símbolo (ex: PETR4, VALE3, ^BVSP)
   * @returns Quote com lastPrice, change, volume
   */
  async getQuote(ticker: string): Promise<BrapiQuote> {
    try {
      // Verificar cache
      const cached = this.cache.get(`quote:${ticker}`);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        logger.debug(`[Brapi] Cache hit para ${ticker}`);
        return cached.data;
      }

      logger.info(`[Brapi] Buscando quote: ${ticker}`);

      const response = await this.apiClient.get(`/quote/${ticker}`);

      if (!response.data || response.data.results.length === 0) {
        throw new Error(`Ticker ${ticker} não encontrado`);
      }

      const quote = response.data.results[0];

      const formatted: BrapiQuote = {
        symbol: quote.symbol,
        name: quote.name || quote.symbol,
        lastPrice: quote.lastPrice || 0,
        priceClose: quote.priceClose || quote.lastPrice || 0,
        priceOpen: quote.priceOpen || 0,
        priceHigh: quote.priceHigh || 0,
        priceLow: quote.priceLow || 0,
        volume: quote.volume || 0,
        marketCap: quote.marketCap || 0,
        change: quote.change || 0,
        changePercent: quote.changepercent || 0,
        timestamp: Date.now(),
        currency: 'BRL',
      };

      // Cachear resultado
      this.cache.set(`quote:${ticker}`, {
        data: formatted,
        timestamp: Date.now(),
      });

      logger.debug(`[Brapi] Quote obtida: ${ticker} = R$ ${formatted.lastPrice}`);
      return formatted;
    } catch (error) {
      logger.error(`[Brapi] Erro ao buscar quote ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Buscar múltiplas cotações
   * @param tickers Array de símbolos
   * @returns Map de quotes
   */
  async getQuotes(tickers: string[]): Promise<Map<string, BrapiQuote>> {
    const results = new Map<string, BrapiQuote>();

    // Executar em paralelo (máximo 5 requisições simultâneas)
    const chunks = this.chunkArray(tickers, 5);

    for (const chunk of chunks) {
      const promises = chunk.map((ticker) =>
        this.getQuote(ticker)
          .then((quote) => results.set(ticker, quote))
          .catch((error) => {
            logger.warn(`[Brapi] Erro para ${ticker}:`, error.message);
          })
      );

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Buscar histórico diário (últimos 30 dias aprox)
   * Nota: Brapi free não tem histórico completo
   * Alternativa: Usar Yahoo para histórico
   * @param ticker Símbolo
   * @returns Array de candles
   */
  async getHistoricalDaily(ticker: string): Promise<BrapiCandle[]> {
    try {
      logger.warn(`[Brapi] getHistoricalDaily não suportado. Use Yahoo para histórico`);
      return [];
    } catch (error) {
      logger.error(`[Brapi] Erro ao buscar histórico:`, error);
      return [];
    }
  }

  /**
   * Buscar tickers populares B3
   * @returns Array de principais tickers
   */
  async getPopularTickers(): Promise<string[]> {
    // Lista hardcoded dos principais ativos B3
    return [
      'PETR4', // Petrobras
      'VALE3', // Vale
      'ITUB4', // Itaú
      'BBDC4', // Bradesco
      'WEGE3', // WEG
      'GGBR4', // Gerdau
      'JBSS3', // JBS
      'ABEV3', // Ambev
      'RADL3', // Raízen
      'SUZB3', // Suzano
      '^BVSP', // Ibovespa
    ];
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('[Brapi] Cache limpo');
  }

  /**
   * Verificar saúde do adapter
   */
  async health(): Promise<boolean> {
    try {
      // Tentar buscar Ibovespa
      const quote = await this.getQuote('^BVSP');
      logger.info(`[Brapi] Health check OK: ^BVSP = ${quote.lastPrice}`);
      return true;
    } catch (error) {
      logger.error('[Brapi] Health check FAILED:', error);
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

export default new BrapiAdapter();
