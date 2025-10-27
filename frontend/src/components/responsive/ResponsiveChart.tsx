/**
 * Responsive Chart Component
 * 
 * Wrapper around Recharts for responsive, mobile-first charts
 * Automatically adjusts layout and dimensions based on screen size
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  LineChart,
  AreaChart,
  BarChart,
  PieChart,
  Line,
  Area,
  Bar,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

export interface ResponsiveChartProps {
  type: 'line' | 'area' | 'bar' | 'pie';
  data: any[];
  dataKey?: string;
  xAxisKey?: string;
  title?: string;
  height?: number;
  darkMode?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
  onClick?: (data: any) => void;
  margin?: { top: number; right: number; bottom: number; left: number };
}

// Default tooltip component
const DefaultTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 dark:bg-gray-800 text-white p-2 md:p-3 rounded shadow-lg text-xs md:text-sm border border-gray-700">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ResponsiveChart: React.FC<ResponsiveChartProps> = ({
  type,
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  title,
  height = 300,
  darkMode = false,
  showLegend = true,
  showGrid = true,
  colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
  onClick,
  margin = { top: 5, right: 30, bottom: 5, left: 0 },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [displayHeight, setDisplayHeight] = useState(height);

  // Auto-resize based on container width
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        setWidth(newWidth);

        // Adjust height based on screen size
        if (newWidth < 640) {
          setDisplayHeight(height * 1.2);
        } else if (newWidth < 1024) {
          setDisplayHeight(height);
        } else {
          setDisplayHeight(height * 0.9);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  const textColor = darkMode ? '#e5e7eb' : '#374151';
  const gridColor = darkMode ? '#4b5563' : '#e5e7eb';
  const backgroundColor = darkMode ? '#1f2937' : '#ffffff';

  const renderChart = () => {
    const commonProps = {
      data,
      margin,
      onClick: onClick ? (data: any) => onClick(data) : undefined,
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps} width={width} height={displayHeight}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              tick={{ fontSize: width < 640 ? 12 : 14 }}
              angle={width < 640 ? -45 : 0}
              textAnchor={width < 640 ? 'end' : 'middle'}
              height={width < 640 ? 60 : 30}
            />
            <YAxis
              stroke={textColor}
              tick={{ fontSize: width < 640 ? 12 : 14 }}
              width={width < 640 ? 40 : 60}
            />
            <Tooltip content={<DefaultTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: width < 640 ? 12 : 14 }}
                verticalAlign={width < 640 ? 'bottom' : 'top'}
                height={width < 640 ? 30 : 20}
              />
            )}
            {data[0] && Object.keys(data[0]).map((key, idx) => {
              if (key !== xAxisKey) {
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[idx % colors.length]}
                    dot={width > 768}
                    isAnimationActive={width > 640}
                    strokeWidth={width < 640 ? 2 : 2.5}
                  />
                );
              }
              return null;
            })}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps} width={width} height={displayHeight}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              tick={{ fontSize: width < 640 ? 12 : 14 }}
              angle={width < 640 ? -45 : 0}
              textAnchor={width < 640 ? 'end' : 'middle'}
              height={width < 640 ? 60 : 30}
            />
            <YAxis
              stroke={textColor}
              tick={{ fontSize: width < 640 ? 12 : 14 }}
              width={width < 640 ? 40 : 60}
            />
            <Tooltip content={<DefaultTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: width < 640 ? 12 : 14 }}
                verticalAlign={width < 640 ? 'bottom' : 'top'}
                height={width < 640 ? 30 : 20}
              />
            )}
            {data[0] && Object.keys(data[0]).map((key, idx) => {
              if (key !== xAxisKey) {
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[idx % colors.length]}
                    fill={colors[idx % colors.length]}
                    fillOpacity={0.3}
                    isAnimationActive={width > 640}
                    strokeWidth={width < 640 ? 2 : 2.5}
                  />
                );
              }
              return null;
            })}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps} width={width} height={displayHeight}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              tick={{ fontSize: width < 640 ? 12 : 14 }}
              angle={width < 640 ? -45 : 0}
              textAnchor={width < 640 ? 'end' : 'middle'}
              height={width < 640 ? 60 : 30}
            />
            <YAxis
              stroke={textColor}
              tick={{ fontSize: width < 640 ? 12 : 14 }}
              width={width < 640 ? 40 : 60}
            />
            <Tooltip content={<DefaultTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: width < 640 ? 12 : 14 }}
                verticalAlign={width < 640 ? 'bottom' : 'top'}
                height={width < 640 ? 30 : 20}
              />
            )}
            {data[0] && Object.keys(data[0]).map((key, idx) => {
              if (key !== xAxisKey) {
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={colors[idx % colors.length]}
                    isAnimationActive={width > 640}
                    radius={width < 640 ? 4 : 6}
                  />
                );
              }
              return null;
            })}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart width={width} height={displayHeight}>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={xAxisKey}
              cx={width / 2}
              cy={displayHeight / 2}
              outerRadius={width < 640 ? 60 : width < 1024 ? 80 : 100}
              label={width > 640}
              isAnimationActive={width > 640}
            >
              {data.map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<DefaultTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: width < 640 ? 12 : 14 }}
                verticalAlign={width < 640 ? 'bottom' : 'top'}
                height={width < 640 ? 30 : 20}
              />
            )}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="w-full">
      {title && (
        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="w-full overflow-x-auto">
        <div style={{ backgroundColor, borderRadius: '8px' }} className="p-4 md:p-6">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveChart;
