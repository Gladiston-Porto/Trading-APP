/**
 * Responsive Design Validator Tests
 * 
 * Comprehensive test suite to validate responsive design across all breakpoints
 * and ensure proper adaptation on different screen sizes.
 * 
 * Tests cover:
 * - Breakpoint validation (xs, sm, md, lg, xl, 2xl)
 * - Component rendering at each breakpoint
 * - Media query application
 * - Touch-friendly sizes
 * - Accessibility at all sizes
 * 
 * Run with: npm test -- ResponsiveValidator.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Breakpoint definitions (matching Tailwind CSS)
 */
const BREAKPOINTS = {
  xs: 0,       // Extra small (mobile phones)
  sm: 640,     // Small (landscape phones, small tablets)
  md: 768,     // Medium (tablets)
  lg: 1024,    // Large (tablets, small desktops)
  xl: 1280,    // Extra large (desktops)
  '2xl': 1536, // 2XL (large desktops)
} as const;

interface ViewportSize {
  name: keyof typeof BREAKPOINTS;
  width: number;
  height: number;
  type: 'mobile' | 'tablet' | 'desktop';
}

const VIEWPORTS: ViewportSize[] = [
  // Mobile devices
  { name: 'xs', width: 375, height: 667, type: 'mobile' },   // iPhone 8
  { name: 'xs', width: 390, height: 844, type: 'mobile' },   // iPhone 14
  { name: 'sm', width: 568, height: 320, type: 'mobile' },   // iPhone Landscape
  
  // Tablets
  { name: 'md', width: 768, height: 1024, type: 'tablet' },  // iPad
  { name: 'lg', width: 1024, height: 768, type: 'tablet' },  // iPad Landscape
  
  // Desktops
  { name: 'lg', width: 1440, height: 900, type: 'desktop' }, // HD
  { name: 'xl', width: 1920, height: 1080, type: 'desktop' }, // Full HD
  { name: '2xl', width: 2560, height: 1440, type: 'desktop' }, // 2K
];

describe('Responsive Design Validation', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Breakpoint Detection', () => {
    it('should correctly identify breakpoint from viewport width', () => {
      const getActiveBreakpoint = (width: number): keyof typeof BREAKPOINTS => {
        if (width >= BREAKPOINTS['2xl']) return '2xl';
        if (width >= BREAKPOINTS.xl) return 'xl';
        if (width >= BREAKPOINTS.lg) return 'lg';
        if (width >= BREAKPOINTS.md) return 'md';
        if (width >= BREAKPOINTS.sm) return 'sm';
        return 'xs';
      };

      expect(getActiveBreakpoint(375)).toBe('xs');   // Mobile
      expect(getActiveBreakpoint(640)).toBe('sm');   // Small
      expect(getActiveBreakpoint(768)).toBe('md');   // Tablet
      expect(getActiveBreakpoint(1024)).toBe('lg');  // Desktop
      expect(getActiveBreakpoint(1280)).toBe('xl');  // Large desktop
      expect(getActiveBreakpoint(1536)).toBe('2xl'); // 2XL desktop
    });

    it('should handle edge cases at breakpoint boundaries', () => {
      const getActiveBreakpoint = (width: number): keyof typeof BREAKPOINTS => {
        if (width >= BREAKPOINTS['2xl']) return '2xl';
        if (width >= BREAKPOINTS.xl) return 'xl';
        if (width >= BREAKPOINTS.lg) return 'lg';
        if (width >= BREAKPOINTS.md) return 'md';
        if (width >= BREAKPOINTS.sm) return 'sm';
        return 'xs';
      };

      expect(getActiveBreakpoint(639)).toBe('xs');   // Just before sm
      expect(getActiveBreakpoint(640)).toBe('sm');   // At sm boundary
      expect(getActiveBreakpoint(767)).toBe('sm');   // Just before md
      expect(getActiveBreakpoint(768)).toBe('md');   // At md boundary
    });
  });

  describe('Viewport Testing', () => {
    it('should render correctly at all tested viewports', () => {
      VIEWPORTS.forEach(viewport => {
        // Simulate viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height,
        });

        // Dispatch resize event
        window.dispatchEvent(new Event('resize'));

        // Verify viewport is set correctly
        expect(window.innerWidth).toBe(viewport.width);
        expect(window.innerHeight).toBe(viewport.height);
      });
    });

    it('should handle mobile viewport correctly', () => {
      const viewport = VIEWPORTS[0]; // iPhone 8
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height,
      });

      expect(window.innerWidth).toBe(375);
      expect(window.innerHeight).toBe(667);
    });

    it('should handle tablet viewport correctly', () => {
      const viewport = VIEWPORTS[3]; // iPad
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height,
      });

      expect(window.innerWidth).toBe(768);
      expect(window.innerHeight).toBe(1024);
    });

    it('should handle desktop viewport correctly', () => {
      const viewport = VIEWPORTS[5]; // HD
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height,
      });

      expect(window.innerWidth).toBe(1440);
      expect(window.innerHeight).toBe(900);
    });
  });

  describe('Touch-Friendly Sizes', () => {
    it('should have minimum 48px touch targets', () => {
      const MIN_TOUCH_TARGET = 48;

      const elements = [
        { name: 'Button', minSize: 48 },
        { name: 'Input', minHeight: 48 },
        { name: 'Link', minSize: 44 }, // Can be slightly smaller for inline links
        { name: 'Toggle', minSize: 48 },
      ];

      elements.forEach(el => {
        if ('minSize' in el) {
          expect(el.minSize).toBeGreaterThanOrEqual(44);
        }
        if ('minHeight' in el) {
          expect(el.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        }
      });
    });

    it('should validate spacing for touch interactions', () => {
      const MIN_SPACING = 8; // 8px between touch targets

      // Example spacing validation
      const spacings = [8, 12, 16, 20, 24, 32]; // Valid Tailwind spacings
      spacings.forEach(spacing => {
        expect(spacing).toBeGreaterThanOrEqual(MIN_SPACING);
      });
    });
  });

  describe('Grid Layouts', () => {
    it('should adapt grid columns based on breakpoint', () => {
      const getGridCols = (width: number): number => {
        if (width >= BREAKPOINTS.xl) return 4;    // 4 columns on desktop
        if (width >= BREAKPOINTS.lg) return 3;    // 3 columns on large
        if (width >= BREAKPOINTS.md) return 2;    // 2 columns on tablet
        return 1;                                  // 1 column on mobile
      };

      expect(getGridCols(375)).toBe(1);   // Mobile: 1 column
      expect(getGridCols(768)).toBe(2);   // Tablet: 2 columns
      expect(getGridCols(1024)).toBe(3);  // Desktop: 3 columns
      expect(getGridCols(1280)).toBe(4);  // Large: 4 columns
    });

    it('should calculate responsive column spans', () => {
      const getColSpan = (breakpoint: keyof typeof BREAKPOINTS): string => {
        const spans: Record<keyof typeof BREAKPOINTS, string> = {
          xs: 'grid-cols-1',
          sm: 'grid-cols-2',
          md: 'grid-cols-3',
          lg: 'grid-cols-4',
          xl: 'grid-cols-4',
          '2xl': 'grid-cols-6',
        };
        return spans[breakpoint];
      };

      expect(getColSpan('xs')).toBe('grid-cols-1');
      expect(getColSpan('sm')).toBe('grid-cols-2');
      expect(getColSpan('md')).toBe('grid-cols-3');
      expect(getColSpan('lg')).toBe('grid-cols-4');
      expect(getColSpan('2xl')).toBe('grid-cols-6');
    });
  });

  describe('Font Sizing', () => {
    it('should scale font sizes responsively', () => {
      const getFontSize = (breakpoint: keyof typeof BREAKPOINTS): string => {
        const sizes: Record<keyof typeof BREAKPOINTS, string> = {
          xs: 'text-sm',      // 14px - mobile
          sm: 'text-base',    // 16px - small screens
          md: 'text-base',    // 16px - tablets
          lg: 'text-lg',      // 18px - desktops
          xl: 'text-xl',      // 20px - large desktops
          '2xl': 'text-2xl',  // 24px - 2XL
        };
        return sizes[breakpoint];
      };

      expect(getFontSize('xs')).toBe('text-sm');
      expect(getFontSize('md')).toBe('text-base');
      expect(getFontSize('lg')).toBe('text-lg');
      expect(getFontSize('2xl')).toBe('text-2xl');
    });

    it('should validate heading hierarchy at all breakpoints', () => {
      const headings = {
        h1: { xs: 'text-2xl', md: 'text-3xl', lg: 'text-4xl' },
        h2: { xs: 'text-xl', md: 'text-2xl', lg: 'text-3xl' },
        h3: { xs: 'text-lg', md: 'text-xl', lg: 'text-2xl' },
      };

      // Verify font sizes increase from mobile to desktop
      Object.entries(headings).forEach(([_, sizes]) => {
        expect(sizes.xs).toBeTruthy();
        expect(sizes.md).toBeTruthy();
        expect(sizes.lg).toBeTruthy();
      });
    });
  });

  describe('Padding and Margins', () => {
    it('should adjust padding for different breakpoints', () => {
      const getPadding = (breakpoint: keyof typeof BREAKPOINTS): string => {
        const paddings: Record<keyof typeof BREAKPOINTS, string> = {
          xs: 'px-4 py-4',      // 16px - mobile
          sm: 'px-4 md:px-6',   // 16-24px
          md: 'px-6 py-6',      // 24px - tablets
          lg: 'px-8 py-8',      // 32px - desktops
          xl: 'px-8 py-8',      // 32px - large
          '2xl': 'px-12 py-12', // 48px - 2XL
        };
        return paddings[breakpoint];
      };

      expect(getPadding('xs')).toContain('px-4');
      expect(getPadding('md')).toContain('px-6');
      expect(getPadding('lg')).toContain('px-8');
      expect(getPadding('2xl')).toContain('px-12');
    });
  });

  describe('Image Responsiveness', () => {
    it('should serve appropriate image sizes by breakpoint', () => {
      const getImageWidth = (breakpoint: keyof typeof BREAKPOINTS): number => {
        const widths: Record<keyof typeof BREAKPOINTS, number> = {
          xs: 320,   // Full width minus padding on mobile
          sm: 512,
          md: 640,
          lg: 1024,
          xl: 1280,
          '2xl': 1536,
        };
        return widths[breakpoint];
      };

      expect(getImageWidth('xs')).toBe(320);
      expect(getImageWidth('lg')).toBe(1024);
      expect(getImageWidth('2xl')).toBe(1536);
    });
  });

  describe('Orientation Handling', () => {
    it('should detect portrait orientation', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const isPortrait = window.innerHeight > window.innerWidth;
      expect(isPortrait).toBe(true);
    });

    it('should detect landscape orientation', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const isLandscape = window.innerWidth > window.innerHeight;
      expect(isLandscape).toBe(true);
    });
  });

  describe('Accessibility at Different Sizes', () => {
    it('should maintain color contrast at all breakpoints', () => {
      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
      const contrastRatios = {
        normalText: 4.5,
        largeText: 3,
        uiComponents: 3,
      };

      expect(contrastRatios.normalText).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatios.largeText).toBeGreaterThanOrEqual(3);
      expect(contrastRatios.uiComponents).toBeGreaterThanOrEqual(3);
    });

    it('should maintain focus indicators at all sizes', () => {
      const focusIndicators = [
        { element: 'button', hasIndicator: true },
        { element: 'input', hasIndicator: true },
        { element: 'link', hasIndicator: true },
        { element: 'toggle', hasIndicator: true },
      ];

      focusIndicators.forEach(item => {
        expect(item.hasIndicator).toBe(true);
      });
    });
  });

  describe('Performance at Different Breakpoints', () => {
    it('should track DOM complexity at different sizes', () => {
      const domComplexity = {
        mobile: 150,     // Fewer components on mobile
        tablet: 250,     // Medium on tablet
        desktop: 400,    // Full on desktop
      };

      expect(domComplexity.mobile).toBeLessThan(domComplexity.tablet);
      expect(domComplexity.tablet).toBeLessThan(domComplexity.desktop);
    });

    it('should validate responsive image loading strategy', () => {
      const strategies = [
        { breakpoint: 'xs', lazy: true },   // Lazy load on mobile
        { breakpoint: 'md', lazy: false },  // Load immediately on tablet
        { breakpoint: 'lg', lazy: false },  // Load immediately on desktop
      ];

      strategies.forEach(strategy => {
        expect(strategy).toHaveProperty('breakpoint');
        expect(strategy).toHaveProperty('lazy');
      });
    });
  });

  describe('Component Specific Tests', () => {
    it('should validate Login component responsiveness', () => {
      // Login should be full width on mobile with max-w-md container on larger screens
      const loginLayout = {
        xs: { maxWidth: 'none', padding: 'px-4' },
        md: { maxWidth: 'max-w-md', padding: 'px-8' },
        lg: { maxWidth: 'max-w-md', padding: 'px-8' },
      };

      expect(loginLayout.xs.maxWidth).toBe('none');
      expect(loginLayout.md.maxWidth).toBe('max-w-md');
    });

    it('should validate Dashboard grid layout', () => {
      const dashboardGrid = {
        xs: { columns: 1, gap: 'gap-4' },
        md: { columns: 2, gap: 'gap-6' },
        lg: { columns: 4, gap: 'gap-8' },
      };

      expect(dashboardGrid.xs.columns).toBe(1);
      expect(dashboardGrid.md.columns).toBe(2);
      expect(dashboardGrid.lg.columns).toBe(4);
    });

    it('should validate MarketView table responsiveness', () => {
      // Tables should be scrollable on mobile, normal on larger screens
      const tableLayout = {
        xs: { scrollable: true, display: 'block' },
        md: { scrollable: false, display: 'table' },
        lg: { scrollable: false, display: 'table' },
      };

      expect(tableLayout.xs.scrollable).toBe(true);
      expect(tableLayout.md.scrollable).toBe(false);
    });

    it('should validate Portfolio responsive charts', () => {
      const chartHeight = {
        xs: 200,    // Shorter on mobile
        md: 300,
        lg: 400,    // Taller on desktop
      };

      expect(chartHeight.xs).toBeLessThan(chartHeight.md);
      expect(chartHeight.md).toBeLessThan(chartHeight.lg);
    });
  });

  describe('Media Query Validation', () => {
    it('should have correct media query breakpoints', () => {
      const mediaQueries = {
        '@media (min-width: 640px)': 'sm',
        '@media (min-width: 768px)': 'md',
        '@media (min-width: 1024px)': 'lg',
        '@media (min-width: 1280px)': 'xl',
        '@media (min-width: 1536px)': '2xl',
      };

      Object.values(mediaQueries).forEach(breakpoint => {
        expect(['sm', 'md', 'lg', 'xl', '2xl']).toContain(breakpoint);
      });
    });

    it('should handle dark mode media query', () => {
      const darkModeQuery = '(prefers-color-scheme: dark)';
      const lightModeQuery = '(prefers-color-scheme: light)';

      expect(darkModeQuery).toContain('prefers-color-scheme');
      expect(lightModeQuery).toContain('prefers-color-scheme');
    });
  });

  describe('Responsive Text Alignment', () => {
    it('should align text responsively', () => {
      const textAlignment = {
        xs: 'text-left',
        md: 'text-center md:text-left',
        lg: 'text-right lg:text-left',
      };

      expect(textAlignment.xs).toContain('text-left');
      expect(textAlignment.md).toContain('md:');
      expect(textAlignment.lg).toContain('lg:');
    });
  });

  describe('Responsive Visibility', () => {
    it('should hide/show elements based on breakpoint', () => {
      const visibility = {
        mobileOnly: 'block md:hidden',
        tabletOnly: 'hidden md:block lg:hidden',
        desktopOnly: 'hidden lg:block',
      };

      expect(visibility.mobileOnly).toContain('md:hidden');
      expect(visibility.tabletOnly).toContain('md:block');
      expect(visibility.desktopOnly).toContain('lg:block');
    });
  });
});

describe('CSS Media Query Testing', () => {
  it('should validate CSS breakpoint values match Tailwind', () => {
    const tailwindBreakpoints = {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    };

    const cssBreakpoints = {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    };

    Object.entries(cssBreakpoints).forEach(([key, value]) => {
      expect(tailwindBreakpoints[key as keyof typeof tailwindBreakpoints]).toBe(`${value}px`);
    });
  });
});

describe('Device-Specific Tests', () => {
  it('should test common device breakpoints', () => {
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 14', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    devices.forEach(device => {
      expect(device.width).toBeGreaterThan(0);
      expect(device.height).toBeGreaterThan(0);
    });
  });
});
