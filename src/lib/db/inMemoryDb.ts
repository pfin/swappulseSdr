/**
 * In-Memory Database for DTCC SDR Analyzer
 * 
 * This provides a temporary in-memory database implementation
 * that mimics the interface of the Prisma-based database client.
 */

import { 
  DTCCTrade, 
  Agency, 
  AssetClass 
} from '@/types/dtcc';
import { isAfter, isBefore, isEqual } from 'date-fns';

interface InMemoryDTCCTrade extends DTCCTrade {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  agency: Agency;
}

interface CacheEntry {
  cacheKey: string;
  agency: Agency;
  assetClass: AssetClass;
  date: string;
  isIntraday: boolean;
  data: DTCCTrade[];
  createdAt: Date;
  expiresAt: Date;
}

interface SavedQuery {
  id: number;
  name: string;
  description?: string;
  agency: Agency;
  assetClass: AssetClass;
  startDate: Date;
  endDate: Date;
  productType?: string;
  filters?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface DailyStats {
  id: number;
  date: Date;
  agency: Agency;
  assetClass: AssetClass;
  tradeCount: number;
  totalNotional: number;
  productCounts: Record<string, number>;
  createdAt: Date;
}

export class InMemoryDB {
  private static instance: InMemoryDB;
  private trades: InMemoryDTCCTrade[] = [];
  private cacheEntries: CacheEntry[] = [];
  private savedQueries: SavedQuery[] = [];
  private dailyStats: DailyStats[] = [];
  private nextTradeId = 1;
  private nextQueryId = 1;
  private nextStatsId = 1;
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): InMemoryDB {
    if (!InMemoryDB.instance) {
      InMemoryDB.instance = new InMemoryDB();
    }
    
    return InMemoryDB.instance;
  }
  
  /**
   * Store DTCC trades in the database
   */
  public async storeTrades(
    trades: DTCCTrade[],
    agency: Agency,
    assetClass: AssetClass
  ): Promise<number> {
    const now = new Date();
    let count = 0;
    
    for (const trade of trades) {
      // Skip if trade already exists (based on unique constraint)
      const exists = this.trades.some(t => 
        t.agency === agency &&
        t.assetClass === assetClass &&
        isEqual(t.eventTimestamp, trade.eventTimestamp) &&
        isEqual(t.executionTimestamp, trade.executionTimestamp) &&
        t.notionalLeg1 === trade.notionalLeg1 &&
        t.productType === trade.productType
      );
      
      if (!exists) {
        const dbTrade: InMemoryDTCCTrade = {
          ...trade,
          id: this.nextTradeId++,
          agency,
          createdAt: now,
          updatedAt: now
        };
        
        this.trades.push(dbTrade);
        count++;
      }
    }
    
    return count;
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
    return this.trades
      .filter(trade => 
        trade.agency === agency &&
        trade.assetClass === assetClass &&
        (isEqual(trade.executionTimestamp, startDate) || isAfter(trade.executionTimestamp, startDate)) &&
        (isEqual(trade.executionTimestamp, endDate) || isBefore(trade.executionTimestamp, endDate))
      )
      .sort((a, b) => b.executionTimestamp.getTime() - a.executionTimestamp.getTime())
      .slice(0, limit);
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
    return this.trades.filter(trade => 
      trade.agency === agency &&
      trade.assetClass === assetClass &&
      (isEqual(trade.executionTimestamp, startDate) || isAfter(trade.executionTimestamp, startDate)) &&
      (isEqual(trade.executionTimestamp, endDate) || isBefore(trade.executionTimestamp, endDate))
    ).length;
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
    const initialCount = this.trades.length;
    
    this.trades = this.trades.filter(trade => 
      trade.agency !== agency ||
      trade.assetClass !== assetClass ||
      isBefore(trade.executionTimestamp, startDate) ||
      isAfter(trade.executionTimestamp, endDate)
    );
    
    return initialCount - this.trades.length;
  }
  
  /**
   * Get unique product types in the database
   */
  public async getProductTypes(assetClass: AssetClass): Promise<string[]> {
    const productTypes = new Set<string>();
    
    this.trades
      .filter(trade => trade.assetClass === assetClass && trade.productType)
      .forEach(trade => {
        if (trade.productType) {
          productTypes.add(trade.productType);
        }
      });
    
    return Array.from(productTypes);
  }
  
  /**
   * Get unique underliers in the database
   */
  public async getUnderliers(
    assetClass: AssetClass,
    productType?: string
  ): Promise<string[]> {
    const underliers = new Set<string>();
    
    this.trades
      .filter(trade => 
        trade.assetClass === assetClass && 
        trade.underlying && 
        (!productType || trade.productType === productType)
      )
      .forEach(trade => {
        if (trade.underlying) {
          underliers.add(trade.underlying);
        }
      });
    
    return Array.from(underliers);
  }
  
  /**
   * Store cache entry
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
    // Delete existing cache entry if exists
    this.cacheEntries = this.cacheEntries.filter(entry => 
      entry.cacheKey !== cacheKey
    );
    
    // Add new cache entry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);
    
    this.cacheEntries.push({
      cacheKey,
      agency,
      assetClass,
      date,
      isIntraday,
      data,
      createdAt: now,
      expiresAt
    });
  }
  
  /**
   * Get cache entry
   */
  public async getCache(
    cacheKey: string
  ): Promise<DTCCTrade[] | null> {
    const now = new Date();
    
    // Find cache entry
    const entry = this.cacheEntries.find(entry => 
      entry.cacheKey === cacheKey && isAfter(entry.expiresAt, now)
    );
    
    return entry ? entry.data : null;
  }
  
  /**
   * Clear expired cache entries
   */
  public async clearExpiredCache(): Promise<number> {
    const now = new Date();
    const initialCount = this.cacheEntries.length;
    
    this.cacheEntries = this.cacheEntries.filter(entry => 
      isAfter(entry.expiresAt, now)
    );
    
    return initialCount - this.cacheEntries.length;
  }
  
  /**
   * Clear all cache entries
   */
  public async clearAllCache(): Promise<number> {
    const count = this.cacheEntries.length;
    this.cacheEntries = [];
    return count;
  }
  
  /**
   * Save a query
   */
  public async saveQuery(query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedQuery> {
    const now = new Date();
    const savedQuery: SavedQuery = {
      ...query,
      id: this.nextQueryId++,
      createdAt: now,
      updatedAt: now
    };
    
    this.savedQueries.push(savedQuery);
    return savedQuery;
  }
  
  /**
   * Get all saved queries
   */
  public async getSavedQueries(): Promise<SavedQuery[]> {
    return [...this.savedQueries];
  }
  
  /**
   * Delete a saved query
   */
  public async deleteSavedQuery(id: number): Promise<boolean> {
    const initialCount = this.savedQueries.length;
    
    this.savedQueries = this.savedQueries.filter(query => 
      query.id !== id
    );
    
    return initialCount > this.savedQueries.length;
  }
  
  /**
   * Save daily stats
   */
  public async saveDailyStats(stats: Omit<DailyStats, 'id' | 'createdAt'>): Promise<DailyStats> {
    // Update existing stats if exists
    const existing = this.dailyStats.find(s => 
      isEqual(s.date, stats.date) && 
      s.agency === stats.agency && 
      s.assetClass === stats.assetClass
    );
    
    if (existing) {
      existing.tradeCount = stats.tradeCount;
      existing.totalNotional = stats.totalNotional;
      existing.productCounts = stats.productCounts;
      return existing;
    }
    
    // Add new stats
    const newStats: DailyStats = {
      ...stats,
      id: this.nextStatsId++,
      createdAt: new Date()
    };
    
    this.dailyStats.push(newStats);
    return newStats;
  }
  
  /**
   * Get daily stats
   */
  public async getDailyStats(
    agency: Agency,
    assetClass: AssetClass,
    startDate: Date,
    endDate: Date
  ): Promise<DailyStats[]> {
    return this.dailyStats.filter(stats => 
      stats.agency === agency &&
      stats.assetClass === assetClass &&
      (isEqual(stats.date, startDate) || isAfter(stats.date, startDate)) &&
      (isEqual(stats.date, endDate) || isBefore(stats.date, endDate))
    );
  }
  
  /**
   * Clear all data
   */
  public async clearAll(): Promise<void> {
    this.trades = [];
    this.cacheEntries = [];
    this.savedQueries = [];
    this.dailyStats = [];
    this.nextTradeId = 1;
    this.nextQueryId = 1;
    this.nextStatsId = 1;
  }
}