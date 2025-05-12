/**
 * DTCC SDR Service
 * 
 * This service integrates the fetcher, processor, and cache components
 * to provide a high-level interface for working with DTCC data.
 */

import { 
  DTCCTrade, 
  DTCCFetchParams, 
  DTCCIntraDayParams, 
  DTCCAnalytics,
  DTCCResponse,
  TradeFilters,
  Agency,
  AssetClass
} from '@/types/dtcc';
import { DTCCFetcher } from './dtccFetcher';
import { DTCCProcessor } from './dtccProcessor';
import { DTCCCache } from './dtccCache';
import { format } from 'date-fns';

interface DTCCServiceOptions {
  cacheEnabled?: boolean;
  maxConcurrentTasks?: number;
  requestTimeout?: number;
}

export class DTCCService {
  private fetcher: DTCCFetcher;
  private processor: DTCCProcessor;
  private cache: DTCCCache;
  private lastKnownSliceIds: Record<string, number> = {}; // Track last known slice ID for each agency/assetClass

  constructor(options: DTCCServiceOptions = {}) {
    const {
      cacheEnabled = true,
      requestTimeout = 30000,
      maxConcurrentTasks = 5
    } = options;

    this.fetcher = new DTCCFetcher({
      cacheEnabled,
      timeout: requestTimeout
    });

    this.processor = new DTCCProcessor();

    this.cache = new DTCCCache({
      maxSize: 100,
      ttl: 24 * 60 * 60 * 1000 // 24 hours
    });

    this.cache.setEnabled(cacheEnabled);
  }
  
  /**
   * Fetch historical DTCC data
   */
  public async fetchHistoricalData(params: DTCCFetchParams): Promise<DTCCResponse> {
    const startTime = Date.now();
    
    try {
      // Try to get from cache first
      const cachedData = await this.getFromCache(params);
      
      if (cachedData) {
        const endTime = Date.now();
        
        return {
          trades: cachedData,
          metadata: {
            count: cachedData.length,
            startDate: params.startDate,
            endDate: params.endDate,
            agency: params.agency,
            assetClass: params.assetClass,
            fetchDuration: endTime - startTime,
            cacheHit: true
          }
        };
      }
      
      // Fetch from DTCC API
      const trades = await this.fetcher.fetchHistoricalReports(params);
      
      // Store in cache
      await this.storeInCache(params, trades);
      
      const endTime = Date.now();
      
      return {
        trades,
        metadata: {
          count: trades.length,
          startDate: params.startDate,
          endDate: params.endDate,
          agency: params.agency,
          assetClass: params.assetClass,
          fetchDuration: endTime - startTime,
          cacheHit: false
        }
      };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      
      return {
        trades: [],
        metadata: {
          count: 0,
          startDate: params.startDate,
          endDate: params.endDate,
          agency: params.agency,
          assetClass: params.assetClass,
          fetchDuration: Date.now() - startTime,
          cacheHit: false
        }
      };
    }
  }
  
  /**
   * Fetch intraday DTCC data
   * Uses a batch-based approach to fetch all sequential batch files
   * Each batch file contains new trades since the previous batch
   */
  public async fetchIntradayData(params: DTCCIntraDayParams): Promise<DTCCResponse> {
    const startTime = Date.now();
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    try {
      const {
        agency,
        assetClass,
        minSliceId = 1,
        lastKnownSliceId,
        useCache = true
      } = params;

      // Generate cache key for today's intraday data
      const cacheKey = `${agency}_${assetClass}_${todayStr}_intraday`;

      // Use either the provided lastKnownSliceId or the tracked one
      const effectiveLastKnownSliceId = lastKnownSliceId || this.lastKnownSliceIds[cacheKey] || 0;

      let accumTrades: DTCCTrade[] = [];
      let cacheHit = false;

      // Try to get accumulated data from cache if useCache is true
      if (useCache) {
        const cachedData = await this.getIntradayFromCache(agency, assetClass);

        if (cachedData && cachedData.trades.length > 0) {
          accumTrades = cachedData.trades;
          cacheHit = true;
          console.log(`Found ${accumTrades.length} cached intraday trades for ${agency}-${assetClass}`);
        }
      }

      // If we have a last known slice ID and it matches the highest slice ID in cache,
      // we can return the cached data without fetching new batches
      if (cacheHit &&
          effectiveLastKnownSliceId > 0 &&
          effectiveLastKnownSliceId === this.lastKnownSliceIds[cacheKey]) {

        const endTime = Date.now();
        return {
          trades: accumTrades,
          metadata: {
            count: accumTrades.length,
            startDate: today,
            endDate: today,
            agency,
            assetClass,
            fetchDuration: endTime - startTime,
            cacheHit: true,
            highestSliceId: effectiveLastKnownSliceId,
            processedSliceIds: [],
            lastUpdated: new Date()
          }
        };
      }

      // Fetch new batches from DTCC API
      console.log(`Fetching intraday batches for ${agency}-${assetClass} starting from batch ${effectiveLastKnownSliceId + 1}`);

      const { trades: newTrades, highestSliceId, processedSliceIds } =
        await this.fetcher.fetchIntradayReports({
          agency,
          assetClass,
          minSliceId,
          lastKnownSliceId: effectiveLastKnownSliceId
        });

      // If we processed new batches, add them to our accumulated trades
      if (newTrades.length > 0) {
        // Combine with cached trades to get full dataset
        accumTrades = [...accumTrades, ...newTrades];

        // Update the last known slice ID for this agency/assetClass
        this.lastKnownSliceIds[cacheKey] = highestSliceId;

        // Store the updated accumulated trades in cache
        await this.storeIntradayInCache(agency, assetClass, accumTrades, highestSliceId);

        console.log(`Added ${newTrades.length} new trades from batches ${processedSliceIds.join(', ')}`);
        console.log(`Total accumulated trades: ${accumTrades.length}`);
      }

      const endTime = Date.now();

      // Return the accumulated trades and metadata
      return {
        trades: accumTrades,
        metadata: {
          count: accumTrades.length,
          startDate: today,
          endDate: today,
          agency,
          assetClass,
          fetchDuration: endTime - startTime,
          cacheHit: processedSliceIds.length === 0, // Cache hit if we didn't need to process new slices
          highestSliceId,
          processedSliceIds,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Error fetching intraday data:', error);

      return {
        trades: [],
        metadata: {
          count: 0,
          startDate: today,
          endDate: today,
          agency: params.agency,
          assetClass: params.assetClass,
          fetchDuration: Date.now() - startTime,
          cacheHit: false,
          lastUpdated: new Date()
        }
      };
    }
  }

  /**
   * Check for new intraday data since the last known batch
   * This is useful for polling to keep data current
   */
  public async checkForNewIntradayData(
    agency: Agency,
    assetClass: AssetClass
  ): Promise<DTCCResponse> {
    const today = new Date();
    const cacheKey = `${agency}_${assetClass}_${format(today, 'yyyy-MM-dd')}_intraday`;

    // Get the last known slice ID
    const lastKnownSliceId = this.lastKnownSliceIds[cacheKey] || 0;

    // Fetch only new data since the last known slice ID
    return await this.fetchIntradayData({
      agency,
      assetClass,
      lastKnownSliceId,
      useCache: true
    });
  }
  
  /**
   * Fetch all DTCC data (historical + intraday)
   * Combines historical data with accumulated intraday data
   */
  public async fetchAllData(params: DTCCFetchParams): Promise<DTCCResponse> {
    const startTime = Date.now();

    try {
      // Fetch historical data
      const historicalResponse = await this.fetchHistoricalData(params);

      // Check if we need intraday data
      const today = new Date();
      const needsIntraday = params.endDate >= today;

      if (needsIntraday) {
        // Fetch intraday data using the batch-based approach
        const intradayParams: DTCCIntraDayParams = {
          agency: params.agency,
          assetClass: params.assetClass,
          minSliceId: 1, // Start from the first batch
          useCache: params.useCache
        };

        const intradayResponse = await this.fetchIntradayData(intradayParams);

        // Combine results
        const combinedTrades = [
          ...historicalResponse.trades,
          ...intradayResponse.trades
        ];

        const endTime = Date.now();

        return {
          trades: combinedTrades,
          metadata: {
            count: combinedTrades.length,
            startDate: params.startDate,
            endDate: params.endDate,
            agency: params.agency,
            assetClass: params.assetClass,
            fetchDuration: endTime - startTime,
            cacheHit: historicalResponse.metadata.cacheHit && intradayResponse.metadata.cacheHit,
            highestSliceId: intradayResponse.metadata.highestSliceId,
            processedSliceIds: intradayResponse.metadata.processedSliceIds,
            lastUpdated: intradayResponse.metadata.lastUpdated
          }
        };
      }

      return historicalResponse;
    } catch (error) {
      console.error('Error fetching all data:', error);

      return {
        trades: [],
        metadata: {
          count: 0,
          startDate: params.startDate,
          endDate: params.endDate,
          agency: params.agency,
          assetClass: params.assetClass,
          fetchDuration: Date.now() - startTime,
          cacheHit: false
        }
      };
    }
  }
  
  /**
   * Filter trades based on criteria
   */
  public filterTrades(trades: DTCCTrade[], filters: TradeFilters): DTCCTrade[] {
    return this.processor.filterTrades(trades, filters);
  }
  
  /**
   * Generate analytics from trade data
   */
  public generateAnalytics(trades: DTCCTrade[]): DTCCAnalytics {
    return this.processor.generateAnalytics(trades);
  }
  
  /**
   * Get from cache with date-specific key
   */
  private async getFromCache(params: DTCCFetchParams): Promise<DTCCTrade[] | null> {
    const { agency, assetClass, startDate, endDate } = params;

    // If date range is more than one day, we can't use cache
    if (startDate.getTime() !== endDate.getTime()) {
      return null;
    }

    const dateString = format(startDate, 'yyyy-MM-dd');

    return await this.cache.get({
      agency,
      assetClass,
      date: dateString,
      isIntraday: false
    });
  }

  /**
   * Store in cache with date-specific key
   */
  private async storeInCache(params: DTCCFetchParams, trades: DTCCTrade[]): Promise<void> {
    const { agency, assetClass, startDate, endDate } = params;

    // If date range is more than one day, we can't cache
    if (startDate.getTime() !== endDate.getTime()) {
      return;
    }

    const dateString = format(startDate, 'yyyy-MM-dd');

    await this.cache.set({
      agency,
      assetClass,
      date: dateString,
      isIntraday: false
    }, trades);
  }

  /**
   * Get intraday data from cache
   */
  private async getIntradayFromCache(
    agency: Agency,
    assetClass: AssetClass
  ): Promise<{ trades: DTCCTrade[], highestSliceId: number } | null> {
    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');

    const cacheKey = `${agency}_${assetClass}_${dateString}_intraday`;

    // Get the cached data
    const cachedTrades = await this.cache.get({
      agency,
      assetClass,
      date: dateString,
      isIntraday: true
    });

    if (!cachedTrades) {
      return null;
    }

    // Get the highest slice ID
    const highestSliceId = this.lastKnownSliceIds[cacheKey] || 0;

    return {
      trades: cachedTrades,
      highestSliceId
    };
  }

  /**
   * Store intraday data in cache
   */
  private async storeIntradayInCache(
    agency: Agency,
    assetClass: AssetClass,
    trades: DTCCTrade[],
    highestSliceId: number
  ): Promise<void> {
    const today = new Date();
    const dateString = format(today, 'yyyy-MM-dd');

    const cacheKey = `${agency}_${assetClass}_${dateString}_intraday`;

    // Store the trades
    await this.cache.set({
      agency,
      assetClass,
      date: dateString,
      isIntraday: true
    }, trades);

    // Update the last known slice ID
    this.lastKnownSliceIds[cacheKey] = highestSliceId;
  }

  /**
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    await this.cache.clear();

    // Also clear the last known slice IDs
    this.lastKnownSliceIds = {};
  }
}