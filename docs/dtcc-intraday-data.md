# DTCC Intraday Data Documentation

## DTCC Intraday Data Structure

The DTCC Swap Data Repository (SDR) publishes intraday data as a series of sequential batch files throughout the trading day. Each file contains new trades that were reported since the previous batch. Understanding how these files work is crucial for correctly processing intraday swap trade data.

### Key Characteristics

1. **Sequential Batch Files**: Intraday data is published in numbered batch files, starting from 1 and incrementing throughout the day as new trades are reported.

2. **Cumulative Nature**: Each batch file contains only the new trades that occurred since the previous batch. To get the complete set of today's trades, you need to accumulate all the batch files.

3. **File Monitoring**: To stay current with today's trades, you need to continuously check for new batch files and process them as they become available.

## Implementation Guide

### Fetching Intraday Data

The correct approach for fetching intraday data is to:

1. Start with the first batch file (ID = 1)
2. Process each batch file in sequence
3. Accumulate trades from all batches
4. Regularly check for new batch files

```typescript
// Example using the dtccService
const fetchTodaysTrades = async () => {
  const params: DTCCIntraDayParams = {
    agency: 'DTCC',
    assetClass: 'IR',
    minSliceId: 1, // Start from the first batch
    useCache: true // Enable caching for performance
  };
  
  // This will fetch all available batch files and return accumulated trades
  const response = await dtccService.fetchIntradayData(params);
  
  return response.trades;
};
```

### Monitoring for New Data

To continuously monitor for new batch files, you can implement a polling mechanism:

```typescript
// Example of a monitoring function
const monitorIntradayData = async () => {
  // Initial fetch to get all current data
  let currentResponse = await dtccService.fetchIntradayData({
    agency: 'DTCC',
    assetClass: 'IR',
    minSliceId: 1,
    useCache: true
  });
  
  // Set up polling interval (e.g., check every 5 minutes)
  const pollingInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  setInterval(async () => {
    try {
      // Check for new data since the last known batch
      const newDataResponse = await dtccService.checkForNewIntradayData(
        'DTCC',
        'IR'
      );
      
      // If new trades were found, process them
      if (newDataResponse.trades.length > 0) {
        console.log(`Found ${newDataResponse.trades.length} new trades in batch(es)`, 
                    newDataResponse.metadata.processedSliceIds);
        
        // Merge with existing data
        currentResponse.trades = [
          ...currentResponse.trades,
          ...newDataResponse.trades
        ];
        
        // Trigger any necessary updates (e.g., update UI, recalculate analytics)
        onNewTradesReceived(newDataResponse.trades);
      }
    } catch (error) {
      console.error('Error checking for new intraday data:', error);
    }
  }, pollingInterval);
};
```

## API Usage

The intraday API endpoint supports several query parameters:

- `agency`: The reporting agency (e.g., 'DTCC')
- `assetClass`: The asset class (e.g., 'IR', 'CR', 'EQ', 'FX', 'CO')
- `minSliceId`: The first batch ID to fetch (default: 1)
- `lastKnownSliceId`: The last batch ID that was previously fetched (for incremental updates)
- `useCache`: Whether to use cached data (default: true)
- `checkNew`: Whether to only check for new data since the last known batch (default: false)

### Example API Requests

#### Initial Data Fetch

```
GET /api/dtcc/intraday?agency=DTCC&assetClass=IR&minSliceId=1&useCache=true
```

This returns all available trades from all batches starting from batch ID 1.

#### Check for New Data

```
GET /api/dtcc/intraday?agency=DTCC&assetClass=IR&checkNew=true
```

This checks for new batches since the last known batch ID and returns only the new trades.

## Working with the DTCC Intraday Data Cache

The system maintains a cache of accumulated intraday data to improve performance. The cache is structured as follows:

1. **Cache Key**: `${agency}_${assetClass}_${yyyy-MM-dd}`
2. **Cache Value**: An object containing:
   - `trades`: Array of accumulated trades
   - `metadata`: Object with information about the cached data
     - `highestSliceId`: The highest batch ID included in the cache
     - `lastUpdated`: When the cache was last updated
     - `batchCounts`: Map of batch IDs to the number of trades in each batch

### Cache Invalidation

The cache is automatically invalidated at the start of each new trading day. You can also manually invalidate the cache by setting `useCache=false` in your API requests.

## Common Issues and Troubleshooting

### Missing Trades

If you notice missing trades, ensure you're starting from batch ID 1 and processing all batches sequentially. Remember that each batch only contains new trades since the previous batch.

### Duplicate Trades

To avoid duplicate trades when implementing real-time monitoring, always keep track of the last processed batch ID and only process new batches.

### Performance Considerations

Processing large numbers of batches can be resource-intensive. Consider these optimizations:

1. Use caching to avoid repeatedly processing the same batches
2. Implement incremental updates to only process new batches
3. Schedule batch processing during off-peak hours for historical analysis

## Migration from Timestamp-Based to Batch-Based Processing

If you're migrating from the old timestamp-based approach to the new batch-based approach, here are the key changes:

1. Replace `startTimestamp` and `endTimestamp` with `minSliceId`
2. Implement accumulation of trades from all batches
3. Set up monitoring for new batches
4. Update any analysis code to handle the accumulated dataset

## Conclusion

Understanding the batch-based nature of DTCC intraday data is crucial for correctly processing swap trade data. By following the guidance in this document, you can ensure your application correctly handles intraday data and stays current with new trades throughout the trading day.