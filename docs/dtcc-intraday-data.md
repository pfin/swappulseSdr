# DTCC Intraday Data Architecture

## Overview

The DTCC Swap Data Repository (SDR) publishes intraday data as a series of sequential batch files throughout the trading day. Each batch contains new trades that were reported since the previous batch. The complete dataset for a day is built by accumulating all batches.

## Key Concepts

### Batch-Based Data

Intraday swap trade data has several important characteristics:

1. **Sequential Batch Files**: Intraday data is published in numbered batch files, starting from 1 and incrementing throughout the day as new trades are reported.

2. **Cumulative Nature**: Each batch only contains new trades since the previous batch. To get the complete set of today's trades, you need to accumulate all the batches.

3. **File Monitoring**: To stay current with today's trades, you need to continuously check for new batch files and process them as they become available.

### Server-Side Data Store

To ensure consistent data accumulation between client refreshes, the system uses a server-side singleton store:

- Maintains accumulated trades in server memory
- Tracks processed batch IDs to avoid duplicates
- Preserves state between API requests
- Provides APIs for incremental updates and full data access

### Asynchronous Data Fetching

Data is fetched asynchronously from the server via:

- Initial full data load
- Polling for incremental updates
- Stable UI updates to prevent jitter during refreshes

## Implementation Details

### Server-Side Store (`dtccIntraDayStore.ts`)

A singleton class that maintains the accumulated intraday data:

```typescript
class DTCCIntraDayStore {
  private static instance: DTCCIntraDayStore;
  private data: Record<string, AgencyClassData> = {};

  // Methods for data management
  public addBatch(agency, assetClass, batchId, trades): void
  public getAllTrades(agency, assetClass): DTCCTrade[]
  public getNewTradesSince(agency, assetClass, lastKnownBatchId): { trades, processedBatchIds, highestBatchId }
  public getMetadata(agency, assetClass): { totalTrades, batchCount, lastKnownBatchId, lastUpdated, batchIds }
  public resetStore(agency, assetClass): void
}
```

Key features:
- Separates data by agency and asset class
- Tracks each batch separately to avoid duplicates
- Maintains an accumulated view of all trades
- Updates the last known batch ID for each data set

### React Hook (`useIntradayData.ts`)

A custom React hook for client-side data management:

```typescript
export const useIntradayData = ({
  agency,
  assetClass,
  pollingInterval = 30000,
  enabled = true,
  onNewData
}: UseIntradayDataOptions) => {
  // Returns:
  // - trades: Accumulated trade data
  // - metadata: Information about the dataset
  // - isLoading: Loading state
  // - isPolling: Polling state
  // - error: Error state
  // - refresh: Function to manually refresh data
  // - reset: Function to reset data
}
```

Key features:
- Automatic polling for new data
- Race condition prevention with refs
- Stable state updates to prevent UI jitter
- Error handling and loading states

### API Route (`route.ts`)

The intraday API endpoint provides access to the server-side store:

```typescript
// GET /api/dtcc/intraday
export async function GET(request: NextRequest) {
  // Query parameters:
  // - agency: 'CFTC' | 'SEC'
  // - assetClass: 'RATES' | 'CREDITS' | 'EQUITIES' | 'FOREX' | 'COMMODITIES'
  // - minSliceId: The first batch ID to fetch (default: 1)
  // - lastKnownSliceId: The last known batch ID for incremental updates
  // - reset: Whether to reset the store (default: false)
  // - checkNew: Whether to check for new data since the last known batch
  // - generateMockBatch: Generate a new mock batch for testing
}
```

Supported operations:
- Full data retrieval
- Incremental updates
- Store reset
- Mock data generation for testing

## Usage Examples

### Fetching Intraday Data with the React Hook

```typescript
// Example using the useIntradayData hook
const {
  trades,
  metadata,
  isLoading,
  isPolling,
  error,
  refresh,
  reset
} = useIntradayData({
  agency: 'CFTC',
  assetClass: 'RATES',
  pollingInterval: 30000,
  enabled: true,
  onNewData: (newTrades) => {
    console.log(`Received ${newTrades.length} new trades`);
  }
});
```

### Integrating with UI Components

```tsx
<div>
  <h2>Intraday Monitor: {selectedAssetClass}</h2>
  <p>
    Showing {trades.length} trades • Last batch: {metadata.lastKnownSliceId} •
    Last updated: {metadata.lastUpdated?.toLocaleTimeString() || 'N/A'}
  </p>

  {/* Trade Table */}
  <TradeTable
    trades={trades}
    loading={isLoading}
  />

  {/* Controls */}
  <div>
    <button onClick={refresh} disabled={isLoading || isPolling}>
      Refresh Now
    </button>
    <button onClick={reset}>
      Reset Data
    </button>
  </div>
</div>
```

### Example API Requests

#### Initial Data Fetch

```
GET /api/dtcc/intraday?agency=CFTC&assetClass=RATES
```

This returns all accumulated trades from all batches.

#### Check for New Data

```
GET /api/dtcc/intraday?agency=CFTC&assetClass=RATES&checkNew=true&lastKnownSliceId=5
```

This checks for new batches since batch ID 5 and returns only the new trades.

#### Reset and Generate Test Data

```
GET /api/dtcc/intraday?agency=CFTC&assetClass=RATES&reset=true&generateMockBatch=true
```

This resets the store and generates a mock batch for testing.

## Testing

The system includes tests to validate the batch-based accumulation logic:

- `intradayTests.ts`: Tests batch accumulation and batch ID tracking
- Test page at `/tests/intraday`: UI for running and monitoring tests

Example test results:

```
✅ Batch accumulation test passed! Correct accumulation and deduplication.
✅ Last known batch ID tracking test passed!
✅ All intraday tests passed!
```

## Best Practices

1. **Always accumulate batches**: Never replace the entire dataset, only add new trades to maintain consistency.
2. **Track batch IDs**: Properly track the last known batch ID to avoid duplicate processing.
3. **Handle race conditions**: Use refs and proper state management to prevent UI jitter during updates.
4. **Use server-side state**: Maintain accumulated data on the server to ensure consistency between refreshes.
5. **Implement error handling**: Properly handle network errors and retry mechanisms.
6. **Prevent duplicate batches**: Check if a batch has already been processed before adding its trades.
7. **Stable state updates**: Use stable references to prevent unnecessary UI rerenders.

## Common Issues and Troubleshooting

### Missing Trades

If you notice missing trades, check the following:

1. Ensure the server-side store is initialized and properly accumulating batches
2. Verify that the `lastKnownBatchId` tracking is working correctly
3. Check that all batches starting from 1 are being processed
4. Look at the API response to verify batch IDs are sequential

### Duplicate Trades

The server-side store prevents duplicates by tracking which batches have been processed. If you see duplicates:

1. Check the `addBatch` implementation to ensure it's checking for existing batches
2. Verify that batch IDs are correctly assigned and tracked
3. Check the client-side handling of new trades to ensure they're not added twice

### Performance Considerations

Optimizations for handling large volumes of intraday data:

1. Use incremental updates with `checkNew=true` and `lastKnownBatchId`
2. Implement pagination in the UI to show a subset of trades
3. Use memoization for derived calculations to prevent redundant processing
4. Consider batch compression techniques for historical analysis

## Conclusion

The server-side store approach for DTCC intraday data ensures consistent data accumulation between client refreshes. By maintaining state on the server and using React hooks for asynchronous data fetching, we can provide a stable and accurate view of intraday swap trade data.

The combination of batch tracking, incremental updates, and race condition prevention creates a robust solution that handles the unique requirements of batch-based intraday data processing.