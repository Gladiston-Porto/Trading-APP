/**
 * Login Component (Responsive)
 * 
 * Handles user authentication with email and password.
 * Responsive design: mobile-first, adapts to all screen sizes.
 * 
 * Features:
 * - Mobile-friendly form layout (full width on small screens)
 * - Tablet optimized (centered form box)
 * - Desktop layout (form in centered container)
 * - Dark mode support
 * - Touch-friendly input fields (48px+ tap targets)
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginRequest } from '../../types';
import { FormGroup, Input, Alert } from '../responsive/ResponsiveComponents';

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await login(formData);
      onSuccess?.();
    } catch (err) {
      // Error is already set in context
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 md:px-8 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md">
        {/* Header - Responsive text sizing */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Trading System
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <Alert 
              type="error" 
              title="Sign In Error"
              message={error}
              onClose={() => window.location.reload()}
            />
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <FormGroup label="Email" error={validationErrors.email}>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              placeholder="your@email.com"
              error={!!validationErrors.email}
            />
          </FormGroup>

          {/* Password Input */}
          <FormGroup label="Password" error={validationErrors.password}>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              placeholder="••••••••"
              error={!!validationErrors.password}
            />
          </FormGroup>

          {/* Login Button - Responsive width */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 md:py-4 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm md:text-base"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Demo Login Button - for development */}
          <button
            type="button"
            onClick={() => {
              setFormData({
                email: 'demo@example.com',
                password: 'demo123456'
              });
            }}
            disabled={loading}
            className="w-full px-4 py-3 md:py-4 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm md:text-base"
          >
            Demo Account
          </button>
        </form>

        {/* Footer - Responsive text sizing */}
        <div className="mt-8 text-center">
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <a href="/register" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              Sign up
            </a>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
            Demo credentials are available for testing
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
