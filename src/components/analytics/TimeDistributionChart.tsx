/**
 * Time Distribution Chart Component
 * 
 * Displays a line chart showing the distribution of trades over time (by hour).
 */

import { useRef, useEffect } from 'react';
import { DTCCAnalytics } from '@/types/dtcc';
import Chart from 'chart.js/auto';

interface TimeDistributionChartProps {
  analytics: DTCCAnalytics;
  height?: number;
}

export default function TimeDistributionChart({
  analytics,
  height = 300
}: TimeDistributionChartProps) {
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
    const timeData = analytics.timeDistribution;
    
    // Create ordered hours array (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00-${i}:59`);
    const counts = hours.map(hour => timeData[hour] || 0);
    
    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Number of Trades',
            data: counts,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            fill: true,
            tension: 0.3
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
                return `${context.raw} trades`;
              }
            }
          },
          title: {
            display: true,
            text: 'Trade Time Distribution (UTC)',
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
              text: 'Time of Day (UTC)'
            },
            ticks: {
              // Show fewer x-axis labels for better readability
              callback: function(value, index) {
                // Show every 4 hours
                return index % 4 === 0 ? hours[index] : '';
              }
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
  
  if (!analytics || Object.keys(analytics.timeDistribution).length === 0) {
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