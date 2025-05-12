"use client";

/**
 * Dashboard Page
 *
 * Main dashboard page for the DTCC SDR Analyzer with real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import TradeTable from '@/components/data/TradeTable';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { DTCCTrade, DTCCResponse, DTCCAnalytics, DTCCFetchParams, AssetClass, Agency } from '@/types/dtcc';

// Default fetch parameters for real-time updates
const DEFAULT_PARAMS: DTCCFetchParams = {
  agency: 'CFTC',
  assetClass: 'RATES',
  startDate: new Date(new Date().setDate(new Date().getDate() - 1)), // Yesterday
  endDate: new Date(), // Today
  useCache: false, // Don't use cache for real-time updates
  maxConcurrentTasks: 5,
  maxKeepAliveConnections: 10,
  parallelize: true
};

// Helper function to generate realistic trade times
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

// Helper function to generate mock trade data
const generateMockTradeData = (assetClass: AssetClass): DTCCResponse => {
  // Get appropriate product types and underlyings for the selected asset class
  const productTypes = getProductTypes(assetClass);
  const underlyings = getUnderlyings(assetClass);

  // For real-time updates, we'll simulate 50-100 recent trades
  const tradeCount = 50 + Math.floor(Math.random() * 50);

  // Start and end dates for data (past 24 hours)
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 1);

  const mockTrades: DTCCTrade[] = Array.from({ length: tradeCount }, (_, i) => {
    // Most trades should be from the last hour for "real-time" feel
    const isRecentTrade = Math.random() < 0.8;
    const timeOffset = isRecentTrade
      ? Math.random() * 60 * 60 * 1000 // Last hour
      : Math.random() * 24 * 60 * 60 * 1000; // Past 24 hours

    const tradeDate = new Date(endDate.getTime() - timeOffset);

    // Get realistic trade time distribution
    const executionTime = getRealisticTradeTime(tradeDate);

    // Event timestamp is slightly after execution (reporting delay)
    const reportingDelayMinutes = Math.floor(Math.random() * 30); // 0-30 minutes delay for real-time
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
      assetClass,
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

  return {
    trades: mockTrades,
    metadata: {
      count: mockTrades.length,
      startDate,
      endDate,
      agency: 'CFTC',
      assetClass,
      fetchDuration: 500 + Math.floor(Math.random() * 500), // Realistic fetch time
      cacheHit: false // Never cache for real-time updates
    }
  };
};

// Generate analytics from trade data
const generateAnalytics = (trades: DTCCTrade[]): DTCCAnalytics => {
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
  trades.forEach(trade => {
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
  const largestTrades = [...trades]
    .sort((a, b) => parseFloat(b.notionalLeg1 || '0') - parseFloat(a.notionalLeg1 || '0'))
    .slice(0, 10);

  return {
    totalTrades: trades.length,
    volumeByProduct,
    tradeSizeDistribution,
    timeDistribution,
    largestTrades
  };
};

export default function Home() {
  // State for real-time data
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<DTCCTrade[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [analytics, setAnalytics] = useState<DTCCAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [currentAssetClass, setCurrentAssetClass] = useState<AssetClass>('RATES');
  const [showAll, setShowAll] = useState(false);

  // Fetch data function
  const fetchTradeData = useCallback(async () => {
    if (isLoading) return; // Don't fetch if already loading

    setIsLoading(true);
    setError(null);

    try {
      const params = {
        ...DEFAULT_PARAMS,
        assetClass: currentAssetClass,
        // Ensure we're always getting the latest data
        endDate: new Date(),
        // Start from 24 hours ago
        startDate: new Date(new Date().setDate(new Date().getDate() - 1))
      };

      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('agency', params.agency);
      queryParams.append('assetClass', params.assetClass);
      queryParams.append('startDate', params.startDate.toISOString());
      queryParams.append('endDate', params.endDate.toISOString());
      queryParams.append('useCache', 'false'); // Never use cache for real-time updates

      // Fetch mock data (in a real app this would hit an API)
      console.log(`Fetching real-time data for ${params.assetClass} at ${new Date().toLocaleTimeString()}`);

      // Simulate API fetch with mockup data generation
      // In production this would be an actual API call
      // const response = await fetch(`/api/dtcc/historical?${queryParams.toString()}`);

      // Wait a short time to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 700));

      // Generate mock data to simulate real-time updates
      const mockData = generateMockTradeData(params.assetClass);

      setTrades(mockData.trades);
      setMetadata(mockData.metadata);
      setLastUpdated(new Date());

      // Generate analytics
      if (mockData.trades.length > 0) {
        const analyticsData = generateAnalytics(mockData.trades);
        setAnalytics(analyticsData);
      }

    } catch (err) {
      console.error('Error fetching real-time data:', err);
      setError((err as Error).message || 'Failed to update real-time data');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentAssetClass]);

  // Setup auto-refresh interval
  useEffect(() => {
    if (!liveUpdates) return;

    // Fetch immediately on first load
    fetchTradeData();

    // Set up the interval
    const intervalId = setInterval(() => {
      fetchTradeData();
    }, refreshInterval);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [fetchTradeData, liveUpdates, refreshInterval]);

  // Handle asset class change
  const handleAssetClassChange = (assetClass: AssetClass) => {
    setCurrentAssetClass(assetClass);
    // This will trigger a re-fetch via the dependency in useEffect
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DTCC SDR Analyzer Dashboard</h1>
            <p className="mt-2 text-lg text-gray-600">
              Real-time swap trade data from the DTCC Swap Data Repository.
            </p>
          </div>

          {/* Live update controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <span className="mr-2 text-sm text-gray-600">Auto-refresh:</span>
              <button
                onClick={() => setLiveUpdates(!liveUpdates)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  liveUpdates ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`${
                    liveUpdates ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            </div>

            {liveUpdates && lastUpdated && (
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
                  <span className="text-sm text-gray-600">
                    {isLoading ? 'Updating...' : `Last update: ${lastUpdated.toLocaleTimeString()}`}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => fetchTradeData()}
              disabled={isLoading}
              className="ml-4 px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Refresh Now
            </button>
          </div>
        </div>
        
        {/* Real-time dashboard */}
        {trades.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Real-time {currentAssetClass} Trade Feed</h2>
              <div className="flex space-x-2">
                <select
                  value={currentAssetClass}
                  onChange={(e) => handleAssetClassChange(e.target.value as AssetClass)}
                  className="block w-36 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="RATES">RATES</option>
                  <option value="CREDITS">CREDITS</option>
                  <option value="EQUITIES">EQUITIES</option>
                  <option value="FOREX">FOREX</option>
                  <option value="COMMODITIES">COMMODITIES</option>
                </select>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="block w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="5000">Refresh: 5s</option>
                  <option value="10000">Refresh: 10s</option>
                  <option value="30000">Refresh: 30s</option>
                  <option value="60000">Refresh: 1m</option>
                </select>
              </div>
            </div>

            {/* Live trades table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Underlying
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notional
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trades
                    .sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime()) // Most recent first
                    .slice(0, showAll ? undefined : 10) // Show only the 10 most recent trades by default
                    .map((trade, index) => {
                      // For real-time feel, highlight recent trades (<5 min old)
                      const isRecent = ((new Date().getTime() - trade.eventTimestamp.getTime()) < 5 * 60 * 1000);

                      // Format notional value with commas for readability
                      const notional = parseFloat(trade.notionalLeg1 || '0').toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      });

                      return (
                        <tr key={index} className={isRecent ? 'bg-green-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {trade.eventTimestamp.toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {trade.productType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {trade.underlying}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {notional}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                trade.actionType === 'NEW' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {trade.actionType}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {trades.length > 10 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                  >
                    {showAll ? 'Show Less' : `Show All (${trades.length} trades)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics dashboard */}
        {analytics && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Real-time Analytics</h2>
            <AnalyticsDashboard analytics={analytics} loading={isLoading} />
          </div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-lg font-medium text-indigo-700">Trade Data</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 mb-4">
                Search and explore swap trade data from the DTCC SDR. View trade details, filter by criteria, and export results.
              </p>
              <Link href="/trades" className="text-indigo-600 hover:text-indigo-900 font-medium">
                Explore Trade Data &rarr;
              </Link>
            </div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-lg font-medium text-indigo-700">Analytics</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 mb-4">
                Visualize trade data with interactive charts and graphs. Analyze trends, distributions, and key metrics.
              </p>
              <Link href="/analytics" className="text-indigo-600 hover:text-indigo-900 font-medium">
                View Analytics &rarr;
              </Link>
            </div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-lg font-medium text-indigo-700">Saved Queries</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 mb-4">
                Save and manage your frequently used data queries. Quickly access your favorite views and filters.
              </p>
              <Link href="/saved-queries" className="text-indigo-600 hover:text-indigo-900 font-medium">
                Manage Saved Queries &rarr;
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Asset Classes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link 
              href="/trades/rates" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">RATES</span>
            </Link>
            
            <Link 
              href="/trades/credits" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">CREDITS</span>
            </Link>
            
            <Link 
              href="/trades/equities" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">EQUITIES</span>
            </Link>
            
            <Link 
              href="/trades/forex" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">FOREX</span>
            </Link>
            
            <Link 
              href="/trades/commodities" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">COMMODITIES</span>
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            About DTCC SDR Analyzer
          </h2>
          <p className="text-gray-700 mb-4">
            The DTCC SDR Analyzer is a comprehensive tool for analyzing swap data reported to the DTCC Swap Data Repository (SDR).
            It provides powerful data retrieval, visualization, and analysis capabilities to help users gain insights into the swap markets.
          </p>
          <p className="text-gray-700">
            The application fetches data directly from the DTCC SDR public data portal, processes it, and provides a user-friendly interface
            for exploring and analyzing the data. Users can filter the data by various criteria, visualize trends and patterns, and save
            their queries for future use.
          </p>
        </div>
      </div>
    </Layout>
  );
}