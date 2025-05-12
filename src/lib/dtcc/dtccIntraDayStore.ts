/**
 * DTCC Intraday Data Store
 * 
 * Singleton server-side store for accumulating intraday data across requests.
 * Ensures consistent data between refreshes and incremental batch-based accumulation.
 */

import { Agency, AssetClass, DTCCTrade } from '@/types/dtcc';

interface BatchData {
  trades: DTCCTrade[];
  batchId: number;
  timestamp: Date;
}

interface AgencyClassData {
  accumulatedTrades: DTCCTrade[];
  batches: Record<number, BatchData>;
  lastKnownBatchId: number;
  lastUpdated: Date;
}

class DTCCIntraDayStore {
  private static instance: DTCCIntraDayStore;
  private data: Record<string, AgencyClassData> = {};
  
  // Private constructor for singleton pattern
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DTCCIntraDayStore {
    if (!DTCCIntraDayStore.instance) {
      DTCCIntraDayStore.instance = new DTCCIntraDayStore();
    }
    return DTCCIntraDayStore.instance;
  }
  
  /**
   * Generate key for agency/assetClass combination
   */
  private getKey(agency: Agency, assetClass: AssetClass): string {
    return `${agency}_${assetClass}`;
  }
  
  /**
   * Reset the store for a specific agency/assetClass
   */
  public resetStore(agency: Agency, assetClass: AssetClass): void {
    const key = this.getKey(agency, assetClass);
    this.data[key] = {
      accumulatedTrades: [],
      batches: {},
      lastKnownBatchId: 0,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Reset all stores
   */
  public resetAllStores(): void {
    this.data = {};
  }
  
  /**
   * Initialize store for an agency/assetClass if it doesn't exist
   */
  private initializeStoreIfNeeded(agency: Agency, assetClass: AssetClass): void {
    const key = this.getKey(agency, assetClass);
    if (!this.data[key]) {
      this.resetStore(agency, assetClass);
    }
  }
  
  /**
   * Get all accumulated trades for an agency/assetClass
   */
  public getAllTrades(agency: Agency, assetClass: AssetClass): DTCCTrade[] {
    this.initializeStoreIfNeeded(agency, assetClass);
    const key = this.getKey(agency, assetClass);
    return [...this.data[key].accumulatedTrades];
  }
  
  /**
   * Add a new batch of trades
   */
  public addBatch(
    agency: Agency, 
    assetClass: AssetClass, 
    batchId: number, 
    trades: DTCCTrade[]
  ): void {
    this.initializeStoreIfNeeded(agency, assetClass);
    const key = this.getKey(agency, assetClass);
    
    // Skip if we've already processed this batch
    if (this.data[key].batches[batchId]) {
      console.log(`Batch ${batchId} already processed for ${agency}-${assetClass}, skipping`);
      return;
    }
    
    // Add the batch
    this.data[key].batches[batchId] = {
      trades: [...trades],
      batchId,
      timestamp: new Date()
    };
    
    // Update the accumulated trades (ensuring deep copy for safety)
    this.data[key].accumulatedTrades = [
      ...this.data[key].accumulatedTrades,
      ...trades
    ];
    
    // Update metadata
    this.data[key].lastKnownBatchId = Math.max(
      this.data[key].lastKnownBatchId, 
      batchId
    );
    this.data[key].lastUpdated = new Date();
    
    console.log(
      `Added batch ${batchId} with ${trades.length} trades for ${agency}-${assetClass}. ` +
      `Total accumulated: ${this.data[key].accumulatedTrades.length}`
    );
  }
  
  /**
   * Get new trades since the last known batch ID
   */
  public getNewTradesSince(
    agency: Agency, 
    assetClass: AssetClass, 
    lastKnownBatchId: number
  ): {
    trades: DTCCTrade[];
    processedBatchIds: number[];
    highestBatchId: number;
  } {
    this.initializeStoreIfNeeded(agency, assetClass);
    const key = this.getKey(agency, assetClass);
    
    // No new batches
    if (lastKnownBatchId >= this.data[key].lastKnownBatchId) {
      return {
        trades: [],
        processedBatchIds: [],
        highestBatchId: this.data[key].lastKnownBatchId
      };
    }
    
    // Find all batches newer than the provided lastKnownBatchId
    const newBatchIds = Object.keys(this.data[key].batches)
      .map(id => parseInt(id, 10))
      .filter(id => id > lastKnownBatchId)
      .sort((a, b) => a - b);
    
    // Collect all trades from these batches
    const newTrades: DTCCTrade[] = [];
    for (const batchId of newBatchIds) {
      newTrades.push(...this.data[key].batches[batchId].trades);
    }
    
    return {
      trades: newTrades,
      processedBatchIds: newBatchIds,
      highestBatchId: this.data[key].lastKnownBatchId
    };
  }
  
  /**
   * Get metadata about the stored data
   */
  public getMetadata(agency: Agency, assetClass: AssetClass): {
    totalTrades: number;
    batchCount: number;
    lastKnownBatchId: number;
    lastUpdated: Date;
    batchIds: number[];
  } {
    this.initializeStoreIfNeeded(agency, assetClass);
    const key = this.getKey(agency, assetClass);
    
    return {
      totalTrades: this.data[key].accumulatedTrades.length,
      batchCount: Object.keys(this.data[key].batches).length,
      lastKnownBatchId: this.data[key].lastKnownBatchId,
      lastUpdated: this.data[key].lastUpdated,
      batchIds: Object.keys(this.data[key].batches).map(id => parseInt(id, 10)).sort((a, b) => a - b)
    };
  }
  
}

// Export singleton instance
export const intraDayStore = DTCCIntraDayStore.getInstance();