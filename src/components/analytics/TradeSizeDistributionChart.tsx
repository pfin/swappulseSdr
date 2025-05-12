/**
 * Trade Size Distribution Chart Component
 * 
 * Displays a bar chart showing the distribution of trades by notional size.
 */

import { useRef, useEffect } from 'react';
import { DTCCAnalytics } from '@/types/dtcc';
import Chart from 'chart.js/auto';

interface TradeSizeDistributionChartProps {
  analytics: DTCCAnalytics;
  height?: number;
}

export default function TradeSizeDistributionChart({
  analytics,
  height = 300
}: TradeSizeDistributionChartProps) {
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
    const buckets = Object.keys(analytics.tradeSizeDistribution);
    // Order buckets properly
    const orderedBuckets = ['0-1M', '1M-10M', '10M-50M', '50M-100M', '100M+'].filter(
      bucket => buckets.includes(bucket)
    );
    const counts = orderedBuckets.map(bucket => analytics.tradeSizeDistribution[bucket]);
    
    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: orderedBuckets,
        datasets: [
          {
            label: 'Number of Trades',
            data: counts,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = counts.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                
                return `${value.toLocaleString()} trades (${percentage}%)`;
              }
            }
          },
          title: {
            display: true,
            text: 'Trade Size Distribution',
            font: {
              size: 16
            },
            padding: {
              top: 10,
              bottom: 10
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Trades'
            },
            ticks: {
              precision: 0
            }
          },
          x: {
            title: {
              display: true,
              text: 'Trade Size (USD)'
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
  
  if (!analytics || Object.keys(analytics.tradeSizeDistribution).length === 0) {
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