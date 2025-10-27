/**
 * Responsive Layout Component
 * 
 * Main layout with:
 * - Responsive sidebar (collapsible on tablet/mobile)
 * - Adaptive header
 * - Mobile navigation
 * - Breakpoint-aware rendering
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './theme/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

interface BreakpointInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const useBreakpoint = (): BreakpointInfo => {
  const [breakpoint, setBreakpoint] = useState<BreakpointInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    currentBreakpoint: 'lg',
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      let currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'xs';
      if (width >= 1536) currentBreakpoint = '2xl';
      else if (width >= 1280) currentBreakpoint = 'xl';
      else if (width >= 1024) currentBreakpoint = 'lg';
      else if (width >= 768) currentBreakpoint = 'md';
      else if (width >= 640) currentBreakpoint = 'sm';

      setBreakpoint({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        currentBreakpoint,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const breakpoint = useBreakpoint();

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (breakpoint.isMobile) {
      setSidebarOpen(false);
    } else if (breakpoint.isDesktop) {
      setSidebarOpen(true);
    }
  }, [breakpoint.isMobile, breakpoint.isDesktop]);

  const handleLogout = () => {
    if (window.confirm('Deseja fazer logout?')) {
      logout();
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Desktop Sidebar */}
      {!breakpoint.isMobile && (
        <aside
          className={`
            transition-all duration-300 bg-white dark:bg-neutral-900 
            border-r border-neutral-200 dark:border-neutral-800
            ${sidebarOpen ? 'w-64' : 'w-20'}
            hidden lg:flex flex-col
          `}
        >
          {/* Logo */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h1 className={`font-bold text-primary-600 ${sidebarOpen ? 'text-2xl' : 'text-lg'}`}>
              {sidebarOpen ? '📊 Trading' : '📊'}
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <NavLink href="/dashboard" icon="📊" label="Dashboard" open={sidebarOpen} />
            <NavLink href="/strategies" icon="🎯" label="Strategies" open={sidebarOpen} />
            <NavLink href="/portfolio" icon="💼" label="Portfolio" open={sidebarOpen} />
            <NavLink href="/market" icon="📈" label="Market" open={sidebarOpen} />
            <NavLink href="/alerts" icon="🔔" label="Alerts" open={sidebarOpen} />
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title={sidebarOpen ? 'Collapse' : 'Expand'}
            >
              {sidebarOpen ? '◀️' : '▶️'}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between p-4 md:p-6">
            {/* Mobile Menu Button */}
            {breakpoint.isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            )}

            {/* Desktop Sidebar Toggle */}
            {breakpoint.isTablet && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
              >
                ☰
              </button>
            )}

            <h1 className="text-lg md:text-xl font-bold text-neutral-900 dark:text-white">
              Trading System
            </h1>

            {/* User Info */}
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden sm:inline text-sm text-neutral-600 dark:text-neutral-400">
                {user?.name}
              </span>
              <ThemeToggle variant="button" />
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300
                           hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {breakpoint.isMobile && mobileMenuOpen && (
            <nav className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              <MobileNavLink href="/dashboard" icon="📊" label="Dashboard" />
              <MobileNavLink href="/strategies" icon="🎯" label="Strategies" />
              <MobileNavLink href="/portfolio" icon="💼" label="Portfolio" />
              <MobileNavLink href="/market" icon="📈" label="Market" />
              <MobileNavLink href="/alerts" icon="🔔" label="Alerts" />
            </nav>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">
            {/* Tablet Sidebar */}
            {breakpoint.isTablet && sidebarOpen && (
              <aside className="fixed inset-0 z-40 bg-neutral-900/50" onClick={() => setSidebarOpen(false)}>
                <div
                  className="w-64 h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800"
                  onClick={e => e.stopPropagation()}
                >
                  <nav className="p-4 space-y-2">
                    <NavLink href="/dashboard" icon="📊" label="Dashboard" open={true} />
                    <NavLink href="/strategies" icon="🎯" label="Strategies" open={true} />
                    <NavLink href="/portfolio" icon="💼" label="Portfolio" open={true} />
                    <NavLink href="/market" icon="📈" label="Market" open={true} />
                    <NavLink href="/alerts" icon="🔔" label="Alerts" open={true} />
                  </nav>
                </div>
              </aside>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

interface NavLinkProps {
  href: string;
  icon: string;
  label: string;
  open: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, icon, label, open }) => (
  <a
    href={href}
    className={`
      flex items-center gap-3 px-3 py-2 rounded-md
      text-neutral-700 dark:text-neutral-300
      hover:bg-neutral-100 dark:hover:bg-neutral-800
      transition-colors
      ${!open && 'justify-center'}
    `}
  >
    <span className="text-lg">{icon}</span>
    {open && <span className="text-sm font-medium">{label}</span>}
  </a>
);

interface MobileNavLinkProps {
  href: string;
  icon: string;
  label: string;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ href, icon, label }) => (
  <a
    href={href}
    className="flex items-center gap-3 px-4 py-3 rounded-md
              bg-neutral-100 dark:bg-neutral-800
              text-neutral-700 dark:text-neutral-300
              hover:bg-neutral-200 dark:hover:bg-neutral-700
              transition-colors"
  >
    <span className="text-lg">{icon}</span>
    <span className="font-medium">{label}</span>
  </a>
);

export default Layout;
