/**
 * Responsive Dashboard Component
 * 
 * Mobile-first responsive design:
 * - Mobile (xs): Single column, simplified layout
 * - Tablet (md): 2-column grid
 * - Desktop (lg): 4-column grid with full details
 */

import React, { useState } from 'react';
import { useBreakpoint } from '../Layout';
import {
  Card,
  MetricCard,
  Alert,
} from '../responsive/ResponsiveComponents';
import { useMarketData, useStrategy, useAlerts } from '../../hooks';

export const ResponsiveDashboard: React.FC = () => {
  const breakpoint = useBreakpoint();
  const { data: marketData, loading: marketLoading } = useMarketData(['PETR4', 'VALE3', 'ITUB4']);
  const { strategies, loading: strategiesLoading } = useStrategy();
  const { alerts, statistics, loading: alertsLoading } = useAlerts();
  const [activeTab, setActiveTab] = useState<'overview' | 'strategies' | 'alerts'>('overview');

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-b border-neutral-200 dark:border-neutral-800">
        {(['overview', 'strategies', 'alerts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 sm:py-3 text-sm sm:text-base font-medium
              border-b-2 transition-colors
              ${activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Metrics Grid */}
          <div className={`
            grid gap-4 sm:gap-6 lg:gap-8
            grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
          `}>
            <MetricCard
              label="Portfolio Value"
              value="$50,000"
              unit="USD"
              icon="💰"
            />
            <MetricCard
              label="Total Gain"
              value="$5,000"
              unit="USD"
              trend={5}
              status="positive"
              icon="📈"
            />
            <MetricCard
              label="Active Strategies"
              value="3"
              icon="🎯"
            />
            <MetricCard
              label="Open Positions"
              value="12"
              trend={2}
              status="positive"
              icon="📊"
            />
          </div>

          {/* Market Data */}
          <Card title="Market Overview" loading={marketLoading}>
            <div className={`
              grid gap-4 sm:gap-6
              grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
            `}>
              {Object.entries(marketData).map(([key, data]: any) => (
                <div key={key} className="p-3 sm:p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                  <h4 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                    {data.symbol}
                  </h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                      Price: ${data.price.toFixed(2)}
                    </p>
                    <p className={`text-xs sm:text-sm font-medium ${
                      data.changePercent >= 0
                        ? 'text-success-600 dark:text-success-400'
                        : 'text-danger-600 dark:text-danger-400'
                    }`}>
                      {data.changePercent >= 0 ? '↑' : '↓'} {Math.abs(data.changePercent).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Alerts */}
          {!breakpoint.isMobile && (
            <Card title="Recent Alerts" subtitle={`${statistics?.totalAlerts || 0} total`} loading={alertsLoading}>
              <div className="space-y-2 sm:space-y-3">
                {alerts.slice(0, 5).map(alert => (
                  <div
                    key={alert.id}
                    className="p-3 sm:p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {alert.name}
                        </h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                          {alert.channels.join(', ')}
                        </p>
                      </div>
                      <span className={`
                        text-xs px-2 py-1 rounded-full whitespace-nowrap
                        ${alert.priority === 'HIGH'
                          ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }
                      `}>
                        {alert.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Strategies Tab */}
      {activeTab === 'strategies' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
              Strategies ({strategies.length})
            </h2>
            <button className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              + New Strategy
            </button>
          </div>

          {strategiesLoading ? (
            <Card>
              <div className="h-20 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded" />
            </Card>
          ) : strategies.length === 0 ? (
            <Alert type="info" message="No strategies created yet" />
          ) : (
            <div className={`
              grid gap-4 sm:gap-6
              grid-cols-1 sm:grid-cols-2 ${!breakpoint.isMobile ? 'lg:grid-cols-3' : ''}
            `}>
              {strategies.map(strategy => (
                <Card key={strategy.id} hoverable>
                  <div className="space-y-3">
                    <h3 className="font-bold text-neutral-900 dark:text-white">
                      {strategy.name}
                    </h3>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <p className="text-neutral-600 dark:text-neutral-400">
                        {strategy.description}
                      </p>
                      <div className="flex justify-between">
                        <span>Win Rate: {(strategy.winRate * 100).toFixed(1)}%</span>
                        <span>Factor: {strategy.profitFactor.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700">
                        Edit
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700">
                        Test
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-white">
              Alerts ({alerts.length})
            </h2>
            <button className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
              + New Alert
            </button>
          </div>

          {alertsLoading ? (
            <Card>
              <div className="h-20 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded" />
            </Card>
          ) : alerts.length === 0 ? (
            <Alert type="info" message="No alerts configured" />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {alerts.map(alert => (
                <Card key={alert.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-neutral-900 dark:text-white truncate">
                        {alert.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {alert.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {alert.channels.map(ch => (
                          <span key={ch} className="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        alert.enabled
                          ? 'bg-success-100 dark:bg-success-900/30 text-success-700'
                          : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700'
                      }`}>
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button className="px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 rounded hover:bg-neutral-300">
                        Edit
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponsiveDashboard;
