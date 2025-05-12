'use client';

/**
 * Analytics View Page
 * 
 * Displays specific analytics views: volume, products, time
 */

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import DataFetchForm from '@/components/data/DataFetchForm';
import ProductDistributionChart from '@/components/analytics/ProductDistributionChart';
import TradeSizeDistributionChart from '@/components/analytics/TradeSizeDistributionChart';
import TimeDistributionChart from '@/components/analytics/TimeDistributionChart';
import { DTCCFetchParams, DTCCTrade, DTCCResponse, DTCCAnalytics, AssetClass } from '@/types/dtcc';

export default function AnalyticsViewPage() {
  const params = useParams();
  const view = params.view as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<DTCCAnalytics | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get the view title
  const getViewTitle = () => {
    switch(view.toLowerCase()) {
      case 'volume':
        return 'Trade Volume Analysis';
      case 'products':
        return 'Product Distribution Analysis';
      case 'time':
        return 'Time Distribution Analysis';
      default:
        return 'Analytics';
    }
  };
  
  const handleFetchData = async (params: DTCCFetchParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API response for demonstration
      // In a real implementation, we would fetch from the API
      // const response = await fetch(`/api/dtcc/historical?${queryParams.toString()}`);
      
      // Generate mock trades
      const mockTrades: DTCCTrade[] = Array.from({ length: 50 }, (_, i) => ({
        eventTimestamp: new Date(Date.now() - Math.random() * 86400000 * 5),
        executionTimestamp: new Date(Date.now() - Math.random() * 86400000 * 5),
        effectiveDate: new Date(Date.now() + Math.random() * 86400000 * 30),
        expirationDate: new Date(Date.now() + Math.random() * 86400000 * 365),
        notionalLeg1: `${Math.floor(1000000 + Math.random() * 50000000)}`,
        notionalLeg2: Math.random() > 0.5 ? `${Math.floor(1000000 + Math.random() * 50000000)}` : null,
        spreadLeg1: `${(Math.random() * 5).toFixed(4)}`,
        spreadLeg2: Math.random() > 0.5 ? `${(Math.random() * 5).toFixed(4)}` : null,
        strikePrice: Math.random() > 0.7 ? `${(Math.random() * 100).toFixed(2)}` : null,
        otherPaymentAmount: Math.random() > 0.8 ? `${Math.floor(10000 + Math.random() * 100000)}` : null,
        actionType: Math.random() > 0.5 ? 'NEW' : 'MODIFY',
        assetClass: params.assetClass,
        productType: ['Swap', 'Option', 'Forward', 'Future'][Math.floor(Math.random() * 4)],
        underlying: ['USD', 'EUR', 'JPY', 'LIBOR', 'SOFR'][Math.floor(Math.random() * 5)],
        rawData: {}
      }));
      
      // Set metadata for display
      setMetadata({
        count: mockTrades.length,
        startDate: params.startDate,
        endDate: params.endDate,
        agency: params.agency,
        assetClass: params.assetClass,
        fetchDuration: 1200,
        cacheHit: false
      });
      
      // Create mock analytics data
      const mockAnalytics: DTCCAnalytics = {
        totalTrades: mockTrades.length,
        volumeByProduct: {
          'Swap': 250000000,
          'Option': 150000000,
          'Forward': 100000000,
          'Future': 200000000
        },
        tradeSizeDistribution: {
          '0-1M': 5,
          '1M-10M': 20,
          '10M-50M': 15,
          '50M-100M': 8,
          '100M+': 2
        },
        timeDistribution: {
          '9:00-9:59': 8,
          '10:00-10:59': 12,
          '11:00-11:59': 15,
          '12:00-12:59': 5,
          '13:00-13:59': 3,
          '14:00-14:59': 7
        },
        largestTrades: mockTrades.sort((a, b) => 
          parseFloat(b.notionalLeg1 || '0') - parseFloat(a.notionalLeg1 || '0')
        ).slice(0, 10)
      };
      
      setAnalytics(mockAnalytics);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError((err as Error).message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render the specific view based on the URL parameter
  const renderView = () => {
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
    
    switch(view.toLowerCase()) {
      case 'volume':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Volume Distribution by Product</h2>
            <div className="h-96">
              <ProductDistributionChart analytics={analytics} height={400} />
            </div>
          </div>
        );
      case 'products':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Product Size Distribution</h2>
            <div className="h-96">
              <TradeSizeDistributionChart analytics={analytics} height={400} />
            </div>
          </div>
        );
      case 'time':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Time Distribution Analysis</h2>
            <div className="h-96">
              <TimeDistributionChart analytics={analytics} height={400} />
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics</h2>
            <p>Select a specific analytics view from the sidebar.</p>
          </div>
        );
    }
  };
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{getViewTitle()}</h1>
          <p className="mt-2 text-gray-600">
            Detailed analytics for DTCC swap trade data.
          </p>
        </div>
        
        <DataFetchForm onFetch={handleFetchData} loading={isLoading} />
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg 
                  className="h-5 w-5 text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {metadata && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg 
                  className="h-5 w-5 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Analyzed {metadata.count.toLocaleString()} trades from {metadata.startDate.toLocaleDateString()} to {metadata.endDate.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          {renderView()}
        </div>
      </div>
    </Layout>
  );
}