# DTCC Intraday Data

## Overview

This document explains how the DTCC intraday data system works and how it's implemented in the DTCC SDR Analyzer.

## DTCC Intraday Data Structure

The DTCC Swap Data Repository (SDR) publishes intraday data as a series of sequential batch files throughout the trading day. Each file contains new trades that were reported since the previous batch. Understanding how these files work is crucial for correctly processing intraday swap trade data.

### Key Characteristics

1. **Sequential Batch Files**: Intraday data is published in numbered batch files, starting from 1 and incrementing throughout the day as new trades are reported.

2. **Cumulative Nature**: Each batch file contains only the new trades that occurred since the previous batch. To get the complete set of today's trades, you need to accumulate all the batch files.

3. **File Monitoring**: To stay current with today's trades, you need to continuously check for new batch files and process them as they become available.

4. **Continuous Publication**: New batch files are published throughout the trading day as trades are reported to the SDR.

## Implementation Details

### Fetching Intraday Data

Our implementation in `DTCCFetcher.ts` and `DTCCService.ts` follows these steps to fetch intraday data:

1. **Get Available Slice IDs**: The `getDTCCIntradaySliceIds` method retrieves all available intraday slice IDs for the current day.

2. **Track Last Processed ID**: We keep track of the highest slice ID that we've already processed to avoid redundant fetching.

3. **Fetch New Batches**: For each new batch file (from last known ID + 1 to the highest available ID), we fetch and process the data.

4. **Accumulate Trades**: New trades are added to the accumulated dataset, which is cached for future use.

### Tracking Mechanism

To efficiently track which batch files have been processed, the implementation uses several approaches:

1. **In-Memory Tracking**: The `lastKnownSliceIds` object in `DTCCService` keeps track of the highest slice ID processed for each agency/asset class combination.

2. **Cache-Based Tracking**: The last known slice ID is also stored in the cache with a special key for persistence across sessions.

3. **Incremental Updates**: The `checkForNewIntradayData` method only fetches data from batch files that haven't been processed yet.

### API Usage

#### Basic Usage

To fetch all intraday data for a specific asset class:

```
GET /api/dtcc/intraday?agency=CFTC&assetClass=RATES
```

This fetches all available intraday batch files, accumulating the trades.

#### Incremental Updates

To check for new data since the last fetch:

```
GET /api/dtcc/intraday?agency=CFTC&assetClass=RATES&checkNew=true
```

This only fetches new batch files that have been published since the last check.

#### Manual Control

To start from a specific batch ID:

```
GET /api/dtcc/intraday?agency=CFTC&assetClass=RATES&minSliceId=5
```

This starts fetching from batch #5 onwards.

### Caching Strategy

Intraday data uses a specialized caching strategy:

1. **Accumulated Data Cache**: The accumulated trades from all processed batch files are cached with the current date as the key.

2. **Last Known ID Cache**: The last processed batch ID is cached separately to enable incremental updates.

3. **Cache Invalidation**: The cache is automatically invalidated at the start of a new trading day.

## Example: Real-Time Monitoring

To implement real-time monitoring of intraday trades:

```typescript
// Initial fetch of all available data
const initialResponse = await dtccService.fetchIntradayData({
  agency: 'CFTC',
  assetClass: 'RATES'
});

// Process initial data
processTrades(initialResponse.trades);

// Set up polling for new data
setInterval(async () => {
  const newDataResponse = await dtccService.checkForNewIntradayData('CFTC', 'RATES');
  
  if (newDataResponse.metadata.processedSliceIds && 
      newDataResponse.metadata.processedSliceIds.length > 0) {
    console.log(`Found ${newDataResponse.trades.length} new trades in batches ${newDataResponse.metadata.processedSliceIds.join(', ')}`);
    processTrades(newDataResponse.trades);
  }
}, 60000); // Check every minute
```

## Important Notes

- **Complete Dataset**: To get the complete set of today's trades, always use the accumulated data approach rather than focusing only on the most recent batch.

- **Polling Frequency**: The polling frequency should be balanced between staying current and avoiding excessive API calls.

- **Day Boundaries**: The batch numbering resets at the start of each trading day, so your monitoring system should handle day transitions appropriately.