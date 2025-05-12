'use client';

/**
 * Swap Spreads Chart Component
 * 
 * Displays swap spreads against benchmark rates (e.g., Treasury rates).
 * Supports term structure comparison and historical analysis.
 */

import { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

interface SpreadPoint {
  tenor: string;
  spread: number;
  swapRate?: number;
  benchmarkRate?: number;
}

interface SpreadCurve {
  date: Date;
  label: string;
  points: SpreadPoint[];
}

interface SwapSpreadsChartProps {
  curves: SpreadCurve[];
  title?: string;
  height?: number;
  showComponents?: boolean;
  benchmarkLabel?: string;
}

// Standard tenors for x-axis ordering
const TENOR_ORDER = [
  '1M', '2M', '3M', '6M', '9M', '1Y', '2Y', '3Y', '4Y', '5Y', 
  '7Y', '10Y', '15Y', '20Y', '30Y', '50Y'
];

// Helper function to sort tenors based on standard order
const sortTenors = (a: string, b: string): number => {
  const aIndex = TENOR_ORDER.indexOf(a);
  const bIndex = TENOR_ORDER.indexOf(b);
  
  // If tenor is not in the standard list, append to the end
  if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
  if (aIndex === -1) return 1;
  if (bIndex === -1) return -1;
  
  return aIndex - bIndex;
};

// Generate a color for each curve
const generateCurveColor = (index: number, type: 'spread' | 'swap' | 'benchmark' = 'spread'): string => {
  const baseHues = [220, 0, 120, 60, 280, 30, 180, 330]; // Different hue values
  let hue = baseHues[index % baseHues.length];
  
  // Different saturation and lightness based on type
  let saturation = '70%';
  let lightness = '45%';
  
  if (type === 'swap') {
    lightness = '35%';
  } else if (type === 'benchmark') {
    saturation = '60%';
    lightness = '60%';
  }
  
  return `hsl(${hue}, ${saturation}, ${lightness})`;
};

export default function SwapSpreadsChart({
  curves,
  title = 'Swap Spreads Analysis',
  height = 400,
  showComponents = false,
  benchmarkLabel = 'Treasury'
}: SwapSpreadsChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [displayMode, setDisplayMode] = useState<'spreads' | 'components' | 'both'>(
    showComponents ? 'both' : 'spreads'
  );
  
  useEffect(() => {
    if (!chartRef.current || !curves || curves.length === 0) return;
    
    // Cleanup previous chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Get all unique tenors from all curves
    const allTenors = new Set<string>();
    curves.forEach(curve => {
      curve.points.forEach(point => {
        allTenors.add(point.tenor);
      });
    });
    
    // Sort tenors by standard order
    const sortedTenors = Array.from(allTenors).sort(sortTenors);
    
    // Create datasets based on the display mode
    const datasets: any[] = [];
    
    curves.forEach((curve, index) => {
      const spreadColor = generateCurveColor(index, 'spread');
      const swapColor = generateCurveColor(index, 'swap');
      const benchmarkColor = generateCurveColor(index, 'benchmark');
      
      // Add spread dataset if mode is 'spreads' or 'both'
      if (displayMode === 'spreads' || displayMode === 'both') {
        datasets.push({
          label: `${curve.label} Spreads`,
          data: curve.points.map(point => ({ x: point.tenor, y: point.spread })),
          borderColor: spreadColor,
          backgroundColor: `${spreadColor}20`,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          type: 'line',
          tension: 0.3,
          fill: false,
          yAxisID: 'y-spreads'
        });
      }
      
      // Add swap and benchmark datasets if mode is 'components' or 'both'
      if ((displayMode === 'components' || displayMode === 'both') && 
          curve.points.some(p => p.swapRate !== undefined && p.benchmarkRate !== undefined)) {
        
        // Swap rates
        datasets.push({
          label: `${curve.label} Swap Rate`,
          data: curve.points.map(point => ({ x: point.tenor, y: point.swapRate })),
          borderColor: swapColor,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: displayMode === 'both' ? [5, 5] : [],
          pointRadius: displayMode === 'both' ? 3 : 4,
          pointHoverRadius: 6,
          type: 'line',
          tension: 0.3,
          fill: false,
          yAxisID: 'y-rates'
        });
        
        // Benchmark rates
        datasets.push({
          label: `${curve.label} ${benchmarkLabel} Rate`,
          data: curve.points.map(point => ({ x: point.tenor, y: point.benchmarkRate })),
          borderColor: benchmarkColor,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: displayMode === 'both' ? [2, 2] : [],
          pointRadius: displayMode === 'both' ? 3 : 4,
          pointHoverRadius: 6,
          type: 'line',
          tension: 0.3,
          fill: false,
          yAxisID: 'y-rates'
        });
      }
    });
    
    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedTenors,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw as { x: string, y: number };
                return `${label}: ${value.y?.toFixed(3) || 'N/A'}${
                  label.includes('Spread') ? ' bp' : '%'
                }`;
              }
            }
          },
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: title,
            font: {
              size: 16
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Tenor'
            }
          },
          'y-spreads': {
            type: 'linear',
            display: displayMode === 'spreads' || displayMode === 'both',
            position: 'left',
            title: {
              display: true,
              text: 'Spread (bp)'
            },
            ticks: {
              callback: (value) => `${value} bp`
            }
          },
          'y-rates': {
            type: 'linear',
            display: displayMode === 'components' || displayMode === 'both',
            position: displayMode === 'both' ? 'right' : 'left',
            grid: {
              drawOnChartArea: displayMode !== 'both'
            },
            title: {
              display: true,
              text: 'Rate (%)'
            },
            ticks: {
              callback: (value) => `${value}%`
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
  }, [curves, title, displayMode, benchmarkLabel]);
  
  if (!curves || curves.length === 0) {
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
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">{title}</h3>
        
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded ${
              displayMode === 'spreads' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setDisplayMode('spreads')}
          >
            Spreads Only
          </button>
          
          {curves.some(curve => curve.points.some(p => p.swapRate !== undefined && p.benchmarkRate !== undefined)) && (
            <>
              <button
                className={`px-3 py-1 text-sm rounded ${
                  displayMode === 'components' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setDisplayMode('components')}
              >
                Components Only
              </button>
              
              <button
                className={`px-3 py-1 text-sm rounded ${
                  displayMode === 'both' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setDisplayMode('both')}
              >
                Both
              </button>
            </>
          )}
        </div>
      </div>
      
      <div style={{ height: `${height}px` }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}