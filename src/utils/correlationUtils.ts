/**
 * Correlation Utilities
 *
 * Utility functions for calculating correlations between different data series.
 * Optimized for performance and memory usage with improved error handling.
 */

import { DTCCTrade, AssetClass } from '@/types/dtcc';

interface TimeSeriesData {
  [key: string]: number[];
}

export interface CorrelationData {
  labels: string[];
  correlationMatrix: number[][];
}

// Cache for correlation calculations to avoid redundant calculations
const correlationCache = new Map<string, number>();

/**
 * Extract numeric value from a trade field
 *
 * @param trade DTCC trade object
 * @param field Field to extract value from
 * @returns Numeric value or 0 if not a valid number
 */
function extractNumericValue(trade: DTCCTrade, field: keyof DTCCTrade | 'count'): number {
  // Special handling for numeric string fields
  if (field === 'notionalLeg1' || field === 'notionalLeg2' ||
      field === 'spreadLeg1' || field === 'spreadLeg2' ||
      field === 'strikePrice' || field === 'otherPaymentAmount') {
    // Only try to parse if the field exists
    if (trade[field] === undefined || trade[field] === null) return 0;

    const value = parseFloat(String(trade[field]) || '0');
    return isNaN(value) ? 0 : value;
  }

  // Special handling for 'count' pseudo-field
  if (field === 'count') {
    return 1; // Just count occurrences
  }

  // Default fallback - use 1 for occurrence counting
  return 1;
}

/**
 * Calculate Pearson correlation coefficient between two arrays of numbers
 * with memoization for performance
 *
 * @param x First array of numbers
 * @param y Second array of numbers
 * @returns Correlation coefficient between -1 and 1, or NaN if arrays don't match or have no variance
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  // Validate inputs
  if (!Array.isArray(x) || !Array.isArray(y) ||
      x.length !== y.length || x.length < 2) {
    return NaN;
  }

  // Create a cache key by hashing the arrays
  // Note: This is a simplified hash and might have collisions,
  // but it's a good balance for performance
  const cacheKey = `${x.length}:${x.reduce((h, v) => h + v, 0)}:${y.reduce((h, v) => h + v, 0)}`;

  // Check if result is already in cache
  if (correlationCache.has(cacheKey)) {
    return correlationCache.get(cacheKey)!;
  }

  // Calculate means in a single pass
  const n = x.length;
  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const xMean = sumX / n;
  const yMean = sumY / n;

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
  const correlation = covariance / (Math.sqrt(xVariance) * Math.sqrt(yVariance));

  // Store in cache (limit cache size to prevent memory leaks)
  if (correlationCache.size > 1000) {
    // Clear the first 200 entries when we reach 1000
    const keysToDelete = Array.from(correlationCache.keys()).slice(0, 200);
    keysToDelete.forEach(key => correlationCache.delete(key));
  }
  correlationCache.set(cacheKey, correlation);

  return correlation;
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

  // Return empty result for empty input
  if (n === 0) {
    return { labels: [], correlationMatrix: [] };
  }

  // Initialize correlation matrix with zeros
  const correlationMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  // Calculate correlations for each pair of time series
  for (let i = 0; i < n; i++) {
    // Diagonal is always 1 (self-correlation)
    correlationMatrix[i][i] = 1;

    // Only calculate for half the matrix (upper triangle)
    for (let j = i + 1; j < n; j++) {
      // Calculate correlation
      const correlation = calculateCorrelation(
        timeSeriesData[keys[i]],
        timeSeriesData[keys[j]]
      );

      // Handle NaN values explicitly - keep them as NaN
      // This is more correct than replacing with 0
      correlationMatrix[i][j] = correlation;

      // Matrix is symmetric
      correlationMatrix[j][i] = correlation;
    }
  }

  return {
    labels: keys,
    correlationMatrix
  };
}

/**
 * Extract time series data from DTCC trades
 * With optimized single-pass processing for memory efficiency
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
  valueField: keyof DTCCTrade | 'count',
  timeWindow: number = 1000 * 60 * 60 * 24 // Default: 1 day
): TimeSeriesData {
  // Error handling for invalid inputs
  if (!trades || !trades.length) {
    return {};
  }

  // Process in a single pass with optimized handling
  let minTime = Infinity;
  let maxTime = -Infinity;
  const groupData: Record<string, Record<number, number>> = {};

  // First pass: find time range and initialize groups
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];

    // Skip trades with missing timestamp
    if (!trade.executionTimestamp) continue;

    const timestamp = trade.executionTimestamp.getTime();
    minTime = Math.min(minTime, timestamp);
    maxTime = Math.max(maxTime, timestamp);

    // Initialize groups
    const groupValue = trade[groupBy];

    // Skip if group value is missing
    if (groupValue === null || groupValue === undefined) continue;

    const group = String(groupValue);
    if (!groupData[group]) {
      groupData[group] = {};
    }
  }

  // Handle empty dataset edge case
  if (minTime === Infinity || maxTime === -Infinity) {
    return {};
  }

  // Create time buckets
  const numBuckets = Math.ceil((maxTime - minTime) / timeWindow);

  // Second pass: populate time series data
  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];

    // Skip trades with missing timestamp or group
    if (!trade.executionTimestamp) continue;

    const groupValue = trade[groupBy];
    if (groupValue === null || groupValue === undefined) continue;

    const group = String(groupValue);
    const timeOffset = trade.executionTimestamp.getTime() - minTime;
    const bucketIndex = Math.floor(timeOffset / timeWindow);

    // Skip invalid bucket indices
    if (bucketIndex < 0 || bucketIndex >= numBuckets) continue;

    // Extract value safely and add to bucket
    const value = extractNumericValue(trade, valueField);

    // Accumulate in the appropriate bucket
    if (!groupData[group][bucketIndex]) {
      groupData[group][bucketIndex] = 0;
    }
    groupData[group][bucketIndex] += value;
  }

  // Convert to time series arrays
  const timeSeriesData: TimeSeriesData = {};

  for (const group in groupData) {
    // Create array for this group
    const timeSeries = new Array(numBuckets).fill(0);

    // Populate with data
    for (const bucketIndex in groupData[group]) {
      timeSeries[+bucketIndex] = groupData[group][+bucketIndex];
    }

    // Only include groups with some non-zero values
    if (timeSeries.some(v => v !== 0)) {
      timeSeriesData[group] = timeSeries;
    }
  }

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
  try {
    // Validate inputs
    if (!trades || !trades.length) {
      return { labels: [], correlationMatrix: [] };
    }

    // Filter trades by asset class if specified
    const filteredTrades = assetClasses && assetClasses.length > 0
      ? trades.filter(trade => trade.assetClass && assetClasses.includes(trade.assetClass))
      : trades;

    // Exit early if filtering resulted in empty dataset
    if (!filteredTrades.length) {
      return { labels: [], correlationMatrix: [] };
    }

    // Extract product time series
    const timeSeriesData = extractTimeSeriesFromTrades(
      filteredTrades,
      'productType',
      valueField,
      timeWindow
    );

    // Calculate correlation matrix
    return calculateCorrelationMatrix(timeSeriesData);
  } catch (error) {
    console.error('Error in calculateCrossAssetCorrelations:', error);
    return { labels: [], correlationMatrix: [] };
  }
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
  try {
    // Validate inputs
    if (!trades || !trades.length || !assetClass) {
      return { labels: [], correlationMatrix: [] };
    }

    // Filter trades by asset class
    const filteredTrades = trades.filter(trade =>
      trade.assetClass === assetClass &&
      trade.effectiveDate &&
      trade.expirationDate
    );

    // Exit early if filtering resulted in empty dataset
    if (!filteredTrades.length) {
      return { labels: [], correlationMatrix: [] };
    }

    // Group trades by maturity buckets in a single pass
    const maturityBuckets: Record<string, number[]> = {
      '0-3M': [],
      '3-6M': [],
      '6-12M': [],
      '1-2Y': [],
      '2-5Y': [],
      '5-10Y': [],
      '10Y+': [],
    };

    // Organize trades by date and bucket
    const tradesByDateAndBucket: Record<string, Record<string, number[]>> = {};

    filteredTrades.forEach(trade => {
      if (!trade.effectiveDate || !trade.expirationDate || !trade.executionTimestamp) return;

      // Calculate maturity in months
      const effectiveDate = trade.effectiveDate.getTime();
      const expirationDate = trade.expirationDate.getTime();
      const maturityMonths = (expirationDate - effectiveDate) / (1000 * 60 * 60 * 24 * 30);

      // Determine bucket
      let bucket: string;
      if (maturityMonths <= 3) {
        bucket = '0-3M';
      } else if (maturityMonths <= 6) {
        bucket = '3-6M';
      } else if (maturityMonths <= 12) {
        bucket = '6-12M';
      } else if (maturityMonths <= 24) {
        bucket = '1-2Y';
      } else if (maturityMonths <= 60) {
        bucket = '2-5Y';
      } else if (maturityMonths <= 120) {
        bucket = '5-10Y';
      } else {
        bucket = '10Y+';
      }

      // Extract value
      const value = extractNumericValue(trade, valueField);

      // Group by date key
      const dateKey = trade.executionTimestamp.toISOString().split('T')[0]; // YYYY-MM-DD

      // Initialize nested structure if needed
      if (!tradesByDateAndBucket[dateKey]) {
        tradesByDateAndBucket[dateKey] = {};
      }
      if (!tradesByDateAndBucket[dateKey][bucket]) {
        tradesByDateAndBucket[dateKey][bucket] = [];
      }

      // Add value to appropriate bucket for this date
      tradesByDateAndBucket[dateKey][bucket].push(value);
    });

    // Calculate daily averages for each bucket
    const timeSeriesData: TimeSeriesData = {};

    // Process each bucket across all dates
    Object.keys(maturityBuckets).forEach(bucket => {
      const bucketSeries: number[] = [];

      // Process each date in chronological order
      const sortedDates = Object.keys(tradesByDateAndBucket).sort();

      sortedDates.forEach(date => {
        const valuesForDateAndBucket = tradesByDateAndBucket[date]?.[bucket] || [];

        if (valuesForDateAndBucket.length > 0) {
          // Calculate average for this date and bucket
          const sum = valuesForDateAndBucket.reduce((acc, val) => acc + val, 0);
          const avg = sum / valuesForDateAndBucket.length;
          bucketSeries.push(avg);
        } else if (bucketSeries.length > 0) {
          // Fill gaps with previous value or zero
          bucketSeries.push(bucketSeries[bucketSeries.length - 1]);
        }
      });

      // Only include buckets with sufficient data
      if (bucketSeries.length >= 2) {
        timeSeriesData[bucket] = bucketSeries;
      }
    });

    // Calculate correlation matrix
    return calculateCorrelationMatrix(timeSeriesData);
  } catch (error) {
    console.error('Error in calculateMaturityCorrelations:', error);
    return { labels: [], correlationMatrix: [] };
  }
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
  try {
    // Validate inputs
    if (!trades || !trades.length || !assetClass) {
      return { labels: [], correlationMatrix: [] };
    }

    // Filter trades by asset class and those with spread data
    const filteredTrades = trades.filter(
      trade => trade.assetClass === assetClass &&
               trade.spreadLeg1 !== null &&
               trade.productType !== null
    );

    // Exit early if filtering resulted in empty dataset
    if (!filteredTrades.length) {
      return { labels: [], correlationMatrix: [] };
    }

    // Extract time series grouped by product type
    const timeSeriesData = extractTimeSeriesFromTrades(
      filteredTrades,
      'productType',
      'spreadLeg1'
    );

    // Calculate correlation matrix
    return calculateCorrelationMatrix(timeSeriesData);
  } catch (error) {
    console.error('Error in calculateSpreadCorrelations:', error);
    return { labels: [], correlationMatrix: [] };
  }
}