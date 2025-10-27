/**
 * Theme Context Provider
 * 
 * Manages application theme (light/dark mode)
 * - localStorage persistence
 * - WCAG AA compliant
 * - Auto detection of system preference
 * - Real-time synchronization across tabs
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Detect system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Get effective theme (considering system preference)
const getEffectiveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
};

// Apply theme to DOM
const applyTheme = (effective: 'light' | 'dark') => {
  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(
    getEffectiveTheme(defaultTheme)
  );
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      const t: Theme = ['light', 'dark', 'system'].includes(savedTheme) 
        ? (savedTheme as Theme)
        : defaultTheme;
      setThemeState(t);
      const effective = getEffectiveTheme(t);
      setEffectiveTheme(effective);
      applyTheme(effective);
    } else {
      const effective = getEffectiveTheme(defaultTheme);
      setEffectiveTheme(effective);
      applyTheme(effective);
    }
    setMounted(true);
  }, [defaultTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const effective: 'light' | 'dark' = e.matches ? 'dark' : 'light';
      setEffectiveTheme(effective);
      applyTheme(effective);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Listen for storage changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        setThemeState(newTheme);
        const effective = getEffectiveTheme(newTheme);
        setEffectiveTheme(effective);
        applyTheme(effective);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    const effective = getEffectiveTheme(newTheme);
    setEffectiveTheme(effective);
    applyTheme(effective);
  }, []);

  const handleToggleTheme = useCallback(() => {
    if (effectiveTheme === 'dark') {
      handleSetTheme('light');
    } else {
      handleSetTheme('dark');
    }
  }, [effectiveTheme, handleSetTheme]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  const value: ThemeContextType = {
    theme,
    effectiveTheme,
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
