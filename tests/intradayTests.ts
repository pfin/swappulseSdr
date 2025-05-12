/**
 * Intraday Data Tests
 * 
 * This utility provides tests for validating that intraday data 
 * aggregation works correctly.
 */

import { DTCCTrade, Agency, AssetClass, DTCCResponse } from '@/types/dtcc';

/**
 * Test object for running intraday test scenarios
 */
export const IntradayTests = {
  /**
   * Tests that batch accumulation works correctly by simulating multiple
   * batches being added to the accumulated set.
   */
  testBatchAccumulation: async () => {
    const agency: Agency = 'CFTC';
    const assetClass: AssetClass = 'RATES';
    
    // Create some mock trades
    const createMockTrade = (id: number, batchId: number): DTCCTrade => ({
      executionTimestamp: new Date(),
      eventTimestamp: new Date(),
      effectiveDate: new Date(),
      expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      assetClass,
      notionalLeg1: (1000000 + id * 50000).toString(),
      notionalLeg2: null,
      spreadLeg1: "0.5",
      spreadLeg2: null,
      strikePrice: null,
      otherPaymentAmount: null,
      actionType: "NEW",
      productType: "IRS",
      underlying: "SOFR",
      rawData: {
        tradeId: `T${Date.now()}${id}`,
        batchId: batchId,
        uniqueId: `${batchId}_${id}`
      }
    });
    
    // Create batches
    const batch1 = Array.from({length: 10}, (_, i) => createMockTrade(i, 1));
    const batch2 = Array.from({length: 5}, (_, i) => createMockTrade(i + 10, 2));
    const batch3 = Array.from({length: 8}, (_, i) => createMockTrade(i + 15, 3));
    
    // Test accumulation
    let accumulated: DTCCTrade[] = [];
    
    // Add batch 1
    console.log(`Starting with empty accumulated trades`);
    accumulated = [...accumulated, ...batch1];
    console.log(`Added batch 1 (${batch1.length} trades), total: ${accumulated.length}`);
    
    // Validate batch 1
    const uniqueTradesAfterBatch1 = new Set(accumulated.map(t => t.rawData.uniqueId));
    if (uniqueTradesAfterBatch1.size !== accumulated.length) {
      throw new Error(`Batch 1 validation failed: Duplicate trades detected`);
    }
    
    // Add batch 2
    accumulated = [...accumulated, ...batch2];
    console.log(`Added batch 2 (${batch2.length} trades), total: ${accumulated.length}`);
    
    // Validate after batch 2
    const uniqueTradesAfterBatch2 = new Set(accumulated.map(t => t.rawData.uniqueId));
    if (uniqueTradesAfterBatch2.size !== accumulated.length) {
      throw new Error(`Batch 2 validation failed: Duplicate trades detected`);
    }
    
    // Verify count
    if (accumulated.length !== batch1.length + batch2.length) {
      throw new Error(`Count validation failed after batch 2: Expected ${batch1.length + batch2.length}, got ${accumulated.length}`);
    }
    
    // Add batch 3
    accumulated = [...accumulated, ...batch3];
    console.log(`Added batch 3 (${batch3.length} trades), total: ${accumulated.length}`);
    
    // Validate after batch 3
    const uniqueTradesAfterBatch3 = new Set(accumulated.map(t => t.rawData.uniqueId));
    if (uniqueTradesAfterBatch3.size !== accumulated.length) {
      throw new Error(`Batch 3 validation failed: Duplicate trades detected`);
    }
    
    // Verify count
    if (accumulated.length !== batch1.length + batch2.length + batch3.length) {
      throw new Error(`Count validation failed after batch 3: Expected ${batch1.length + batch2.length + batch3.length}, got ${accumulated.length}`);
    }
    
    // Test re-adding a batch (should have no effect since we're just checking counts)
    const beforeReaddCount = accumulated.length;
    accumulated = [...accumulated, ...batch2];
    
    // We expect duplicates now because we're re-adding batch2
    console.log(`Re-added batch 2 (${batch2.length} trades), total: ${accumulated.length}`);
    
    // In a real implementation, you'd want to deduplicate by trade ID
    const deduplicatedTrades = Array.from(
      new Map(accumulated.map(t => [t.rawData.uniqueId, t])).values()
    );
    
    console.log(`After deduplication: ${deduplicatedTrades.length} trades`);
    
    // Validate correct total
    if (deduplicatedTrades.length !== batch1.length + batch2.length + batch3.length) {
      throw new Error(`Deduplication validation failed: Expected ${batch1.length + batch2.length + batch3.length}, got ${deduplicatedTrades.length}`);
    }
    
    console.log(`✅ Batch accumulation test passed! Correct accumulation and deduplication.`);
    return true;
  },
  
  /**
   * Tests that the last known batch ID tracking works correctly
   */
  testLastKnownBatchIdTracking: () => {
    console.log(`Testing last known batch ID tracking...`);
    
    // Simulate backend state
    const lastKnownBatchIds: Record<string, number> = {};
    
    const updateLastKnownId = (agency: Agency, assetClass: AssetClass, batchId: number) => {
      const key = `${agency}_${assetClass}`;
      // Only update if the new batch ID is higher
      if (!lastKnownBatchIds[key] || batchId > lastKnownBatchIds[key]) {
        lastKnownBatchIds[key] = batchId;
      }
    };
    
    const getLastKnownId = (agency: Agency, assetClass: AssetClass) => {
      const key = `${agency}_${assetClass}`;
      return lastKnownBatchIds[key] || 0;
    };
    
    // Test 1: Initial state
    const initialId = getLastKnownId('CFTC', 'RATES');
    console.log(`Initial last known ID: ${initialId}`);
    if (initialId !== 0) {
      throw new Error(`Initial state test failed: Expected 0, got ${initialId}`);
    }
    
    // Test 2: Update to higher batch ID
    updateLastKnownId('CFTC', 'RATES', 5);
    const afterUpdateId = getLastKnownId('CFTC', 'RATES');
    console.log(`After update to batch 5: ${afterUpdateId}`);
    if (afterUpdateId !== 5) {
      throw new Error(`Update test failed: Expected 5, got ${afterUpdateId}`);
    }
    
    // Test 3: Try to update to lower batch ID (should not change)
    updateLastKnownId('CFTC', 'RATES', 3);
    const afterLowerUpdateId = getLastKnownId('CFTC', 'RATES');
    console.log(`After attempted update to batch 3: ${afterLowerUpdateId}`);
    if (afterLowerUpdateId !== 5) {
      throw new Error(`Lower update test failed: Expected to remain 5, got ${afterLowerUpdateId}`);
    }
    
    // Test 4: Update to higher batch ID again
    updateLastKnownId('CFTC', 'RATES', 8);
    const afterSecondUpdateId = getLastKnownId('CFTC', 'RATES');
    console.log(`After update to batch 8: ${afterSecondUpdateId}`);
    if (afterSecondUpdateId !== 8) {
      throw new Error(`Second update test failed: Expected 8, got ${afterSecondUpdateId}`);
    }
    
    // Test 5: Different asset class
    updateLastKnownId('CFTC', 'CREDITS', 3);
    const creditsId = getLastKnownId('CFTC', 'CREDITS');
    const ratesId = getLastKnownId('CFTC', 'RATES');
    console.log(`CREDITS last known ID: ${creditsId}`);
    console.log(`RATES last known ID: ${ratesId}`);
    if (creditsId !== 3 || ratesId !== 8) {
      throw new Error(`Multiple asset class test failed: Expected CREDITS:3, RATES:8, got CREDITS:${creditsId}, RATES:${ratesId}`);
    }
    
    console.log(`✅ Last known batch ID tracking test passed!`);
    return true;
  },
  
  /**
   * Run all intraday tests
   */
  runAllTests: async () => {
    try {
      console.log(`📋 Running intraday data tests...`);
      
      await IntradayTests.testBatchAccumulation();
      IntradayTests.testLastKnownBatchIdTracking();
      
      console.log(`✅ All intraday tests passed!`);
      return {
        success: true,
        message: "All tests passed"
      };
    } catch (error) {
      console.error(`❌ Intraday tests failed:`, error);
      return {
        success: false,
        message: `Test failed: ${(error as Error).message}`
      };
    }
  }
};

// Uncomment to run tests directly:
// if (typeof window !== 'undefined') {
//   IntradayTests.runAllTests();
// }