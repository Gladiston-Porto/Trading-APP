/**
 * Main Dashboard Component (Responsive)
 * 
 * Central hub displaying:
 * - Market overview (responsive grid: 1→2→4 columns)
 * - Portfolio summary (adaptive layout)
 * - Active strategies (cards on mobile, grid on desktop)
 * - Recent alerts (full width on mobile, cards on desktop)
 * - Key metrics (responsive metric cards)
 * 
 * Mobile-First Design:
 * - xs: Single column, stacked cards
 * - md: 2-column layout
 * - lg: 4-column layout with full details
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMarketData, useStrategy, useAlerts } from '../../hooks';
import { MarketData, Strategy, Alert } from '../../types';
import { Card, Grid, MetricCard } from '../responsive/ResponsiveComponents';

interface DashboardMetrics {
  portfolioValue: number;
  totalGain: number;
  gainPercent: number;
  activeStrategies: number;
  openPositions: number;
  recentAlerts: number;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'strategies' | 'portfolio' | 'alerts'>('overview');

  // Fetch data
  const { data: marketData, loading: marketLoading } = useMarketData(['PETR4', 'VALE3', 'ITUB4']);
  const { strategies, loading: strategiesLoading, fetchAll: fetchStrategies } = useStrategy();
  const { alerts, statistics, loading: alertsLoading, fetchAlerts, fetchStatistics } = useAlerts();

  // Initialize data
  useEffect(() => {
    fetchStrategies({ limit: 10 });
    fetchAlerts({ limit: 10 });
    fetchStatistics();
  }, []);

  // Calculate metrics
  useEffect(() => {
    const activeStrategies = strategies.filter(s => s.active).length;
    const totalGain = Object.values(marketData).reduce((sum, d) => sum + (d.price * d.changePercent / 100), 0);
    
    setMetrics({
      portfolioValue: Object.values(marketData).reduce((sum, d) => sum + d.price, 0),
      totalGain,
      gainPercent: (totalGain / Object.values(marketData).length) * 100,
      activeStrategies,
      openPositions: strategies.length,
      recentAlerts: alerts.length,
    });
  }, [marketData, strategies, alerts]);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const tabItems = [
    { id: 'overview' as const, label: '📊 Overview' },
    { id: 'strategies' as const, label: '🎯 Strategies' },
    { id: 'portfolio' as const, label: '💼 Portfolio' },
    { id: 'alerts' as const, label: '🔔 Alerts' },
  ];

  return (
    <div className="w-full">
      {/* Header - Responsive */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 lg:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Trading Dashboard
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              Welcome, {user?.name}!
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-4 py-2 bg-red-600 dark:bg-red-700 text-white font-semibold rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200 text-sm md:text-base"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation - Responsive */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="px-4 md:px-6 lg:px-8">
          {/* Mobile: Scrollable tabs */}
          <div className="flex gap-2 md:gap-4 overflow-x-auto md:overflow-x-visible py-0">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`
                  px-4 py-3 md:py-4 font-semibold text-sm md:text-base whitespace-nowrap transition-colors
                  border-b-2 border-transparent
                  ${selectedTab === tab.id
                    ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Responsive */}
      <main className="px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6 md:space-y-8">
            {/* Metrics Grid - Responsive (1 → 2 → 4 columns) */}
            <Grid
              cols={{ xs: 1, sm: 2, lg: 4 }}
              gap="gap-4"
            >
              <MetricCard
                value={`$${metrics?.portfolioValue.toFixed(2) || '0'}`}
                label="Portfolio Value"
                trend={metrics ? (metrics.totalGain >= 0 ? metrics.gainPercent : -metrics.gainPercent) : 0}
              />
              <MetricCard
                value={`${metrics?.totalGain.toFixed(2) || '0'} (${metrics?.gainPercent.toFixed(2) || '0'}%)`}
                label="Total Gain"
                trend={metrics ? (metrics.totalGain >= 0 ? metrics.gainPercent : -metrics.gainPercent) : 0}
              />
              <MetricCard
                value={metrics?.activeStrategies || 0}
                label="Active Strategies"
                trend={0}
              />
              <MetricCard
                value={metrics?.openPositions || 0}
                label="Open Positions"
                trend={0}
              />
            </Grid>

            {/* Market Data Card */}
            <Card title="Market Data" subtitle={new Date().toLocaleDateString()}>
              {marketLoading ? (
                <div className="flex justify-center items-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">Loading market data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="text-left py-3 px-2 font-semibold text-gray-900 dark:text-white">Symbol</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900 dark:text-white">Price</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900 dark:text-white hidden sm:table-cell">Change</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900 dark:text-white">% Change</th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-900 dark:text-white hidden md:table-cell">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {Object.entries(marketData).map(([symbol, data]: [string, MarketData]) => (
                        <tr key={symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="py-3 px-2 font-semibold text-gray-900 dark:text-white">{data.symbol}</td>
                          <td className="text-right py-3 px-2 text-gray-700 dark:text-gray-300">${data.price.toFixed(2)}</td>
                          <td className={`text-right py-3 px-2 hidden sm:table-cell ${data.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                          </td>
                          <td className={`text-right py-3 px-2 font-semibold ${data.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                          </td>
                          <td className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 hidden md:table-cell">{data.volume.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Strategies Tab */}
        {selectedTab === 'strategies' && (
          <div>
            {strategiesLoading ? (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-600 dark:text-gray-400">Loading strategies...</p>
              </div>
            ) : strategies.length === 0 ? (
              <Card title="Strategies">
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No strategies yet. Create one to get started.
                </p>
              </Card>
            ) : (
              <Grid cols={{ xs: 1, md: 2, lg: 3 }} gap="gap-4">
                {strategies.map((strategy: Strategy) => (
                  <Card key={strategy.id} title={strategy.name} hoverable>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {strategy.description}
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Win Rate</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {(strategy.winRate * 100).toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Profit Factor</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {strategy.profitFactor.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Status</p>
                        <p className={`font-semibold ${strategy.active ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {strategy.active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button className="flex-1 px-3 py-2 text-sm bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                        Edit
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm bg-gray-600 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                        Backtest
                      </button>
                    </div>
                  </Card>
                ))}
              </Grid>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {selectedTab === 'portfolio' && (
          <Card title="Portfolio">
            <p className="text-center text-gray-600 dark:text-gray-400 py-8">
              Portfolio management coming soon...
            </p>
          </Card>
        )}

        {/* Alerts Tab */}
        {selectedTab === 'alerts' && (
          <div className="space-y-6">
            {statistics && (
              <Grid cols={{ xs: 1, sm: 3 }} gap="gap-4">
                <MetricCard
                  value={statistics.totalAlerts}
                  label="Total Alerts"
                  trend={0}
                />
                <MetricCard
                  value={`${(statistics.successRate * 100).toFixed(2)}%`}
                  label="Success Rate"
                  trend={(statistics.successRate * 100) - 70}
                />
                <MetricCard
                  value={statistics.last24h.sent}
                  label="Sent (24h)"
                  trend={0}
                />
              </Grid>
            )}

            {alertsLoading ? (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-600 dark:text-gray-400">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <Card title="Alerts">
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No alerts configured.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert: Alert) => (
                  <Card key={alert.id}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{alert.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            alert.priority === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                            alert.priority === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                            'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          }`}>
                            {alert.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {alert.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {alert.channels.map(channel => (
                            <span key={channel} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded">
                              {channel}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={`text-sm font-semibold px-3 py-1 rounded whitespace-nowrap ${
                        alert.enabled 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {alert.enabled ? '✓ Enabled' : '✗ Disabled'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
