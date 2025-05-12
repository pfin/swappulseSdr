/**
 * Correlation Utilities
 * 
 * Utility functions for calculating correlations between different data series.
 */

import { DTCCTrade, AssetClass } from '@/types/dtcc';

interface TimeSeriesData {
  [key: string]: number[];
}

export interface CorrelationData {
  labels: string[];
  correlationMatrix: number[][];
}

/**
 * Calculate Pearson correlation coefficient between two arrays of numbers
 * 
 * @param x First array of numbers
 * @param y Second array of numbers
 * @returns Correlation coefficient between -1 and 1, or NaN if arrays don't match or have no variance
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    return NaN;
  }

  // Calculate means
  const n = x.length;
  const xMean = x.reduce((sum, val) => sum + val, 0) / n;
  const yMean = y.reduce((sum, val) => sum + val, 0) / n;

  // Calculate covariance and standard deviations
  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    covariance += xDiff * yDiff;
    xVariance += xDiff * xDiff;
    yVariance += yDiff * yDiff;
  }

  // Handle zero variance
  if (xVariance === 0 || yVariance === 0) {
    return NaN;
  }

  // Calculate correlation coefficient
  return covariance / (Math.sqrt(xVariance) * Math.sqrt(yVariance));
}

/**
 * Calculate correlation matrix for a set of time series data
 * 
 * @param timeSeriesData Object mapping keys to arrays of numeric values
 * @returns Correlation data with labels and matrix
 */
export function calculateCorrelationMatrix(timeSeriesData: TimeSeriesData): CorrelationData {
  const keys = Object.keys(timeSeriesData);
  const n = keys.length;
  
  // Initialize correlation matrix with zeros
  const correlationMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  // Calculate correlations for each pair of time series
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // Diagonal is always 1 (self-correlation)
        correlationMatrix[i][j] = 1;
      } else if (i < j) {
        // Calculate correlation
        const correlation = calculateCorrelation(
          timeSeriesData[keys[i]],
          timeSeriesData[keys[j]]
        );
        
        // Store calculated value (handle NaN)
        correlationMatrix[i][j] = isNaN(correlation) ? 0 : correlation;
        
        // Matrix is symmetric
        correlationMatrix[j][i] = correlationMatrix[i][j];
      }
    }
  }
  
  return {
    labels: keys,
    correlationMatrix
  };
}

/**
 * Extract time series data from DTCC trades
 * 
 * @param trades Array of DTCC trades
 * @param groupBy Field to group trades by (e.g., 'productType', 'underlying', 'assetClass')
 * @param valueField Field to use for values (e.g., 'notionalLeg1', 'spreadLeg1')
 * @param timeWindow Time window to group trades in (in milliseconds)
 * @returns Time series data for each group
 */
export function extractTimeSeriesFromTrades(
  trades: DTCCTrade[],
  groupBy: keyof DTCCTrade,
  valueField: keyof DTCCTrade,
  timeWindow: number = 1000 * 60 * 60 * 24 // Default: 1 day
): TimeSeriesData {
  // Error handling for invalid inputs
  if (!trades.length) {
    return {};
  }
  
  // Sort trades by execution timestamp
  const sortedTrades = [...trades].sort(
    (a, b) => a.executionTimestamp.getTime() - b.executionTimestamp.getTime()
  );
  
  // Get the time range of the trades
  const startTime = sortedTrades[0].executionTimestamp.getTime();
  const endTime = sortedTrades[sortedTrades.length - 1].executionTimestamp.getTime();
  
  // Create time buckets
  const numBuckets = Math.ceil((endTime - startTime) / timeWindow);
  
  // Extract unique groups
  const groups = new Set<string>();
  sortedTrades.forEach(trade => {
    const groupValue = trade[groupBy];
    if (groupValue !== null && groupValue !== undefined) {
      groups.add(String(groupValue));
    }
  });
  
  // Initialize time series for each group
  const timeSeriesData: TimeSeriesData = {};
  groups.forEach(group => {
    timeSeriesData[group] = Array(numBuckets).fill(0);
  });
  
  // Populate time series data
  sortedTrades.forEach(trade => {
    const groupValue = trade[groupBy];
    if (groupValue === null || groupValue === undefined) {
      return;
    }
    
    const group = String(groupValue);
    const timeOffset = trade.executionTimestamp.getTime() - startTime;
    const bucketIndex = Math.floor(timeOffset / timeWindow);
    
    // Get the numeric value from the trade
    let value = 0;
    if (valueField === 'notionalLeg1' || valueField === 'notionalLeg2' || 
        valueField === 'spreadLeg1' || valueField === 'spreadLeg2' || 
        valueField === 'strikePrice' || valueField === 'otherPaymentAmount') {
      value = parseFloat(String(trade[valueField]) || '0');
      if (isNaN(value)) {
        value = 0;
      }
    } else {
      // For non-numeric fields, just count occurrences
      value = 1;
    }
    
    // Add the value to the appropriate bucket
    if (bucketIndex >= 0 && bucketIndex < numBuckets) {
      timeSeriesData[group][bucketIndex] += value;
    }
  });
  
  // Filter out groups with no data or only zeros
  Object.keys(timeSeriesData).forEach(group => {
    const nonZeroValues = timeSeriesData[group].filter(v => v !== 0);
    if (nonZeroValues.length === 0) {
      delete timeSeriesData[group];
    }
  });
  
  return timeSeriesData;
}

/**
 * Calculate cross-asset correlations
 * 
 * @param trades Array of DTCC trades
 * @param assetClasses Asset classes to include
 * @param valueField Field to use for values (e.g., 'notionalLeg1')
 * @param timeWindow Time window to group trades in (in milliseconds)
 * @returns Correlation data for cross-asset analysis
 */
export function calculateCrossAssetCorrelations(
  trades: DTCCTrade[],
  assetClasses: AssetClass[] | null = null,
  valueField: keyof DTCCTrade = 'notionalLeg1',
  timeWindow: number = 1000 * 60 * 60 * 24 // Default: 1 day
): CorrelationData {
  // Filter trades by asset class if specified
  const filteredTrades = assetClasses 
    ? trades.filter(trade => assetClasses.includes(trade.assetClass))
    : trades;
  
  // Extract product time series
  const timeSeriesData = extractTimeSeriesFromTrades(
    filteredTrades,
    'productType',
    valueField,
    timeWindow
  );
  
  // Calculate correlation matrix
  return calculateCorrelationMatrix(timeSeriesData);
}

/**
 * Calculate maturity correlations (tenor correlations)
 * 
 * @param trades Array of DTCC trades
 * @param assetClass Asset class to analyze
 * @param valueField Field to use for values (e.g., 'spreadLeg1')
 * @returns Correlation data for maturity analysis
 */
export function calculateMaturityCorrelations(
  trades: DTCCTrade[],
  assetClass: AssetClass,
  valueField: keyof DTCCTrade = 'spreadLeg1'
): CorrelationData {
  // Filter trades by asset class
  const filteredTrades = trades.filter(trade => trade.assetClass === assetClass);
  
  // Group trades by maturity buckets
  const maturityBuckets: Record<string, DTCCTrade[]> = {
    '0-3M': [],
    '3-6M': [],
    '6-12M': [],
    '1-2Y': [],
    '2-5Y': [],
    '5-10Y': [],
    '10Y+': [],
  };
  
  filteredTrades.forEach(trade => {
    if (!trade.effectiveDate || !trade.expirationDate) return;
    
    // Calculate maturity in months
    const effectiveDate = trade.effectiveDate.getTime();
    const expirationDate = trade.expirationDate.getTime();
    const maturityMonths = (expirationDate - effectiveDate) / (1000 * 60 * 60 * 24 * 30);
    
    // Assign to appropriate bucket
    if (maturityMonths <= 3) {
      maturityBuckets['0-3M'].push(trade);
    } else if (maturityMonths <= 6) {
      maturityBuckets['3-6M'].push(trade);
    } else if (maturityMonths <= 12) {
      maturityBuckets['6-12M'].push(trade);
    } else if (maturityMonths <= 24) {
      maturityBuckets['1-2Y'].push(trade);
    } else if (maturityMonths <= 60) {
      maturityBuckets['2-5Y'].push(trade);
    } else if (maturityMonths <= 120) {
      maturityBuckets['5-10Y'].push(trade);
    } else {
      maturityBuckets['10Y+'].push(trade);
    }
  });
  
  // Extract time series for each maturity bucket
  const timeSeriesData: TimeSeriesData = {};
  
  Object.entries(maturityBuckets).forEach(([bucket, bucketTrades]) => {
    if (bucketTrades.length > 0) {
      // Sort trades by timestamp
      const sortedTrades = [...bucketTrades].sort(
        (a, b) => a.executionTimestamp.getTime() - b.executionTimestamp.getTime()
      );
      
      // Get values by date 
      const valuesByDate: Record<string, number[]> = {};
      
      sortedTrades.forEach(trade => {
        const dateKey = trade.executionTimestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        
        let value = 0;
        if (valueField === 'notionalLeg1' || valueField === 'notionalLeg2' || 
            valueField === 'spreadLeg1' || valueField === 'spreadLeg2' || 
            valueField === 'strikePrice' || valueField === 'otherPaymentAmount') {
          value = parseFloat(String(trade[valueField]) || '0');
          if (isNaN(value)) {
            value = 0;
          }
        } else {
          value = 1;
        }
        
        if (!valuesByDate[dateKey]) {
          valuesByDate[dateKey] = [];
        }
        
        valuesByDate[dateKey].push(value);
      });
      
      // Calculate daily averages
      timeSeriesData[bucket] = Object.values(valuesByDate).map(values => {
        const sum = values.reduce((acc, val) => acc + val, 0);
        return values.length > 0 ? sum / values.length : 0;
      });
    }
  });
  
  // Filter out buckets with insufficient data
  Object.keys(timeSeriesData).forEach(bucket => {
    if (timeSeriesData[bucket].length < 2) {
      delete timeSeriesData[bucket];
    }
  });
  
  // Calculate correlation matrix
  return calculateCorrelationMatrix(timeSeriesData);
}

/**
 * Calculate spread correlations between different products
 * 
 * @param trades Array of DTCC trades
 * @param assetClass Asset class to analyze
 * @returns Correlation data for spread analysis
 */
export function calculateSpreadCorrelations(
  trades: DTCCTrade[],
  assetClass: AssetClass
): CorrelationData {
  // Filter trades by asset class and those with spread data
  const filteredTrades = trades.filter(
    trade => trade.assetClass === assetClass && trade.spreadLeg1 !== null
  );
  
  // Extract time series grouped by product type
  return calculateCorrelationMatrix(
    extractTimeSeriesFromTrades(filteredTrades, 'productType', 'spreadLeg1')
  );
}