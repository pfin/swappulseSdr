"use client";

/**
 * Correlation Analysis Page
 * 
 * Provides interactive analysis of correlations between different DTCC trade data.
 */

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import { DTCCTrade, DTCCResponse, AssetClass, Agency } from '@/types/dtcc';
import CorrelationHeatmapChart from '@/components/analytics/correlation/CorrelationHeatmapChart';
import { 
  calculateCrossAssetCorrelations,
  calculateMaturityCorrelations,
  calculateSpreadCorrelations,
  CorrelationData
} from '@/utils/correlationUtils';

// Default fetch parameters for correlation analysis
const DEFAULT_PARAMS = {
  agency: 'CFTC' as Agency,
  assetClass: 'RATES' as AssetClass,
  startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
  endDate: new Date(), // Today
  useCache: true,
  maxConcurrentTasks: 5,
  maxKeepAliveConnections: 10,
  parallelize: true
};

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

// Helper function to generate mock trade data for all asset classes
const generateMockTradeData = (): DTCCTrade[] => {
  const assetClasses: AssetClass[] = ['RATES', 'CREDITS', 'EQUITIES', 'FOREX', 'COMMODITIES'];
  
  // For correlation analysis, we need more data
  const tradesPerAssetClass = 1000;
  const allTrades: DTCCTrade[] = [];
  
  // Set date range for past 30 days with timestamps
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);
  
  // Generate trades for each asset class
  assetClasses.forEach(assetClass => {
    const productTypes = getProductTypes(assetClass);
    const underlyings = getUnderlyings(assetClass);
    
    for (let i = 0; i < tradesPerAssetClass; i++) {
      // Generate a trade date within the date range
      const dayOffset = Math.random() * 30; // 0-30 days
      const tradeDate = new Date(endDate.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      
      // Get realistic trade time distribution
      const executionTime = getRealisticTradeTime(tradeDate);
      
      // Event timestamp is slightly after execution (reporting delay)
      const reportingDelayMinutes = Math.floor(Math.random() * 60); // 0-60 minute delay
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
      
      // Create trade and add to collection
      allTrades.push({
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
          tradeId: `T${Date.now().toString().slice(-8)}${i}${assetClass.charAt(0)}`,
          reporterId: `R${Math.floor(Math.random() * 1000)}`,
          dealerId: `D${Math.floor(Math.random() * 100)}`,
          clearingVenue: Math.random() > 0.6 ? 'CLEARED' : 'BILATERAL',
          dealType: Math.random() > 0.7 ? 'INTERDEALER' : 'CUSTOMER'
        }
      });
    }
  });
  
  return allTrades;
};

export default function CorrelationAnalysisPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [trades, setTrades] = useState<DTCCTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // State for correlation analysis
  const [correlationType, setCorrelationType] = useState<'cross-asset' | 'maturity' | 'spread'>('cross-asset');
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass>('RATES');
  const [valueField, setValueField] = useState<keyof DTCCTrade>('notionalLeg1');
  const [timeWindow, setTimeWindow] = useState<number>(1000 * 60 * 60 * 24); // 1 day default
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);
  const [colorScheme, setColorScheme] = useState<'blue-red' | 'purple-green' | 'red-green'>('blue-red');
  
  // Load initial data
  useEffect(() => {
    fetchTradeData();
  }, []);
  
  // Fetch mock trade data
  const fetchTradeData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching trade data for correlation analysis...');
      
      // Generate mock data
      // In a real implementation, this would be an API call
      const mockTrades = generateMockTradeData();
      setTrades(mockTrades);
      
      // Calculate initial correlation
      updateCorrelationData(mockTrades, correlationType, selectedAssetClass, valueField, timeWindow);
      
    } catch (err) {
      console.error('Error fetching data for correlation analysis:', err);
      setError((err as Error).message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update correlation data based on selections
  const updateCorrelationData = (
    tradeData: DTCCTrade[],
    type: 'cross-asset' | 'maturity' | 'spread',
    assetClass: AssetClass,
    field: keyof DTCCTrade,
    window: number
  ) => {
    if (!tradeData.length) return;
    
    try {
      let data: CorrelationData | null = null;
      
      switch (type) {
        case 'cross-asset':
          data = calculateCrossAssetCorrelations(tradeData, null, field, window);
          break;
        case 'maturity':
          data = calculateMaturityCorrelations(tradeData, assetClass, field);
          break;
        case 'spread':
          data = calculateSpreadCorrelations(tradeData, assetClass);
          break;
      }
      
      setCorrelationData(data);
    } catch (error) {
      console.error('Error calculating correlation:', error);
      setError('Failed to calculate correlation data');
    }
  };
  
  // Handle changes to correlation settings
  const handleSettingChange = (
    setting: 'type' | 'assetClass' | 'valueField' | 'timeWindow' | 'colorScheme',
    value: any
  ) => {
    switch (setting) {
      case 'type':
        setCorrelationType(value);
        updateCorrelationData(trades, value, selectedAssetClass, valueField, timeWindow);
        break;
      case 'assetClass':
        setSelectedAssetClass(value);
        updateCorrelationData(trades, correlationType, value, valueField, timeWindow);
        break;
      case 'valueField':
        setValueField(value);
        updateCorrelationData(trades, correlationType, selectedAssetClass, value, timeWindow);
        break;
      case 'timeWindow':
        setTimeWindow(value);
        updateCorrelationData(trades, correlationType, selectedAssetClass, valueField, value);
        break;
      case 'colorScheme':
        setColorScheme(value);
        break;
    }
  };
  
  // Get title based on correlation type
  const getChartTitle = (): string => {
    switch (correlationType) {
      case 'cross-asset':
        return 'Cross-Asset Product Correlation';
      case 'maturity':
        return `${selectedAssetClass} Maturity Bucket Correlation`;
      case 'spread':
        return `${selectedAssetClass} Spread Correlation`;
      default:
        return 'Correlation Analysis';
    }
  };
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Correlation Analysis</h1>
          <p className="mt-2 text-gray-600">
            Analyze correlations between different asset classes, maturities, and product types.
          </p>
        </div>
        
        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="correlationType" className="block text-sm font-medium text-gray-700 mb-1">
                Correlation Type
              </label>
              <select
                id="correlationType"
                value={correlationType}
                onChange={(e) => handleSettingChange('type', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={isLoading}
              >
                <option value="cross-asset">Cross-Asset Correlation</option>
                <option value="maturity">Maturity Correlation</option>
                <option value="spread">Spread Correlation</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="assetClass" className="block text-sm font-medium text-gray-700 mb-1">
                Asset Class
              </label>
              <select
                id="assetClass"
                value={selectedAssetClass}
                onChange={(e) => handleSettingChange('assetClass', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={isLoading || correlationType === 'cross-asset'}
              >
                <option value="RATES">RATES</option>
                <option value="CREDITS">CREDITS</option>
                <option value="EQUITIES">EQUITIES</option>
                <option value="FOREX">FOREX</option>
                <option value="COMMODITIES">COMMODITIES</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="valueField" className="block text-sm font-medium text-gray-700 mb-1">
                Value Field
              </label>
              <select
                id="valueField"
                value={valueField}
                onChange={(e) => handleSettingChange('valueField', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={isLoading || correlationType === 'spread'}
              >
                <option value="notionalLeg1">Notional Amount</option>
                <option value="spreadLeg1">Spread/Rate</option>
                {correlationType !== 'maturity' && (
                  <option value="count">Trade Count</option>
                )}
              </select>
            </div>
            
            <div>
              <label htmlFor="timeWindow" className="block text-sm font-medium text-gray-700 mb-1">
                Time Window
              </label>
              <select
                id="timeWindow"
                value={timeWindow.toString()}
                onChange={(e) => handleSettingChange('timeWindow', parseInt(e.target.value))}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={isLoading || correlationType !== 'cross-asset'}
              >
                <option value={1000 * 60 * 60 * 4}>4 Hours</option>
                <option value={1000 * 60 * 60 * 12}>12 Hours</option>
                <option value={1000 * 60 * 60 * 24}>1 Day</option>
                <option value={1000 * 60 * 60 * 24 * 7}>1 Week</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="colorScheme" className="block text-sm font-medium text-gray-700 mb-1">
                Color Scheme
              </label>
              <select
                id="colorScheme"
                value={colorScheme}
                onChange={(e) => handleSettingChange('colorScheme', e.target.value)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="blue-red">Blue-Red</option>
                <option value="purple-green">Purple-Green</option>
                <option value="red-green">Red-Green</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={fetchTradeData}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Error display */}
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
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}
        
        {/* Correlation heatmap */}
        {!isLoading && correlationData && (
          <div className="mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <CorrelationHeatmapChart 
                data={correlationData}
                title={getChartTitle()}
                height={600}
                colorScheme={colorScheme}
                showValues={true}
              />
            </div>
          </div>
        )}
        
        {/* Explanation */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            About Correlation Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Cross-Asset Correlation</h3>
              <p className="text-gray-700 text-sm">
                This analysis shows how different product types correlate with each other across asset classes. 
                High positive correlation (close to 1) indicates that two products tend to move together. 
                Negative correlation (close to -1) means they tend to move in opposite directions.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Maturity Correlation</h3>
              <p className="text-gray-700 text-sm">
                Maturity correlation examines how different tenor buckets (time to maturity) relate to each other. 
                This can reveal term structure dynamics and how different parts of the yield curve move together.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Spread Correlation</h3>
              <p className="text-gray-700 text-sm">
                Spread correlation analyzes how spreads between different product types are related.
                This can help identify market inefficiencies, basis relationships, and relative value opportunities.
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interpretation Guide</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2">
              <li>
                <span className="font-medium">Perfect Positive Correlation (1.0):</span> Two variables move exactly together in the same direction.
              </li>
              <li>
                <span className="font-medium">Strong Positive Correlation (0.7 to 0.9):</span> Variables generally move in the same direction.
              </li>
              <li>
                <span className="font-medium">Moderate Positive Correlation (0.4 to 0.6):</span> Some tendency to move in the same direction.
              </li>
              <li>
                <span className="font-medium">No Correlation (0):</span> No discernible relationship between variables.
              </li>
              <li>
                <span className="font-medium">Moderate Negative Correlation (-0.4 to -0.6):</span> Some tendency to move in opposite directions.
              </li>
              <li>
                <span className="font-medium">Strong Negative Correlation (-0.7 to -0.9):</span> Variables generally move in opposite directions.
              </li>
              <li>
                <span className="font-medium">Perfect Negative Correlation (-1.0):</span> Two variables move exactly in opposite directions.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}