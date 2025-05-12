/**
 * Product Distribution Chart Component
 * 
 * Displays a pie chart showing the distribution of trades by product type.
 */

import { useRef, useEffect } from 'react';
import { DTCCAnalytics } from '@/types/dtcc';
import Chart from 'chart.js/auto';

interface ProductDistributionChartProps {
  analytics: DTCCAnalytics;
  height?: number;
}

export default function ProductDistributionChart({
  analytics,
  height = 300
}: ProductDistributionChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!chartRef.current || !analytics) return;
    
    // Cleanup previous chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Prepare data
    const productTypes = Object.keys(analytics.volumeByProduct);
    const volumes = Object.values(analytics.volumeByProduct);
    
    // Generate colors
    const colors = productTypes.map((_, index) => {
      const hue = (index * 137) % 360; // Golden angle approximation for nice distribution
      return `hsl(${hue}, 70%, 60%)`;
    });
    
    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: productTypes,
        datasets: [
          {
            data: volumes,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('60%', '50%')),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 15,
              font: {
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = volumes.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                
                return `${label}: ${value.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })} (${percentage}%)`;
              }
            }
          },
          title: {
            display: true,
            text: 'Volume Distribution by Product Type',
            font: {
              size: 16
            },
            padding: {
              top: 10,
              bottom: 10
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
  }, [analytics]);
  
  if (!analytics || Object.keys(analytics.volumeByProduct).length === 0) {
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