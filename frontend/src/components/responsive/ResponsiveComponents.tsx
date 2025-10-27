/**
 * Responsive Card Component
 * 
 * Adaptive card layout that works on all screen sizes
 * - Desktop: Full width with optimized spacing
 * - Tablet: Medium padding
 * - Mobile: Compact with safe areas
 */

import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  loading?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  hoverable = false,
  loading = false,
}) => (
  <div
    className={`
      bg-white dark:bg-neutral-900
      rounded-lg border border-neutral-200 dark:border-neutral-800
      shadow-soft hover:shadow-card
      transition-shadow
      p-4 sm:p-6 lg:p-8
      ${hoverable && 'hover:shadow-elevated cursor-pointer'}
      ${loading && 'opacity-50 pointer-events-none'}
      ${className}
    `}
  >
    {title && (
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    )}
    {loading ? (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-5/6" />
      </div>
    ) : (
      children
    )}
  </div>
);

/**
 * Responsive Grid Component
 * 
 * Auto-adjusts columns based on screen size
 */

interface GridProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 'gap-4 md:gap-6 lg:gap-8',
}) => {
  const gridCols = `
    grid-cols-${cols.xs || 1}
    sm:grid-cols-${cols.sm || 1}
    md:grid-cols-${cols.md || 2}
    lg:grid-cols-${cols.lg || 3}
    xl:grid-cols-${cols.xl || 4}
  `;

  return <div className={`grid ${gap} ${gridCols}`}>{children}</div>;
};

/**
 * Responsive Metric Card
 * 
 * Shows value, label, and trend
 */

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  status?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit = '',
  trend,
  status = 'neutral',
  icon,
}) => {
  const statusColor = {
    positive: 'text-success-600 dark:text-success-400',
    negative: 'text-danger-600 dark:text-danger-400',
    neutral: 'text-neutral-600 dark:text-neutral-400',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-2">
            {value}
            {unit && <span className="text-sm text-neutral-500"> {unit}</span>}
          </p>
          {trend !== undefined && (
            <p className={`text-xs sm:text-sm mt-2 ${statusColor[status]}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
            </p>
          )}
        </div>
        {icon && <div className="text-3xl sm:text-4xl ml-2">{icon}</div>}
      </div>
    </Card>
  );
};

/**
 * Responsive Table Component
 */

interface TableColumn {
  key: string;
  label: string;
  render?: (value: any) => React.ReactNode;
  width?: string;
  hide?: {
    xs?: boolean;
    sm?: boolean;
    md?: boolean;
    lg?: boolean;
  };
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, any>[];
  loading?: boolean;
}

export const ResponsiveTable: React.FC<TableProps> = ({ columns, data, loading }) => {
  if (loading) {
    return <div className="animate-pulse h-64 bg-neutral-200 dark:bg-neutral-800 rounded" />;
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
      <table className="w-full">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            {columns.map(col => (
              <th
                key={col.key}
                className={`
                  px-4 sm:px-6 lg:px-8 py-3 text-left
                  text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white
                  ${col.hide?.xs && 'hidden'}
                  ${col.hide?.sm && 'hidden sm:table-cell'}
                  ${col.hide?.md && 'hidden md:table-cell'}
                  ${col.hide?.lg && 'hidden lg:table-cell'}
                `}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`
                    px-4 sm:px-6 lg:px-8 py-3
                    text-xs sm:text-sm text-neutral-700 dark:text-neutral-300
                    ${col.hide?.xs && 'hidden'}
                    ${col.hide?.sm && 'hidden sm:table-cell'}
                    ${col.hide?.md && 'hidden md:table-cell'}
                    ${col.hide?.lg && 'hidden lg:table-cell'}
                  `}
                >
                  {col.render ? col.render(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Responsive Button Group
 */

interface ButtonGroupProps {
  children: React.ReactNode;
  vertical?: boolean;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, vertical }) => (
  <div className={`
    flex ${vertical ? 'flex-col' : 'flex-col sm:flex-row'} gap-2 sm:gap-3
  `}>
    {children}
  </div>
);

/**
 * Responsive Alert
 */

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
  const colors = {
    success: 'bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800',
    error: 'bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-800',
    warning: 'bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-800',
    info: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800',
  };

  return (
    <div className={`
      rounded-lg border p-4 sm:p-6 flex items-start justify-between gap-4
      ${colors[type]}
    `}>
      <div>
        {title && <h3 className="font-semibold text-sm sm:text-base mb-1">{title}</h3>}
        <p className="text-xs sm:text-sm">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 font-bold hover:opacity-70 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Responsive Form Group
 */

interface FormGroupProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}

export const FormGroup: React.FC<FormGroupProps> = ({ label, error, children, required }) => (
  <div className="mb-4 sm:mb-6">
    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
      {label}
      {required && <span className="text-danger-600">*</span>}
    </label>
    <div className="relative">
      {children}
    </div>
    {error && <p className="mt-2 text-xs sm:text-sm text-danger-600 dark:text-danger-400">{error}</p>}
  </div>
);

/**
 * Responsive Input
 */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`
        w-full px-3 sm:px-4 py-2 sm:py-3
        text-sm sm:text-base
        rounded-md border-2
        bg-white dark:bg-neutral-800
        text-neutral-900 dark:text-white
        placeholder-neutral-500 dark:placeholder-neutral-400
        transition-colors
        ${error
          ? 'border-danger-500 dark:border-danger-400 focus:border-danger-600'
          : 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500'
        }
        focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// Export ResponsiveChart from separate file
export { ResponsiveChart, type ResponsiveChartProps } from './ResponsiveChart';
