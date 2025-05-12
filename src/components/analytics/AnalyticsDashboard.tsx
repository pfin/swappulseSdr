/**
 * Analytics Dashboard Component
 * 
 * A dashboard component that displays various analytics charts and metrics.
 */

import { DTCCAnalytics, DTCCTrade } from '@/types/dtcc';
import ProductDistributionChart from './ProductDistributionChart';
import TradeSizeDistributionChart from './TradeSizeDistributionChart';
import TimeDistributionChart from './TimeDistributionChart';
import LargeTradesTable from './LargeTradesTable';

interface AnalyticsDashboardProps {
  analytics: DTCCAnalytics;
  loading?: boolean;
}

export default function AnalyticsDashboard({
  analytics,
  loading = false
}: AnalyticsDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-center h-64">
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No analytics data</h3>
        <p className="mt-1 text-sm text-gray-500">
          Fetch some trade data to view analytics
        </p>
      </div>
    );
  }
  
  // Statistics cards data
  const stats = [
    {
      name: 'Total Trades',
      value: analytics.totalTrades.toLocaleString()
    },
    {
      name: 'Product Types',
      value: Object.keys(analytics.volumeByProduct).length.toLocaleString()
    },
    {
      name: 'Total Volume',
      value: Object.values(analytics.volumeByProduct).reduce((a, b) => a + b, 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
    },
    {
      name: 'Avg Trade Size',
      value: analytics.totalTrades > 0
        ? (Object.values(analytics.volumeByProduct).reduce((a, b) => a + b, 0) / analytics.totalTrades).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          })
        : '$0'
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white px-4 py-5 shadow-sm rounded-lg overflow-hidden"
          >
            <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
            <dd className="mt-1 text-2xl font-semibold text-indigo-600">{stat.value}</dd>
          </div>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductDistributionChart analytics={analytics} height={300} />
        <TradeSizeDistributionChart analytics={analytics} height={300} />
        <TimeDistributionChart analytics={analytics} height={300} />
        <LargeTradesTable largestTrades={analytics.largestTrades} />
      </div>
    </div>
  );
}