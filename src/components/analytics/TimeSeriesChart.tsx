'use client';

/**
 * Time Series Chart Component
 * 
 * Displays a line chart for time series data with support for:
 * - Multiple series
 * - Dual axis
 * - Statistical overlays (moving averages, standard deviations)
 * - Custom date range selection
 */

import { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import { format } from 'date-fns';
import 'chartjs-adapter-date-fns';

interface DataPoint {
  date: Date;
  value: number;
}

interface TimeSeriesData {
  name: string;
  data: DataPoint[];
  color?: string;
  useRightAxis?: boolean;
  showMovingAverage?: boolean;
  showStdDev?: boolean;
  maWindow?: number; // Moving average window in days
}

interface TimeSeriesChartProps {
  series: TimeSeriesData[];
  title?: string;
  height?: number;
  dateRange?: [Date, Date];
  onDateRangeChange?: (range: [Date, Date]) => void;
}

// Generate colors for each series
const generateSeriesColor = (index: number): string => {
  const colors = [
    '#4C72B0', // blue
    '#DD8452', // orange
    '#55A868', // green
    '#C44E52', // red
    '#8172B3', // purple
    '#937860', // brown
    '#DA8BC3', // pink
    '#8C8C8C', // gray
    '#CCB974', // yellow
    '#64B5CD'  // light blue
  ];
  
  return colors[index % colors.length];
};

// Calculate moving average
const calculateMovingAverage = (data: DataPoint[], window: number): DataPoint[] => {
  if (window <= 1 || data.length < window) {
    return data;
  }
  
  const result: DataPoint[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      // Not enough data points yet
      result.push({ date: data[i].date, value: NaN });
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < window; j++) {
      sum += data[i - j].value;
    }
    
    result.push({
      date: data[i].date,
      value: sum / window
    });
  }
  
  return result;
};

// Calculate standard deviation bands
const calculateStdDevBands = (
  data: DataPoint[],
  ma: DataPoint[],
  window: number
): { upper: DataPoint[], lower: DataPoint[] } => {
  const upper: DataPoint[] = [];
  const lower: DataPoint[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1 || isNaN(ma[i].value)) {
      upper.push({ date: data[i].date, value: NaN });
      lower.push({ date: data[i].date, value: NaN });
      continue;
    }
    
    let sumSquaredDiff = 0;
    for (let j = 0; j < window; j++) {
      const diff = data[i - j].value - ma[i].value;
      sumSquaredDiff += diff * diff;
    }
    
    const stdDev = Math.sqrt(sumSquaredDiff / window);
    
    upper.push({
      date: data[i].date,
      value: ma[i].value + stdDev
    });
    
    lower.push({
      date: data[i].date,
      value: ma[i].value - stdDev
    });
  }
  
  return { upper, lower };
};

export default function TimeSeriesChart({
  series,
  title = 'Time Series Analysis',
  height = 400,
  dateRange,
  onDateRangeChange
}: TimeSeriesChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Filter series data based on date range
  const getFilteredData = (data: DataPoint[], range?: [Date, Date]): DataPoint[] => {
    if (!range) return data;
    
    const [start, end] = range;
    return data.filter(point => 
      point.date >= start && point.date <= end
    );
  };
  
  useEffect(() => {
    if (!chartRef.current || !series || series.length === 0) return;
    
    // Cleanup previous chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    const needsRightAxis = series.some(s => s.useRightAxis);
    
    // Create datasets
    let datasets: any[] = [];
    
    series.forEach((s, index) => {
      // Assign color if not provided
      const color = s.color || generateSeriesColor(index);
      const filteredData = getFilteredData(s.data, dateRange);
      
      // Add main series
      datasets.push({
        label: s.name,
        data: filteredData.map(p => ({ x: p.date, y: p.value })),
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        pointRadius: 1,
        pointHoverRadius: 4,
        yAxisID: s.useRightAxis ? 'y1' : 'y',
        tension: 0.2,
        fill: false
      });
      
      // Add moving average if requested
      if (s.showMovingAverage) {
        const window = s.maWindow || 20; // Default 20-day MA
        const maData = calculateMovingAverage(filteredData, window);
        
        datasets.push({
          label: `${s.name} (${window}d MA)`,
          data: maData.map(p => ({ x: p.date, y: p.value })),
          borderColor: color,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          yAxisID: s.useRightAxis ? 'y1' : 'y',
          tension: 0.4,
          fill: false
        });
        
        // Add standard deviation bands if requested
        if (s.showStdDev) {
          const { upper, lower } = calculateStdDevBands(filteredData, maData, window);
          
          // Upper band
          datasets.push({
            label: `${s.name} +1σ`,
            data: upper.map(p => ({ x: p.date, y: p.value })),
            borderColor: `${color}80`,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderDash: [3, 3],
            pointRadius: 0,
            pointHoverRadius: 0,
            yAxisID: s.useRightAxis ? 'y1' : 'y',
            tension: 0.4,
            fill: false
          });
          
          // Lower band
          datasets.push({
            label: `${s.name} -1σ`,
            data: lower.map(p => ({ x: p.date, y: p.value })),
            borderColor: `${color}80`,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderDash: [3, 3],
            pointRadius: 0,
            pointHoverRadius: 0,
            yAxisID: s.useRightAxis ? 'y1' : 'y',
            tension: 0.4,
            fill: '-2' // Fill between this and the upper band
          });
        }
      }
    });
    
    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (tooltipItems) => {
                const date = new Date(tooltipItems[0].parsed.x);
                return format(date, 'PP');
              }
            }
          },
          legend: {
            position: 'top',
          },
          title: {
            display: !!title,
            text: title,
            font: {
              size: 16
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day'
            },
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Value'
            }
          },
          y1: {
            type: 'linear',
            display: needsRightAxis,
            position: 'right',
            grid: {
              drawOnChartArea: false // Only show grid lines for primary y-axis
            },
            title: {
              display: true,
              text: 'Value (Right)'
            }
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [series, title, dateRange]);
  
  if (!series || series.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 rounded-lg" 
        style={{ height: `${height}px` }}
      >
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div style={{ height: `${height}px` }}>
        <canvas ref={chartRef} />
      </div>
      
      {onDateRangeChange && (
        <div className="mt-4 flex space-x-2 text-sm">
          <button
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            onClick={() => {
              // Set date range to last 7 days
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - 7);
              onDateRangeChange([start, end]);
            }}
          >
            7D
          </button>
          <button
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            onClick={() => {
              // Set date range to last 30 days
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - 30);
              onDateRangeChange([start, end]);
            }}
          >
            1M
          </button>
          <button
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            onClick={() => {
              // Set date range to last 90 days
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - 90);
              onDateRangeChange([start, end]);
            }}
          >
            3M
          </button>
          <button
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            onClick={() => {
              // Set date range to last 365 days
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - 365);
              onDateRangeChange([start, end]);
            }}
          >
            1Y
          </button>
          <button
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            onClick={() => {
              // Set date range to all available data
              onDateRangeChange([new Date(0), new Date()]);
            }}
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}