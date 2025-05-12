/**
 * DTCC SDR Data Cache
 * 
 * This service is responsible for caching DTCC SDR data to minimize API calls.
 * It uses the in-memory database for storage.
 */

import { 
  DTCCTrade, 
  DTCCFetchParams, 
  Agency, 
  AssetClass 
} from '@/types/dtcc';
import { format } from 'date-fns';
import { DBClient } from '@/lib/db/dbClient';

interface CacheKey {
  agency: Agency;
  assetClass: AssetClass;
  date: string; // In YYYY-MM-DD format
  isIntraday: boolean;
}

interface CacheOptions {
  maxSize?: number;
  ttl?: number;
}

export class DTCCCache {
  private dbClient: DBClient;
  private cacheEnabled: boolean;
  private ttl: number;
  
  constructor(options: CacheOptions = {}) {
    const {
      ttl = 24 * 60 * 60 * 1000, // 24 hours
    } = options;
    
    this.dbClient = DBClient.getInstance();
    this.cacheEnabled = true;
    this.ttl = ttl;
  }
  
  /**
   * Enable or disable the cache
   */
  public setEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
  }
  
  /**
   * Get data from cache
   */
  public async get(key: CacheKey): Promise<DTCCTrade[] | null> {
    if (!this.cacheEnabled) {
      return null;
    }
    
    const cacheKey = this.generateCacheKey(key);
    
    try {
      const result = await this.dbClient.getCache(cacheKey);
      
      if (result && result.length > 0) {
        console.log(`Cache hit: ${cacheKey}`);
        return result;
      }
    } catch (error) {
      console.error(`Error getting from cache: ${error}`);
    }
    
    return null;
  }
  
  /**
   * Store data in cache
   */
  public async set(key: CacheKey, data: DTCCTrade[]): Promise<void> {
    if (!this.cacheEnabled || data.length === 0) {
      return;
    }
    
    const cacheKey = this.generateCacheKey(key);
    
    try {
      await this.dbClient.storeCache(
        cacheKey,
        key.agency,
        key.assetClass,
        key.date,
        key.isIntraday,
        data,
        this.ttl
      );
      console.log(`Cached ${data.length} trades with key: ${cacheKey}`);
    } catch (error) {
      console.error(`Error setting cache: ${error}`);
    }
  }
  
  /**
   * Check if a key exists in the cache
   */
  public async has(key: CacheKey): Promise<boolean> {
    if (!this.cacheEnabled) {
      return false;
    }
    
    const result = await this.get(key);
    return result !== null;
  }
  
  /**
   * Clear the cache
   */
  public async clear(): Promise<void> {
    try {
      await this.dbClient.clearCache();
      console.log('Cache cleared');
    } catch (error) {
      console.error(`Error clearing cache: ${error}`);
    }
  }
  
  /**
   * Generate a consistent cache key
   */
  private generateCacheKey(key: CacheKey): string {
    const { agency, assetClass, date, isIntraday } = key;
    return `${agency}_${assetClass}_${date}_${isIntraday ? 'intraday' : 'historical'}`;
  }
}