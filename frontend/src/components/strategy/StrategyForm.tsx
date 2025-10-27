/**
 * Strategy Creation Component (Responsive)
 * 
 * Handles strategy creation, editing, and backtesting.
 * Mobile-first responsive form:
 * - xs: Single column stacked fields
 * - sm: 2 columns for risk management
 * - md: Full form with side-by-side inputs
 * - lg: 3-column layout for optimal spacing
 */

import React, { useState } from 'react';
import { useStrategy } from '../../hooks';
import { StrategyConfig } from '../../types';
import { Card, FormGroup, Alert, Grid } from '../responsive/ResponsiveComponents';

interface StrategyFormProps {
  onSuccess?: () => void;
  editingId?: string;
}

export const StrategyForm: React.FC<StrategyFormProps> = ({ onSuccess, editingId }) => {
  const { createStrategy, updateStrategy, loading } = useStrategy(editingId);
  const [formData, setFormData] = useState<StrategyConfig>({
    name: '',
    description: '',
    conditions: [],
    entryRules: [],
    exitRules: [],
    riskPercentage: 2,
    maxPositions: 5,
    stopLossPercent: 2,
    takeProfitPercent: 5,
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Percent') || name === 'riskPercentage' || name === 'maxPositions'
        ? parseFloat(value)
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Strategy name is required');
      return;
    }

    try {
      setError(null);
      if (editingId) {
        await updateStrategy(editingId, formData);
      } else {
        await createStrategy(formData);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save strategy');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          {editingId ? 'Edit Strategy' : 'Create New Strategy'}
        </h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
          {editingId 
            ? 'Update your trading strategy parameters and rules'
            : 'Define a new trading strategy with entry/exit rules and risk management'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          title="Form Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information Section */}
        <Card title="📋 Basic Information" subtitle="Strategy name and description">
          <div className="space-y-4 md:space-y-6">
            <FormGroup label="Strategy Name *" error={!formData.name && error ? 'Required' : undefined}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Mean Reversion Strategy"
                disabled={loading}
                required
                className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </FormGroup>

            <FormGroup label="Description">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your strategy, entry signals, and expected outcomes..."
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </FormGroup>
          </div>
        </Card>

        {/* Risk Management Section */}
        <Card title="⚠️ Risk Management" subtitle="Define your risk parameters">
          <div className="space-y-6">
            {/* Primary Risk Controls - 2 columns on sm, 4 on lg */}
            <Grid cols={{ xs: 1, sm: 2, lg: 2 }} gap="gap-4">
              <FormGroup label="Risk per Trade (%)">
                <input
                  type="number"
                  name="riskPercentage"
                  value={formData.riskPercentage}
                  onChange={handleChange}
                  min="0.1"
                  max="100"
                  step="0.1"
                  disabled={loading}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </FormGroup>

              <FormGroup label="Max Positions">
                <input
                  type="number"
                  name="maxPositions"
                  value={formData.maxPositions}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  disabled={loading}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </FormGroup>
            </Grid>

            {/* Stop Loss and Take Profit - 2 columns on sm, 4 on lg */}
            <Grid cols={{ xs: 1, sm: 2, lg: 2 }} gap="gap-4">
              <FormGroup label="Stop Loss (%)">
                <input
                  type="number"
                  name="stopLossPercent"
                  value={formData.stopLossPercent}
                  onChange={handleChange}
                  min="0.1"
                  max="100"
                  step="0.1"
                  disabled={loading}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </FormGroup>

              <FormGroup label="Take Profit (%)">
                <input
                  type="number"
                  name="takeProfitPercent"
                  value={formData.takeProfitPercent}
                  onChange={handleChange}
                  min="0.1"
                  max="1000"
                  step="0.1"
                  disabled={loading}
                  className="w-full px-3 py-2 md:px-4 md:py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm md:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </FormGroup>
            </Grid>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? 'Saving...' : 'Save Strategy'}
          </button>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 px-4 md:px-6 py-3 md:py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold rounded-lg transition-colors text-sm md:text-base"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
