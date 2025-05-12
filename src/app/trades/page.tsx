/**
 * Trades Page
 * 
 * Page for searching and viewing DTCC trade data.
 */

'use client';

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataFetchForm from '@/components/data/DataFetchForm';
import TradeTable from '@/components/data/TradeTable';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { DTCCFetchParams, DTCCTrade, DTCCResponse, DTCCAnalytics } from '@/types/dtcc';

export default function TradesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<DTCCTrade[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [analytics, setAnalytics] = useState<DTCCAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFetchData = async (params: DTCCFetchParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('agency', params.agency);
      queryParams.append('assetClass', params.assetClass);
      queryParams.append('startDate', params.startDate.toISOString());
      queryParams.append('endDate', params.endDate.toISOString());
      queryParams.append('useCache', params.useCache ? 'true' : 'false');
      
      // Fetch data
      const response = await fetch(`/api/dtcc/historical?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }
      
      const data: DTCCResponse = await response.json();
      
      setTrades(data.trades);
      setMetadata(data.metadata);
      
      // Generate analytics
      const analyticsResponse = await fetch('/api/dtcc/analyze', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trades: data.trades })
      });
      
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.analytics);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError((err as Error).message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">DTCC Trade Data</h1>
          <p className="mt-2 text-gray-600">
            Search and analyze swap trade data from the DTCC Swap Data Repository.
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
                  Fetched {metadata.count.toLocaleString()} trades in {metadata.fetchDuration}ms
                  {metadata.cacheHit !== undefined && (
                    <>
                      {metadata.cacheHit 
                        ? ' (from cache)'
                        : ' (from API)'
                      }
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          <TradeTable trades={trades} loading={isLoading} />
        </div>
        
        {analytics && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics</h2>
            <AnalyticsDashboard analytics={analytics} loading={isLoading} />
          </div>
        )}
      </div>
    </Layout>
  );
}