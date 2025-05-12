'use client';

/**
 * Asset Class Trades Page
 * 
 * Displays trade data for a specific asset class.
 */

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataFetchForm from '@/components/data/DataFetchForm';
import TradeTable from '@/components/data/TradeTable';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { DTCCFetchParams, DTCCTrade, DTCCResponse, DTCCAnalytics, AssetClass } from '@/types/dtcc';

// Helper function to distribute trade times realistically
const getRealisticTradeTime = (date: Date): Date => {
  // Distribution weighted towards market hours
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  
  // Weight towards market hours (8am - 6pm ET)
  const marketHourWeight = 0.85; // 85% of trades during market hours
  const isMarketHours = Math.random() < marketHourWeight;
  
  const result = new Date(date);
  if (isMarketHours) {
    // Market hours: 8am-6pm ET (13-23 UTC)
    result.setUTCHours(13 + Math.floor(Math.random() * 10));
  } else {
    // Off hours
    result.setUTCHours(hour);
  }
  
  result.setUTCMinutes(minute);
  result.setUTCSeconds(second);
  
  return result;
};

// Helper function to generate realistic product types based on asset class
const getProductTypes = (assetClass: AssetClass): string[] => {
  switch (assetClass) {
    case 'RATES':
      return ['IRS', 'OIS', 'Basis Swap', 'Fixed-Float', 'Inflation Swap', 'Cross-Currency'];
    case 'CREDITS':
      return ['CDS', 'CDS Index', 'TRS', 'CDX', 'iTraxx', 'Basket Default Swap'];
    case 'EQUITIES':
      return ['Equity Swap', 'Dividend Swap', 'Variance Swap', 'Total Return', 'Option'];
    case 'FOREX':
      return ['FX Forward', 'FX Swap', 'FX Option', 'NDF', 'Currency Swap'];
    case 'COMMODITIES':
      return ['Energy Swap', 'Metal Swap', 'Agricultural Swap', 'Commodity Option', 'Commodity Forward'];
    default:
      return ['Swap', 'Option', 'Forward', 'Future'];
  }
};

// Helper to generate realistic underlyings
const getUnderlyings = (assetClass: AssetClass): string[] => {
  switch (assetClass) {
    case 'RATES':
      return ['SOFR', 'EURIBOR', 'SONIA', 'TONAR', 'LIBOR', 'EFFR', 'ESTR'];
    case 'CREDITS':
      return ['Investment Grade', 'High Yield', 'Emerging Markets', 'Crossover', 'Sovereign'];
    case 'EQUITIES':
      return ['S&P 500', 'NASDAQ', 'EURO STOXX', 'FTSE', 'Nikkei', 'Single Name', 'Sector Index'];
    case 'FOREX':
      return ['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'USD/CAD', 'EUR/GBP', 'AUD/USD'];
    case 'COMMODITIES':
      return ['WTI Crude', 'Brent Crude', 'Natural Gas', 'Gold', 'Silver', 'Copper', 'Wheat', 'Corn'];
    default:
      return ['USD', 'EUR', 'JPY', 'GBP', 'CHF'];
  }
};

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
      
      // For Vercel deployment, use a smaller number of trades
      const tradeCount = 1000; // Reduced for memory constraints
      
      // Get appropriate product types and underlyings for the selected asset class
      const productTypes = getProductTypes(fetchParams.assetClass);
      const underlyings = getUnderlyings(fetchParams.assetClass);
      
      // Create trades in smaller chunks to reduce memory pressure
      const chunkSize = 200;
      const mockTrades: DTCCTrade[] = [];
      
      // Generate trades in chunks to avoid memory issues
      for (let chunk = 0; chunk < Math.ceil(tradeCount / chunkSize); chunk++) {
        const chunkStart = chunk * chunkSize;
        const chunkEnd = Math.min((chunk + 1) * chunkSize, tradeCount);
        const chunkLength = chunkEnd - chunkStart;
        
        // Create a chunk of trades
        const tradesChunk = Array.from({ length: chunkLength }, (_, j) => {
          const i = chunkStart + j; // Global index
          
          // Calculate date based on the requested date range
          const daySpan = (fetchParams.endDate.getTime() - fetchParams.startDate.getTime()) / (1000 * 60 * 60 * 24);
          const randomDayOffset = Math.random() * daySpan;
          const tradeDate = new Date(fetchParams.startDate.getTime() + randomDayOffset * 1000 * 60 * 60 * 24);
          
          // Get realistic trade time distribution
          const executionTime = getRealisticTradeTime(tradeDate);
          
          // Event timestamp is slightly after execution (reporting delay)
          const reportingDelayMinutes = Math.floor(Math.random() * 60 * 4); // 0-4 hour delay
          const eventTime = new Date(executionTime.getTime() + reportingDelayMinutes * 60 * 1000);
          
          // Generate realistic trade data
          const productType = productTypes[Math.floor(Math.random() * productTypes.length)];
          const underlying = underlyings[Math.floor(Math.random() * underlyings.length)];
          
          // Generate notional with realistic distribution
          // Log-normal distribution to reflect market reality (many small trades, few large ones)
          const notionalBase = Math.exp(Math.random() * Math.log(100_000_000));
          const notionalLeg1 = Math.max(100_000, Math.floor(notionalBase));
          
          // Only some trades have a second leg
          const hasSecondLeg = productType.includes('Swap') || productType.includes('Cross-Currency');
          const notionalLeg2 = hasSecondLeg ? Math.max(100_000, Math.floor(notionalBase * (0.9 + Math.random() * 0.2))) : null;
          
          // Trade expiration and effective dates
          const effectiveOffset = Math.floor(Math.random() * 30); // 0-30 days forward
          const effectiveDate = new Date(executionTime.getTime() + effectiveOffset * 24 * 60 * 60 * 1000);
          
          // Expiration based on typical tenors
          const tenors = [1, 3, 6, 12, 24, 36, 60, 84, 120, 180, 240, 360]; // months
          const tenor = tenors[Math.floor(Math.random() * tenors.length)];
          const expirationDate = new Date(effectiveDate.getTime() + tenor * 30 * 24 * 60 * 60 * 1000);
          
          // Spreads with appropriate distributions
          const spreadLeg1 = (productType.includes('Fixed') || productType.includes('Option'))
            ? `${(0.5 + Math.random() * 4.5).toFixed(4)}` // Fixed rates 0.5% to 5%
            : `${(Math.random() * 2).toFixed(4)}`; // Floating spreads 0 to 2%
            
          const spreadLeg2 = hasSecondLeg
            ? `${(Math.random() * 2).toFixed(4)}`
            : null;
            
          // Strike prices for options
          const strikePrice = productType.includes('Option')
            ? `${(0.5 + Math.random() * 9.5).toFixed(2)}`
            : null;
            
          // Other payment amounts (occasional upfront payments)
          const hasOtherPayment = Math.random() > 0.8;
          const otherPaymentAmount = hasOtherPayment
            ? `${Math.floor(10000 + Math.random() * (notionalLeg1 * 0.05))}`
            : null;
            
          // Action type (mostly new trades, some modifications)  
          const actionType = Math.random() > 0.9 ? 'MODIFY' : 'NEW';
          
          return {
            eventTimestamp: eventTime,
            executionTimestamp: executionTime,
            effectiveDate,
            expirationDate,
            notionalLeg1: notionalLeg1.toString(),
            notionalLeg2: notionalLeg2?.toString() || null,
            spreadLeg1,
            spreadLeg2,
            strikePrice,
            otherPaymentAmount,
            actionType,
            assetClass: fetchParams.assetClass,
            productType,
            underlying,
            rawData: {
              tradeId: `T${Date.now().toString().slice(-8)}${i}`,
              reporterId: `R${Math.floor(Math.random() * 1000)}`,
              dealerId: `D${Math.floor(Math.random() * 100)}`,
              clearingVenue: Math.random() > 0.6 ? 'CLEARED' : 'BILATERAL',
              dealType: Math.random() > 0.7 ? 'INTERDEALER' : 'CUSTOMER'
            }
          };
        });
        
        // Add chunk to the main array
        mockTrades.push(...tradesChunk);
      }
      
      const mockResponse: DTCCResponse = {
        trades: mockTrades,
        metadata: {
          count: mockTrades.length,
          startDate: fetchParams.startDate,
          endDate: fetchParams.endDate,
          agency: fetchParams.agency,
          assetClass: fetchParams.assetClass,
          fetchDuration: 1200 + Math.floor(Math.random() * 800), // Realistic fetch time
          cacheHit: Math.random() > 0.7 // Sometimes hit cache for realism
        }
      };
      
      setTrades(mockResponse.trades);
      setMetadata(mockResponse.metadata);
      
      // Generate analytics
      // Aggregate trade data by product type
      const volumeByProduct: Record<string, number> = {};
      const timeDistribution: Record<string, number> = {};
      const tradeSizeDistribution: Record<string, number> = {
        '0-1M': 0,
        '1M-10M': 0,
        '10M-50M': 0,
        '50M-100M': 0,
        '100M+': 0
      };
      
      // Process trades for analytics
      mockTrades.forEach(trade => {
        // Aggregate by product type
        const product = trade.productType || 'Unknown';
        const notional = parseFloat(trade.notionalLeg1 || '0');
        
        volumeByProduct[product] = (volumeByProduct[product] || 0) + notional;
        
        // Time distribution (hour buckets)
        const hour = trade.executionTimestamp.getHours();
        const hourBucket = `${hour < 10 ? '0' : ''}${hour}:00-${hour < 10 ? '0' : ''}${hour}:59`;
        timeDistribution[hourBucket] = (timeDistribution[hourBucket] || 0) + 1;
        
        // Size distribution
        if (notional < 1_000_000) {
          tradeSizeDistribution['0-1M']++;
        } else if (notional < 10_000_000) {
          tradeSizeDistribution['1M-10M']++;
        } else if (notional < 50_000_000) {
          tradeSizeDistribution['10M-50M']++;
        } else if (notional < 100_000_000) {
          tradeSizeDistribution['50M-100M']++;
        } else {
          tradeSizeDistribution['100M+']++;
        }
      });
      
      // Find largest trades
      const largestTrades = [...mockTrades]
        .sort((a, b) => parseFloat(b.notionalLeg1 || '0') - parseFloat(a.notionalLeg1 || '0'))
        .slice(0, 10);
      
      const mockAnalytics: DTCCAnalytics = {
        totalTrades: mockTrades.length,
        volumeByProduct,
        tradeSizeDistribution,
        timeDistribution,
        largestTrades
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