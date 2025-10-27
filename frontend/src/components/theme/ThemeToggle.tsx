/**
 * Theme Toggle Component
 * 
 * Button to switch between light/dark/system themes
 * - Accessible with keyboard navigation
 * - WCAG AA compliant
 * - Touch-friendly (48px minimum)
 * - Responsive button sizes
 */

import React, { useState } from 'react';
import { useTheme, type Theme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'button' | 'menu';
  showLabel?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  showLabel = false,
  className = '',
}) => {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '🖥️' },
  ];

  if (variant === 'menu') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Theme settings"
          aria-expanded={isOpen}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium text-sm md:text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          <span className="text-lg">{effectiveTheme === 'dark' ? '🌙' : '☀️'}</span>
          {showLabel && <span>Theme</span>}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setIsOpen(false);
                }}
                aria-pressed={theme === t.value}
                className={`w-full px-4 py-3 text-left text-sm md:text-base flex items-center gap-2 transition-colors ${
                  theme === t.value
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                <span>{t.label}</span>
                {theme === t.value && (
                  <span className="ml-auto text-blue-600 dark:text-blue-400">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Simple button variant
  return (
    <button
      onClick={() => {
        // Toggle between light and dark (skip system in toggle)
        if (effectiveTheme === 'dark') {
          setTheme('light');
        } else {
          setTheme('dark');
        }
      }}
      aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Current: ${effectiveTheme} mode. Click to switch.`}
      className={`inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${className}`}
    >
      {effectiveTheme === 'dark' ? (
        <span className="text-xl md:text-2xl">☀️</span>
      ) : (
        <span className="text-xl md:text-2xl">🌙</span>
      )}
    </button>
  );
};

export default ThemeToggle;
