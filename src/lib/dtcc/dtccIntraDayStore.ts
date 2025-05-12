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
  
  /**
   * Generate mock intraday data for a new batch
   */
  public generateMockBatch(
    agency: Agency, 
    assetClass: AssetClass, 
    batchId: number, 
    tradeCount: number = 5
  ): DTCCTrade[] {
    const now = new Date();
    const trades: DTCCTrade[] = [];
    
    // Generate realistic product types based on asset class
    const productTypes: Record<AssetClass, string[]> = {
      'RATES': ['IRS', 'OIS', 'Basis Swap', 'Fixed-Float', 'Inflation Swap', 'Cross-Currency'],
      'CREDITS': ['CDS', 'CDS Index', 'TRS', 'CDX', 'iTraxx', 'Basket Default Swap'],
      'EQUITIES': ['Equity Swap', 'Dividend Swap', 'Variance Swap', 'Total Return', 'Option'],
      'FOREX': ['FX Forward', 'FX Swap', 'FX Option', 'NDF', 'Currency Swap'],
      'COMMODITIES': ['Energy Swap', 'Metal Swap', 'Agricultural Swap', 'Commodity Option', 'Commodity Forward']
    };
    
    const underlyings: Record<AssetClass, string[]> = {
      'RATES': ['SOFR', 'EURIBOR', 'SONIA', 'TONAR', 'LIBOR', 'EFFR', 'ESTR'],
      'CREDITS': ['Investment Grade', 'High Yield', 'Emerging Markets', 'Crossover', 'Sovereign'],
      'EQUITIES': ['S&P 500', 'NASDAQ', 'EURO STOXX', 'FTSE', 'Nikkei', 'Single Name', 'Sector Index'],
      'FOREX': ['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'USD/CAD', 'EUR/GBP', 'AUD/USD'],
      'COMMODITIES': ['WTI Crude', 'Brent Crude', 'Natural Gas', 'Gold', 'Silver', 'Copper', 'Wheat', 'Corn']
    };
    
    // Generate each trade
    for (let i = 0; i < tradeCount; i++) {
      // Generate a trade execution time with realistic distribution
      const executionHour = 8 + Math.floor(Math.random() * 9); // 8am-5pm
      const executionMinute = Math.floor(Math.random() * 60);
      const executionSecond = Math.floor(Math.random() * 60);
      
      const executionTime = new Date(now);
      executionTime.setHours(executionHour, executionMinute, executionSecond);
      
      // Event time is slightly after execution (reporting delay)
      const reportingDelayMinutes = Math.floor(Math.random() * 10); // 0-10 minutes delay
      const eventTime = new Date(executionTime.getTime() + reportingDelayMinutes * 60 * 1000);
      
      // Generate random product type and underlying for this asset class
      const selectedProductTypes = productTypes[assetClass] || ['Swap', 'Option', 'Forward'];
      const selectedUnderlyings = underlyings[assetClass] || ['USD', 'EUR', 'JPY'];
      
      const productType = selectedProductTypes[Math.floor(Math.random() * selectedProductTypes.length)];
      const underlying = selectedUnderlyings[Math.floor(Math.random() * selectedUnderlyings.length)];
      
      // Generate notional with log-normal distribution
      const notionalBase = Math.exp(Math.random() * Math.log(100_000_000));
      const notionalLeg1 = Math.max(100_000, Math.floor(notionalBase));
      
      // Only some trades have a second leg
      const hasSecondLeg = productType.includes('Swap') || productType.includes('Cross-Currency');
      const notionalLeg2 = hasSecondLeg 
        ? Math.max(100_000, Math.floor(notionalBase * (0.9 + Math.random() * 0.2)))
        : null;
      
      // Trade dates
      const effectiveOffset = Math.floor(Math.random() * 30); // 0-30 days forward
      const effectiveDate = new Date(executionTime.getTime() + effectiveOffset * 24 * 60 * 60 * 1000);
      
      // Expiration based on typical tenors
      const tenors = [1, 3, 6, 12, 24, 36, 60, 84, 120, 180, 240, 360]; // months
      const tenor = tenors[Math.floor(Math.random() * tenors.length)];
      const expirationDate = new Date(effectiveDate.getTime() + tenor * 30 * 24 * 60 * 60 * 1000);
      
      // Spreads with appropriate distributions
      const spreadLeg1 = (productType.includes('Fixed') || productType.includes('Option'))
        ? `${(0.5 + Math.random() * 4.5).toFixed(4)}` // Fixed rates 0.5% to 5%
        : `${(Math.random() * 2).toFixed(4)}`; // Floating spreads 0 to 2%
        
      const spreadLeg2 = hasSecondLeg
        ? `${(Math.random() * 2).toFixed(4)}`
        : null;
        
      // Strike prices for options
      const strikePrice = productType.includes('Option')
        ? `${(0.5 + Math.random() * 9.5).toFixed(2)}`
        : null;
        
      // Other payment amounts (occasional upfront payments)
      const hasOtherPayment = Math.random() > 0.8;
      const otherPaymentAmount = hasOtherPayment
        ? `${Math.floor(10000 + Math.random() * (notionalLeg1 * 0.05))}`
        : null;
        
      // Create the trade with a unique ID based on batch and index
      trades.push({
        eventTimestamp: eventTime,
        executionTimestamp: executionTime,
        effectiveDate,
        expirationDate,
        notionalLeg1: notionalLeg1.toString(),
        notionalLeg2: notionalLeg2?.toString() || null,
        spreadLeg1,
        spreadLeg2,
        strikePrice,
        otherPaymentAmount,
        actionType: 'NEW',
        assetClass,
        productType,
        underlying,
        rawData: {
          tradeId: `T${Date.now().toString().slice(-8)}_${batchId}_${i}`,
          batchId: batchId,
          reporterId: `R${Math.floor(Math.random() * 1000)}`,
          dealerId: `D${Math.floor(Math.random() * 100)}`,
          clearingVenue: Math.random() > 0.6 ? 'CLEARED' : 'BILATERAL',
          dealType: Math.random() > 0.7 ? 'INTERDEALER' : 'CUSTOMER'
        }
      });
    }
    
    return trades;
  }
}

// Export singleton instance
export const intraDayStore = DTCCIntraDayStore.getInstance();