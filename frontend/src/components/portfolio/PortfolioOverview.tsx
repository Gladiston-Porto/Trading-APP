/**
 * Portfolio Overview Component (Responsive)
 * 
 * Displays portfolio summary, positions, metrics, and performance.
 * Mobile-first responsive design:
 * - xs: Stacked metric cards (1 column)
 * - sm: 2-column grid
 * - md: 3-column grid
 * - lg: 6-column grid for full metrics view
 */

import React, { useEffect, useState } from 'react';
import { Portfolio, Position, PortfolioMetrics } from '../../types';
import { apiClient } from '../../services/api/client';
import { Card, Grid, MetricCard, ResponsiveChart } from '../responsive/ResponsiveComponents';

interface PortfolioOverviewProps {
  portfolioId: string;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ portfolioId }) => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<Portfolio>(`/portfolios/${portfolioId}`);
        if (response.success && response.data) {
          setPortfolio(response.data);
          
          // Fetch metrics
          const metricsResponse = await apiClient.get<PortfolioMetrics>(
            `/portfolios/${portfolioId}/metrics`
          );
          if (metricsResponse.success && metricsResponse.data) {
            setMetrics(metricsResponse.data);
          }
        } else {
          setError(response.error?.message || 'Failed to fetch portfolio');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading portfolio');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [portfolioId]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <Card>
          <p className="text-center py-8 text-gray-500">Loading portfolio...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <Card className="border-2 border-red-500 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </Card>
      </div>
    );
  }

  if (!portfolio || !metrics) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <Card>
          <p className="text-center py-8 text-gray-500">Portfolio not found</p>
        </Card>
      </div>
    );
  }

  const profitIsPositive = metrics.profit >= 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          {portfolio.name}
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
          Portfolio ID: {portfolioId}
        </p>
      </div>

      {/* Metrics Grid - Responsive 1→2→3→6 columns */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">
          📊 Portfolio Metrics
        </h2>
        <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 3 }} gap="gap-4">
          <MetricCard
            label="Total Value"
            value={`$${metrics.totalValue.toFixed(2)}`}
            trend={0}
          />
          <MetricCard
            label="Cash Available"
            value={`$${metrics.cash.toFixed(2)}`}
            trend={0}
          />
          <MetricCard
            label="Invested"
            value={`$${metrics.invested.toFixed(2)}`}
            trend={0}
          />
          <MetricCard
            label="Total Profit"
            value={`$${metrics.profit.toFixed(2)}`}
            trend={profitIsPositive ? metrics.profitPercent : -metrics.profitPercent}
            status={profitIsPositive ? 'positive' : 'negative'}
          />
          <MetricCard
            label="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            trend={0}
          />
          <MetricCard
            label="Max Drawdown"
            value={`${metrics.maxDrawdown.toFixed(2)}%`}
            trend={0}
          />
        </Grid>
      </div>

      {/* Open Positions Section */}
      <Card title="📈 Open Positions">
        {portfolio.positions.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No open positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="text-left py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">Symbol</th>
                  <th className="text-left py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white hidden sm:table-cell">Type</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">Qty</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white hidden md:table-cell">Avg Price</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">Price</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white hidden lg:table-cell">Profit</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">%</th>
                  <th className="text-right py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((position: Position) => (
                  <tr key={position.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-3 md:py-4 px-2 md:px-4 font-bold text-gray-900 dark:text-white">
                      {position.symbol}
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 hidden sm:table-cell">
                      <span className={`inline-block px-2 py-1 text-xs md:text-sm font-medium rounded ${
                        position.type.toLowerCase() === 'long'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {position.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 dark:text-gray-400">
                      {position.quantity}
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      ${position.averagePrice.toFixed(2)}
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 text-right text-gray-900 dark:text-white font-semibold">
                      ${position.currentPrice.toFixed(2)}
                    </td>
                    <td className={`py-3 md:py-4 px-2 md:px-4 text-right font-semibold hidden lg:table-cell ${
                      position.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${position.profit.toFixed(2)}
                    </td>
                    <td className={`py-3 md:py-4 px-2 md:px-4 text-right font-bold ${
                      position.profitPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {position.profitPercent >= 0 ? '+' : ''}{position.profitPercent.toFixed(2)}%
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-4 text-right">
                      <div className="flex flex-col sm:flex-row gap-1 md:gap-2">
                        <button className="px-2 md:px-3 py-1 md:py-2 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 font-semibold rounded text-xs md:text-sm transition-colors">
                          Edit
                        </button>
                        <button className="px-2 md:px-3 py-1 md:py-2 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 font-semibold rounded text-xs md:text-sm transition-colors">
                          Close
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Performance Chart Placeholder */}
      <Card title="📉 Performance">
        <ResponsiveChart
          type="area"
          data={[
            { name: 'Jan', value: metrics.totalValue * 0.85 },
            { name: 'Feb', value: metrics.totalValue * 0.90 },
            { name: 'Mar', value: metrics.totalValue * 0.88 },
            { name: 'Apr', value: metrics.totalValue * 0.95 },
            { name: 'May', value: metrics.totalValue * 1.02 },
            { name: 'Jun', value: metrics.totalValue },
          ]}
          dataKey="value"
          xAxisKey="name"
          title="Portfolio Value Over Time"
          height={300}
          colors={['#3b82f6']}
          showLegend={false}
        />
      </Card>
    </div>
  );
};
