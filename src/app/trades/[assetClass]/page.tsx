'use client';

/**
 * Asset Class Trades Page
 * 
 * Displays trade data for a specific asset class.
 */

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import DataFetchForm from '@/components/data/DataFetchForm';
import TradeTable from '@/components/data/TradeTable';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { DTCCFetchParams, DTCCTrade, DTCCResponse, DTCCAnalytics, AssetClass } from '@/types/dtcc';

export default function AssetClassTradesPage() {
  const params = useParams();
  const assetClass = params.assetClass as string;
  
  // Convert route parameter to AssetClass type
  const getAssetClass = (param: string): AssetClass => {
    const mapping: Record<string, AssetClass> = {
      'rates': 'RATES',
      'credits': 'CREDITS',
      'equities': 'EQUITIES',
      'forex': 'FOREX',
      'commodities': 'COMMODITIES'
    };
    
    return mapping[param.toLowerCase()] || 'RATES';
  };
  
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<DTCCTrade[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [analytics, setAnalytics] = useState<DTCCAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Set title based on asset class
  const assetClassTitle = getAssetClass(assetClass);
  
  const handleFetchData = async (params: DTCCFetchParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure we're using the asset class from the URL
      const fetchParams = {
        ...params,
        assetClass: getAssetClass(assetClass)
      };
      
      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('agency', fetchParams.agency);
      queryParams.append('assetClass', fetchParams.assetClass);
      queryParams.append('startDate', fetchParams.startDate.toISOString());
      queryParams.append('endDate', fetchParams.endDate.toISOString());
      queryParams.append('useCache', fetchParams.useCache ? 'true' : 'false');
      
      console.log(`Fetching data from: /api/dtcc/historical?${queryParams.toString()}`);
      
      // Simulate API response for demonstration
      // In a real implementation, we would fetch from the API
      // const response = await fetch(`/api/dtcc/historical?${queryParams.toString()}`);
      
      // For demonstration, create mock data
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
        assetClass: getAssetClass(assetClass),
        productType: ['Swap', 'Option', 'Forward', 'Future'][Math.floor(Math.random() * 4)],
        underlying: ['USD', 'EUR', 'JPY', 'LIBOR', 'SOFR'][Math.floor(Math.random() * 5)],
        rawData: {}
      }));
      
      const mockResponse: DTCCResponse = {
        trades: mockTrades,
        metadata: {
          count: mockTrades.length,
          startDate: fetchParams.startDate,
          endDate: fetchParams.endDate,
          agency: fetchParams.agency,
          assetClass: fetchParams.assetClass,
          fetchDuration: 1200,
          cacheHit: false
        }
      };
      
      // If this was a real API call:
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.error || 'Failed to fetch data');
      // }
      // const data: DTCCResponse = await response.json();
      
      setTrades(mockResponse.trades);
      setMetadata(mockResponse.metadata);
      
      // Generate analytics
      // In a real implementation, we would call the API
      // const analyticsResponse = await fetch('/api/dtcc/analyze', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ trades: data.trades })
      // });
      
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
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{assetClassTitle} Trade Data</h1>
          <p className="mt-2 text-gray-600">
            Search and analyze {assetClassTitle.toLowerCase()} swap trade data from the DTCC Swap Data Repository.
          </p>
        </div>
        
        <DataFetchForm 
          onFetch={handleFetchData} 
          loading={isLoading} 
          defaultAssetClass={getAssetClass(assetClass)}
        />
        
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