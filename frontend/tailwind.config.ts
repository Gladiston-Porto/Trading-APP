/**
 * Tailwind CSS Configuration
 * 
 * Responsive design configuration with:
 * - Mobile-first approach
 * - Custom breakpoints
 * - Dark mode support
 * - Semantic color palette
 */

import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // Brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
        success: {
          50: '#f0fdf4',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        neutral: {
          0: '#ffffff',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      spacing: {
        ...defaultTheme.spacing,
        // Additional spacing utilities
        safe: 'max(var(--safe-area-inset-left), 1rem)',
      },
      borderRadius: {
        ...defaultTheme.borderRadius,
        'md-card': '0.75rem',
      },
      boxShadow: {
        ...defaultTheme.boxShadow,
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      animation: {
        ...defaultTheme.animation,
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          'from': { transform: 'translateX(-10px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      },
      screens: {
        'xs': '320px',    // Mobile phones
        'sm': '640px',    // Small devices
        'md': '768px',    // Tablets
        'lg': '1024px',   // Desktops
        'xl': '1280px',   // Large desktops
        '2xl': '1536px',  // Extra large
      },
      zIndex: {
        ...defaultTheme.zIndex,
        'mobile-nav': '50',
        'modal': '100',
        'tooltip': '110',
        'notification': '120',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
