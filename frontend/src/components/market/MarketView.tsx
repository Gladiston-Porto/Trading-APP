/**
 * Market Data Display Component (Responsive)
 * 
 * Real-time market data display with charts and watchlists.
 * Mobile-first responsive design:
 * - xs: Stacked layout, collapsible tables
 * - md: Side-by-side market and screener
 * - lg: Full 3-column optimized layout
 */

import React, { useEffect, useState } from 'react';
import { useMarketData, useDebounce } from '../../hooks';
import { ScreenerResult } from '../../types';
import { apiClient } from '../../services/api/client';
import { Card, Grid, Alert } from '../responsive/ResponsiveComponents';

interface MarketViewProps {
  symbols?: string[];
}

export const MarketView: React.FC<MarketViewProps> = ({ symbols = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4'] }) => {
  const { data: marketData, loading, error, refetch } = useMarketData(symbols);
  const [searchTerm, setSearchTerm] = useState('');
  const [screenerResults, setScreenerResults] = useState<ScreenerResult[]>([]);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (!debouncedSearch) {
      setScreenerResults([]);
      return;
    }

    const runScreener = async () => {
      try {
        setScreeningLoading(true);
        const response = await apiClient.post<ScreenerResult[]>(
          '/screener/run',
          { query: debouncedSearch }
        );
        if (response.success && response.data) {
          setScreenerResults(response.data);
        }
      } catch (err: any) {
        console.error('Screener error:', err);
      } finally {
        setScreeningLoading(false);
      }
    };

    runScreener();
  }, [debouncedSearch]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            📈 Market Data
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
            Real-time market quotes and stock screener
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? '⟳ Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          title="Market Data Error"
          message={error}
          onClose={() => {}}
        />
      )}

      {/* Market Data Table */}
      <Card title="📊 Current Quotes">
        {loading && !Object.keys(marketData).length ? (
          <p className="text-center py-8 text-gray-500">Loading market data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">Symbol</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">Price</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white hidden sm:table-cell">Change</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">% Chg</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white hidden md:table-cell">High/Low</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white hidden lg:table-cell">Volume</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(marketData).map(([key, data]) => (
                  <tr key={key} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">
                      {data.symbol}
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 text-right font-semibold text-gray-900 dark:text-white">
                      ${data.price.toFixed(2)}
                    </td>
                    <td className={`py-3 md:py-4 px-2 md:px-4 text-right font-semibold hidden sm:table-cell ${
                      data.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                    </td>
                    <td className={`py-3 md:py-4 px-2 md:px-4 text-right font-bold ${
                      data.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 dark:text-gray-400 hidden md:table-cell text-xs md:text-base">
                      ${data.high.toFixed(2)} / ${data.low.toFixed(2)}
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {data.volume.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stock Screener */}
      <Card title="🔍 Stock Screener">
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search by criteria (e.g., RSI > 70, MACD bullish)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {searchTerm && (
            <div>
              {screeningLoading ? (
                <p className="text-center py-8 text-gray-500">🔄 Screening...</p>
              ) : screenerResults.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No results found</p>
              ) : (
                <Grid cols={{ xs: 1, sm: 2, md: 3 }} gap="gap-4">
                  {screenerResults.map((result: ScreenerResult, idx) => (
                    <Card
                      key={idx}
                      title={result.symbol}
                      hoverable
                    >
                      <div className="space-y-4">
                        {/* Metrics Grid */}
                        <Grid cols={{ xs: 2 }} gap="gap-2">
                          <div className="text-center">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Price</p>
                            <p className="font-bold text-gray-900 dark:text-white text-sm md:text-base">
                              ${result.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">RSI</p>
                            <p className="font-bold text-gray-900 dark:text-white text-sm md:text-base">
                              {result.rsi.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">MACD</p>
                            <p className="font-bold text-gray-900 dark:text-white text-sm md:text-base">
                              {result.macd.toFixed(4)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Score</p>
                            <p className={`font-bold text-sm md:text-base ${
                              result.score >= 80 ? 'text-green-600 dark:text-green-400' :
                              result.score >= 60 ? 'text-blue-600 dark:text-blue-400' :
                              result.score >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {result.score.toFixed(1)}/100
                            </p>
                          </div>
                        </Grid>

                        {/* Matched Patterns */}
                        {result.matchedPatterns.length > 0 && (
                          <div className="pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                              Matched Patterns
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {result.matchedPatterns.map((pattern, i) => (
                                <span
                                  key={i}
                                  className="inline-block px-2 py-1 text-xs md:text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium"
                                >
                                  {pattern}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <button className="w-full px-3 md:px-4 py-2 md:py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base">
                          ⭐ Add to Watch
                        </button>
                      </div>
                    </Card>
                  ))}
                </Grid>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
