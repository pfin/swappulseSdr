/**
 * Type definitions for DTCC SDR data
 */

export type AssetClass = 'RATES' | 'CREDITS' | 'EQUITIES' | 'FOREX' | 'COMMODITIES';
export type Agency = 'CFTC' | 'SEC';

export interface DTCCTrade {
  // Timestamps
  eventTimestamp: Date;          // When the trade event was reported
  executionTimestamp: Date;      // When the trade was executed
  effectiveDate: Date | null;    // Start date of the trade
  expirationDate: Date | null;   // End date of the trade
  
  // Notional amounts
  notionalLeg1: string | null;   // Notional amount for the first leg
  notionalLeg2: string | null;   // Notional amount for the second leg (if applicable)
  
  // Spreads
  spreadLeg1: string | null;     // Spread for the first leg
  spreadLeg2: string | null;     // Spread for the second leg (if applicable)
  
  // Option information
  strikePrice: string | null;    // For option-related trades
  
  // Other fields
  otherPaymentAmount: string | null;   // Additional payments
  actionType: string | null;           // Type of action (NEW, MODIFY, etc.)
  
  // Product information
  assetClass: AssetClass;             // Asset class (RATES, CREDITS, etc.)
  productType: string | null;         // Product type 
  underlying: string | null;          // Underlying asset
  
  // Raw data
  rawData: Record<string, any>;       // Raw data from DTCC
}

export interface DTCCFetchParams {
  agency: Agency;
  assetClass: AssetClass;
  startDate: Date;
  endDate: Date;
  maxConcurrentTasks?: number;
  maxKeepAliveConnections?: number;
  parallelize?: boolean;
  maxExtractionWorkers?: number;
  useCache?: boolean;
}

export interface DTCCIntraDayParams extends Omit<DTCCFetchParams, 'startDate' | 'endDate'> {
  startTimestamp?: Date;         // Deprecated: intraday data uses batch IDs, not timestamps
  endTimestamp?: Date;           // Deprecated: intraday data uses batch IDs, not timestamps
  
  // For cumulative data fetching
  minSliceId?: number;           // The first slice ID to fetch (default: 1)
  
  // For monitoring new data
  lastKnownSliceId?: number;     // The last slice ID that was previously fetched
}

export interface DTCCResponse {
  trades: DTCCTrade[];
  metadata: {
    count: number;
    startDate: Date;
    endDate: Date;
    agency: Agency;
    assetClass: AssetClass;
    fetchDuration: number;
    cacheHit?: boolean;
    // For intraday data
    highestSliceId?: number;     // The highest slice ID available
    processedSliceIds?: number[]; // The slice IDs that were processed in this request
  };
}

export interface DTCCHeaders {
  authority: string;
  method: string;
  path: string;
  scheme: string;
  accept: string;
  'accept-encoding': string;
  'accept-language': string;
  dnt: string;
  priority: string;
  referer: string;
  'sec-ch-ua': string;
  'sec-ch-ua-mobile': string;
  'sec-ch-ua-platform': string;
  'sec-fetch-dest': string;
  'sec-fetch-mode': string;
  'sec-fetch-site': string;
  'user-agent': string;
  [key: string]: string; // Add index signature for compatibility with Axios headers
}

export interface DTCCAnalytics {
  totalTrades: number;
  volumeByProduct: Record<string, number>;
  tradeSizeDistribution: Record<string, number>;
  timeDistribution: Record<string, number>;
  largestTrades: DTCCTrade[];
}

export interface TradeFilters {
  productTypes?: string[];
  minNotional?: number;
  maxNotional?: number;
  startDate?: Date;
  endDate?: Date;
  assetClass?: AssetClass;
}

export interface DTCCError extends Error {
  code: string;
  response?: any;
}