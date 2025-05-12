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

// Cache key for storing the last processed intraday slice ID
const LAST_SLICE_ID_CACHE_KEY = 'last_slice_id';

export class DTCCService {
  private fetcher: DTCCFetcher;
  private processor: DTCCProcessor;
  private cache: DTCCCache;
  private lastKnownSliceIds: Record<string, number> = {}; // Keep track of last known slice IDs
  
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
   * 
   * This method fetches intraday data, which consists of sequential batch files
   * that are published throughout the day. Each batch file contains new trades
   * that should be added to the accumulated dataset.
   */
  public async fetchIntradayData(params: DTCCIntraDayParams): Promise<DTCCResponse> {
    const startTime = Date.now();
    const today = new Date();
    const cacheKey = `${params.agency}_${params.assetClass}_${format(today, 'yyyy-MM-dd')}`;
    
    try {
      // Determine which slice ID to start from
      let minSliceId = params.minSliceId || 1; // Default to the first slice
      
      // If lastKnownSliceId is provided, use it to fetch only new slices
      if (params.lastKnownSliceId) {
        minSliceId = params.lastKnownSliceId + 1;
        console.log(`Starting from slice ID ${minSliceId} based on last known slice ID ${params.lastKnownSliceId}`);
      } else if (this.lastKnownSliceIds[cacheKey]) {
        // Use the last known slice ID from memory
        minSliceId = this.lastKnownSliceIds[cacheKey] + 1;
        console.log(`Starting from slice ID ${minSliceId} based on last known slice ID in memory`);
      } else {
        // Try to get the last known slice ID from cache
        const lastSliceIdKey = `${LAST_SLICE_ID_CACHE_KEY}_${cacheKey}`;
        const cachedLastSliceId = await this.cache.get({
          agency: params.agency,
          assetClass: params.assetClass,
          date: lastSliceIdKey,
          isIntraday: true
        });
        
        if (cachedLastSliceId && cachedLastSliceId.length > 0 && 
            cachedLastSliceId[0].rawData && 
            cachedLastSliceId[0].rawData.lastSliceId) {
          minSliceId = cachedLastSliceId[0].rawData.lastSliceId + 1;
          console.log(`Starting from slice ID ${minSliceId} based on cached last slice ID`);
        }
      }
      
      // Try to get cached trades if we're starting from the beginning
      let cachedTrades: DTCCTrade[] = [];
      if (minSliceId === 1 && params.useCache !== false) {
        cachedTrades = await this.cache.get({
          agency: params.agency,
          assetClass: params.assetClass,
          date: format(today, 'yyyy-MM-dd'),
          isIntraday: true
        }) || [];
        
        if (cachedTrades.length > 0) {
          console.log(`Found ${cachedTrades.length} cached intraday trades`);
          
          // If we have cached trades, we need to find the last slice ID from the cache
          if (cachedTrades.length > 0 && 
              cachedTrades[0].rawData && 
              cachedTrades[0].rawData.highestSliceId) {
            minSliceId = cachedTrades[0].rawData.highestSliceId + 1;
            console.log(`Updating minSliceId to ${minSliceId} based on cached data`);
          }
        }
      }
      
      // Prepare intraday fetch parameters
      const intradayFetchParams: DTCCIntraDayParams = {
        ...params,
        minSliceId
      };
      
      // Fetch new intraday data
      console.log(`Fetching intraday data starting from slice ID ${minSliceId}`);
      const newTrades = await this.fetcher.fetchIntradayReports(intradayFetchParams);
      
      // Find the highest slice ID that was processed
      let highestSliceId = minSliceId - 1; // Default to the previous slice
      let processedSliceIds: number[] = [];
      
      if (newTrades.length > 0) {
        // Extract slice IDs from the fetched trades
        // This would require some custom metadata in the trades
        // For now, we'll use a placeholder approach
        highestSliceId = minSliceId + newTrades.length - 1;
        
        // Generate processedSliceIds array
        processedSliceIds = Array.from(
          { length: newTrades.length }, 
          (_, i) => minSliceId + i
        );
        
        console.log(`Processed slice IDs ${JSON.stringify(processedSliceIds)}`);
        console.log(`Highest slice ID is now ${highestSliceId}`);
        
        // Store the highest slice ID for future reference
        this.lastKnownSliceIds[cacheKey] = highestSliceId;
        
        // Add metadata to the first trade for reference
        if (newTrades.length > 0) {
          newTrades[0].rawData = {
            ...(newTrades[0].rawData || {}),
            highestSliceId,
            processedSliceIds
          };
        }
        
        // Store the last slice ID in cache
        const lastSliceIdKey = `${LAST_SLICE_ID_CACHE_KEY}_${cacheKey}`;
        await this.cache.set({
          agency: params.agency,
          assetClass: params.assetClass,
          date: lastSliceIdKey,
          isIntraday: true
        }, [{
          ...newTrades[0],
          rawData: {
            lastSliceId: highestSliceId
          }
        }]);
      }
      
      // Combine with cached trades
      const allTrades = [...cachedTrades, ...newTrades];
      
      // Store combined trades in cache if we have new data
      if (newTrades.length > 0) {
        await this.cache.set({
          agency: params.agency,
          assetClass: params.assetClass,
          date: format(today, 'yyyy-MM-dd'),
          isIntraday: true
        }, allTrades);
      }
      
      const endTime = Date.now();
      
      return {
        trades: allTrades,
        metadata: {
          count: allTrades.length,
          startDate: today,
          endDate: today,
          agency: params.agency,
          assetClass: params.assetClass,
          fetchDuration: endTime - startTime,
          cacheHit: cachedTrades.length > 0 && newTrades.length === 0,
          highestSliceId,
          processedSliceIds
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
          cacheHit: false
        }
      };
    }
  }
  
  /**
   * Fetch all DTCC data (historical + intraday)
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
        // Fetch intraday data - get all batches from the beginning
        const intradayParams: DTCCIntraDayParams = {
          agency: params.agency,
          assetClass: params.assetClass,
          minSliceId: 1, // Start from the first slice
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
            processedSliceIds: intradayResponse.metadata.processedSliceIds
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
   * Check for new intraday data
   * 
   * This method checks if there are new intraday data batches available
   * since the last check, and fetches only the new data if found.
   */
  public async checkForNewIntradayData(
    agency: Agency,
    assetClass: AssetClass
  ): Promise<DTCCResponse> {
    const today = new Date();
    const cacheKey = `${agency}_${assetClass}_${format(today, 'yyyy-MM-dd')}`;
    
    // Get the last known slice ID
    let lastKnownSliceId = this.lastKnownSliceIds[cacheKey] || 0;
    
    if (lastKnownSliceId === 0) {
      // Try to get from cache
      const lastSliceIdKey = `${LAST_SLICE_ID_CACHE_KEY}_${cacheKey}`;
      const cachedLastSliceId = await this.cache.get({
        agency,
        assetClass,
        date: lastSliceIdKey,
        isIntraday: true
      });
      
      if (cachedLastSliceId && cachedLastSliceId.length > 0 && 
          cachedLastSliceId[0].rawData && 
          cachedLastSliceId[0].rawData.lastSliceId) {
        lastKnownSliceId = cachedLastSliceId[0].rawData.lastSliceId;
      }
    }
    
    console.log(`Checking for new intraday data since slice ID ${lastKnownSliceId}`);
    
    // Fetch only new data
    return await this.fetchIntradayData({
      agency,
      assetClass,
      lastKnownSliceId,
      useCache: true // Use cache for accumulated data
    });
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
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    await this.cache.clear();
    this.lastKnownSliceIds = {};
  }
}