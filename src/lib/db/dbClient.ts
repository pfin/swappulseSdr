/**
 * Database Client for DTCC SDR Analyzer
 * 
 * Provides a unified interface for interacting with the application database.
 * Currently uses an in-memory database, will be replaced with Prisma/Supabase later.
 */

import { 
  DTCCTrade, 
  Agency, 
  AssetClass
} from '@/types/dtcc';
import { InMemoryDB } from './inMemoryDb';

export class DBClient {
  private db: InMemoryDB;
  private static instance: DBClient;
  
  private constructor() {
    this.db = InMemoryDB.getInstance();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): DBClient {
    if (!DBClient.instance) {
      DBClient.instance = new DBClient();
    }
    
    return DBClient.instance;
  }
  
  /**
   * Store DTCC trades in the database
   */
  public async storeTrades(
    trades: DTCCTrade[], 
    agency: Agency, 
    assetClass: AssetClass
  ): Promise<number> {
    try {
      return await this.db.storeTrades(trades, agency, assetClass);
    } catch (error) {
      console.error('Error storing trades in database:', error);
      throw new Error(`Database error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Retrieve DTCC trades from the database
   */
  public async getTrades(
    agency: Agency,
    assetClass: AssetClass,
    startDate: Date,
    endDate: Date,
    limit: number = 100_000
  ): Promise<DTCCTrade[]> {
    try {
      return await this.db.getTrades(agency, assetClass, startDate, endDate, limit);
    } catch (error) {
      console.error('Error retrieving trades from database:', error);
      throw new Error(`Database error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Count DTCC trades in the database
   */
  public async countTrades(
    agency: Agency,
    assetClass: AssetClass,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      return await this.db.countTrades(agency, assetClass, startDate, endDate);
    } catch (error) {
      console.error('Error counting trades in database:', error);
      throw new Error(`Database error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Delete DTCC trades from the database
   */
  public async deleteTrades(
    agency: Agency,
    assetClass: AssetClass,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      return await this.db.deleteTrades(agency, assetClass, startDate, endDate);
    } catch (error) {
      console.error('Error deleting trades from database:', error);
      throw new Error(`Database error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get unique product types in the database
   */
  public async getProductTypes(assetClass: AssetClass): Promise<string[]> {
    try {
      return await this.db.getProductTypes(assetClass);
    } catch (error) {
      console.error('Error getting product types from database:', error);
      throw new Error(`Database error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get unique underliers in the database
   */
  public async getUnderliers(
    assetClass: AssetClass, 
    productType?: string
  ): Promise<string[]> {
    try {
      return await this.db.getUnderliers(assetClass, productType);
    } catch (error) {
      console.error('Error getting underliers from database:', error);
      throw new Error(`Database error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Store in cache
   */
  public async storeCache(
    cacheKey: string,
    agency: Agency,
    assetClass: AssetClass,
    date: string,
    isIntraday: boolean,
    data: DTCCTrade[],
    ttl: number
  ): Promise<void> {
    try {
      await this.db.storeCache(cacheKey, agency, assetClass, date, isIntraday, data, ttl);
    } catch (error) {
      console.error('Error storing in cache:', error);
      throw new Error(`Cache error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get from cache
   */
  public async getCache(
    cacheKey: string
  ): Promise<DTCCTrade[] | null> {
    try {
      return await this.db.getCache(cacheKey);
    } catch (error) {
      console.error('Error getting from cache:', error);
      throw new Error(`Cache error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Clear cache
   */
  public async clearCache(): Promise<number> {
    try {
      return await this.db.clearAllCache();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw new Error(`Cache error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Disconnect from database
   * (Not necessary for in-memory DB, but included for API compatibility)
   */
  public async disconnect(): Promise<void> {
    // No-op for in-memory DB
  }
}