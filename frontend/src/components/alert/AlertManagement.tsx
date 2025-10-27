/**
 * Alert Management Component (Responsive)
 * 
 * Handles alert creation, configuration, and management.
 * Mobile-first responsive design:
 * - xs: Single column stacked layout
 * - md: Side-by-side form and list
 * - lg: Full-width optimized layout
 */

import React, { useState } from 'react';
import { useAlerts } from '../../hooks';
import { Alert, AlertChannel, AlertPriority, AlertType } from '../../types';
import { Card, Grid, FormGroup, Alert as AlertComponent } from '../responsive/ResponsiveComponents';

interface AlertManagementProps {
  onSuccess?: () => void;
}

export const AlertManagement: React.FC<AlertManagementProps> = ({ onSuccess }) => {
  const { createAlert, updateAlert, deleteAlert, alerts, loading, error } = useAlerts();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const alertTypes: AlertType[] = [
    'SIGNAL_BUY',
    'SIGNAL_SELL',
    'TP_HIT',
    'SL_HIT',
    'PORTFOLIO_MILESTONE',
    'HIGH_VOLATILITY',
    'BACKTEST_COMPLETE',
    'STRATEGY_UPDATED',
    'SYSTEM_ERROR',
    'SYSTEM_WARNING',
  ];

  const alertChannels: AlertChannel[] = ['TELEGRAM', 'EMAIL', 'PUSH', 'WEBHOOK', 'SMS', 'SLACK'];
  const priorities: AlertPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'SIGNAL_BUY' as AlertType,
    priority: 'MEDIUM' as AlertPriority,
    channels: [] as AlertChannel[],
    enabled: true,
  });

  const handleChannelToggle = (channel: AlertChannel) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setFormError('Alert name is required');
      return;
    }

    if (formData.channels.length === 0) {
      setFormError('Select at least one notification channel');
      return;
    }

    try {
      setFormError(null);
      if (editingId) {
        await updateAlert(editingId, formData);
      } else {
        await createAlert(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        type: 'SIGNAL_BUY',
        priority: 'MEDIUM',
        channels: [],
        enabled: true,
      });
      onSuccess?.();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save alert');
    }
  };

  const handleEdit = (alert: Alert) => {
    setFormData({
      name: alert.name,
      description: alert.description || '',
      type: alert.type,
      priority: alert.priority,
      channels: alert.channels,
      enabled: alert.enabled,
    });
    setEditingId(alert.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        await deleteAlert(id);
        onSuccess?.();
      } catch (err: any) {
        setFormError(err.message || 'Failed to delete alert');
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Alert Management</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">Configure and manage trading alerts</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingId(null);
          }}
          className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm md:text-base whitespace-nowrap"
        >
          {showForm ? '✕ Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* Global Error */}
      {error && (
        <AlertComponent
          type="error"
          title="Alert Error"
          message={error}
          onClose={() => {}}
        />
      )}

      {/* Form Error */}
      {formError && (
        <AlertComponent
          type="error"
          title="Form Error"
          message={formError}
          onClose={() => setFormError(null)}
        />
      )}

      {/* Alert Form - Full width on mobile, sidebar on desktop */}
      {showForm && (
        <Card title={editingId ? '✏️ Edit Alert' : '📢 Create New Alert'} className="mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormGroup label="Alert Name *">
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., BUY Signal Alert"
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </FormGroup>

              <FormGroup label="Description">
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this alert rule..."
                  disabled={loading}
                  rows={3}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </FormGroup>
            </div>

            {/* Type and Priority - 2 columns on sm */}
            <Grid cols={{ xs: 1, sm: 2 }} gap="gap-4">
              <FormGroup label="Alert Type">
                <select
                  value={formData.type}
                  onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as AlertType }))}
                  disabled={loading}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  {alertTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Priority">
                <select
                  value={formData.priority}
                  onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as AlertPriority }))}
                  disabled={loading}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </FormGroup>
            </Grid>

            {/* Channels - Responsive grid */}
            <FormGroup label="Notification Channels *">
              <Grid cols={{ xs: 2, sm: 3, md: 6 }} gap="gap-2">
                {alertChannels.map(channel => (
                  <label key={channel} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm md:text-base">
                    <input
                      type="checkbox"
                      checked={formData.channels.includes(channel)}
                      onChange={() => handleChannelToggle(channel)}
                      disabled={loading}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-gray-700 dark:text-gray-300">{channel}</span>
                  </label>
                ))}
              </Grid>
            </FormGroup>

            {/* Enable Toggle */}
            <label className="flex items-center gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                disabled={loading}
                className="w-4 h-4"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300 text-sm md:text-base">Enable this alert</span>
            </label>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
              >
                {loading ? 'Saving...' : 'Save Alert'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="flex-1 px-4 md:px-6 py-3 md:py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold rounded-lg transition-colors text-sm md:text-base"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        {loading && !showForm ? (
          <Card>
            <p className="text-center py-8 text-gray-500">Loading alerts...</p>
          </Card>
        ) : alerts.length === 0 ? (
          <Card>
            <p className="text-center py-8 text-gray-500">No alerts configured. Create one to get started.</p>
          </Card>
        ) : (
          <Grid cols={{ xs: 1, md: 2, lg: 1 }} gap="gap-4">
            {alerts.map(alert => (
              <Card
                key={alert.id}
                title={alert.name}
                hoverable
                className="relative"
              >
                <div className="space-y-4">
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                      alert.priority === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                      alert.priority === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                      alert.priority === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    }`}>
                      {alert.priority}
                    </span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                      alert.enabled 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {alert.enabled ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </div>

                  {/* Description */}
                  {alert.description && (
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">{alert.description}</p>
                  )}

                  {/* Alert Meta - Grid on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{alert.type}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Channels</p>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{alert.channels.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Alerts Sent</p>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{alert.sendCount}</p>
                    </div>
                    {alert.lastSent && (
                      <div>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Last Sent</p>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{new Date(alert.lastSent).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions - Flex row on mobile, stacked on sm */}
                  <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(alert)}
                      disabled={loading}
                      className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 font-semibold rounded-lg transition-colors text-sm md:text-base disabled:opacity-50"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      disabled={loading}
                      className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 font-semibold rounded-lg transition-colors text-sm md:text-base disabled:opacity-50"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </Grid>
        )}
      </div>
    </div>
  );
};
