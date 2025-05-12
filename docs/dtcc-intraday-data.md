# DTCC Intraday Data

## Overview

This document explains how the DTCC intraday data system works and how it's implemented in the DTCC SDR Analyzer.

## DTCC Intraday Data Structure

The DTCC Swap Data Repository (SDR) provides intraday data in sequential batches. Unlike historical data which is organized by date, intraday data is identified by sequential batch numbers that increment throughout the day. Understanding this structure is crucial for correctly retrieving and processing intraday swap trade data.

### Key Characteristics

1. **Sequential Batch Numbers**: Intraday data is organized into sequential batches, starting from 1 and incrementing with each new batch.

2. **No Direct Timestamp Correlation**: The batch numbers themselves don't directly represent timestamps. They simply indicate the sequence in which the batches were processed.

3. **Unknown Timing**: We don't know exactly when during the day a particular trade occurred, only that it was included in a specific batch.

4. **Most Recent First**: When analyzing intraday data, typically the most recent batches (highest numbers) are of greatest interest.

## Implementation Details

### Fetching Intraday Data

Our implementation in `DTCCFetcher.ts` follows these steps to fetch intraday data:

1. **Get Available Slice IDs**: The `getDTCCIntradaySliceIds` method retrieves all available intraday slice IDs for the current day.

2. **Sort by Most Recent**: Slice IDs are converted to numbers, sorted in descending order (most recent first).

3. **Limit by maxSlices**: We fetch only the most recent N slices, where N is controlled by the `maxSlices` parameter (default: 10).

4. **Process Each Slice**: For each slice ID, we fetch and process the data.

### API Usage

When using the intraday API endpoint, you can control how many recent batches to fetch:

```
GET /api/dtcc/intraday?agency=CFTC&assetClass=RATES&maxSlices=15
```

This would fetch the 15 most recent intraday data batches for CFTC RATES data.

### Caching

Intraday data is cached separately from historical data, with the `isIntraday` flag set to `true`. This allows for efficient refreshing of intraday data without affecting the historical data cache.

## Important Notes

- **Timestamp Parameters Deprecated**: The `startTimestamp` and `endTimestamp` parameters are deprecated as they don't align with how DTCC intraday data actually works.

- **Refresh Frequently**: Intraday data should be refreshed frequently to get the latest trades.

- **Memory Usage**: Be mindful of the `maxSlices` parameter, as setting it too high can lead to excessive memory usage, especially on serverless platforms like Vercel.

## Example

To fetch the 20 most recent intraday data batches for CFTC RATES data:

```typescript
const intradayParams: DTCCIntraDayParams = {
  agency: 'CFTC',
  assetClass: 'RATES',
  maxSlices: 20,
  useCache: false // Set to false to bypass cache and get fresh data
};

const response = await dtccService.fetchIntradayData(intradayParams);
```