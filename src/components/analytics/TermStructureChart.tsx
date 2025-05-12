'use client';

/**
 * Term Structure Chart Component
 * 
 * Displays a line chart showing the term structure of swap rates.
 * Supports multiple dates for comparison and forward curves.
 */

import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

interface TermPoint {
  tenor: string;
  rate: number;
}

interface TermCurve {
  date: Date;
  label: string;
  points: TermPoint[];
  forwardTenor?: string;
}

interface TermStructureChartProps {
  curves: TermCurve[];
  title?: string;
  height?: number;
  logScale?: boolean;
}

// Define standard tenors for x-axis ordering
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
const generateCurveColor = (index: number, isForward: boolean = false): string => {
  const baseHues = [220, 0, 120, 60, 280, 30, 180, 330]; // Different hue values
  const hue = baseHues[index % baseHues.length];
  const saturation = isForward ? '70%' : '80%';
  const lightness = isForward ? '60%' : '45%';
  
  return `hsl(${hue}, ${saturation}, ${lightness})`;
};

export default function TermStructureChart({
  curves,
  title = 'Swap Rate Term Structure',
  height = 400,
  logScale = false
}: TermStructureChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
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
    
    // Create datasets for each curve
    const datasets = curves.map((curve, index) => {
      const isForward = !!curve.forwardTenor;
      const color = generateCurveColor(index, isForward);
      
      // Create dataset
      return {
        label: isForward 
          ? `${curve.forwardTenor} Forward - ${curve.label}`
          : curve.label,
        data: sortedTenors.map(tenor => {
          const point = curve.points.find(p => p.tenor === tenor);
          // Return null for missing points to maintain continuous line but with gaps
          return point ? point.rate : null;
        }),
        borderColor: color,
        backgroundColor: `${color}33`, // Add transparency
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: false
      };
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
                const value = context.parsed.y;
                return `${label}: ${value !== null ? value.toFixed(3) : 'N/A'}%`;
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
          y: {
            title: {
              display: true,
              text: 'Rate (%)'
            },
            type: logScale ? 'logarithmic' : 'linear',
            min: undefined
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [curves, title, logScale]);
  
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
      <div style={{ height: `${height}px` }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}