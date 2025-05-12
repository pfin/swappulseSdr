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
   */
  public async fetchIntradayData(params: DTCCIntraDayParams): Promise<DTCCResponse> {
    const startTime = Date.now();
    const today = new Date();
    
    try {
      // Try to get from cache first if caching is enabled
      const cacheKey = `intraday_${params.agency}_${params.assetClass}_${format(today, 'yyyy-MM-dd')}`;
      const cachedData = await this.cache.get({
        agency: params.agency,
        assetClass: params.assetClass,
        date: format(today, 'yyyy-MM-dd'),
        isIntraday: true
      });
      
      if (cachedData) {
        const endTime = Date.now();
        
        return {
          trades: cachedData,
          metadata: {
            count: cachedData.length,
            startDate: today,
            endDate: today,
            agency: params.agency,
            assetClass: params.assetClass,
            fetchDuration: endTime - startTime,
            cacheHit: true
          }
        };
      }
      
      // Fetch from DTCC API
      const trades = await this.fetcher.fetchIntradayReports(params);
      
      // Store in cache
      await this.cache.set({
        agency: params.agency,
        assetClass: params.assetClass,
        date: format(today, 'yyyy-MM-dd'),
        isIntraday: true
      }, trades);
      
      const endTime = Date.now();
      
      return {
        trades,
        metadata: {
          count: trades.length,
          startDate: today,
          endDate: today,
          agency: params.agency,
          assetClass: params.assetClass,
          fetchDuration: endTime - startTime,
          cacheHit: false
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
        // Fetch intraday data - focus on latest batches
        const intradayParams: DTCCIntraDayParams = {
          agency: params.agency,
          assetClass: params.assetClass,
          maxSlices: 20, // Fetch up to 20 most recent intraday slices for today
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
            cacheHit: historicalResponse.metadata.cacheHit && intradayResponse.metadata.cacheHit
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
   * Clear cache
   */
  public async clearCache(): Promise<void> {
    await this.cache.clear();
  }
}