/**
 * DTCC Intraday API Route
 *
 * This file defines the API endpoint for accessing DTCC intraday data.
 * Uses an in-memory store for consistent batch-based accumulation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Agency, AssetClass, DTCCResponse, DTCCTrade } from '@/types/dtcc';
import { intraDayStore } from '@/lib/dtcc/dtccIntraDayStore';
import { parseISO } from 'date-fns';

/**
 * Get DTCC intraday data
 *
 * Endpoint: GET /api/dtcc/intraday
 * Query parameters:
 * - agency: 'CFTC' | 'SEC'
 * - assetClass: 'RATES' | 'CREDITS' | 'EQUITIES' | 'FOREX' | 'COMMODITIES'
 * - minSliceId: number (optional) - The first batch ID to fetch (default: 1)
 * - lastKnownSliceId: number (optional) - The last known batch ID
 * - reset: boolean (optional) - Whether to reset the store (default: false)
 * - checkNew: boolean (optional) - Whether to check for new data since the last known batch
 * - generateMockBatch: boolean (optional) - Generate a new mock batch for testing
 *
 * Note: startTimestamp and endTimestamp are deprecated for intraday data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get query parameters
    const agency = searchParams.get('agency') as Agency;
    const assetClass = searchParams.get('assetClass') as AssetClass;
    const minSliceIdStr = searchParams.get('minSliceId');
    const lastKnownSliceIdStr = searchParams.get('lastKnownSliceId');
    const reset = searchParams.get('reset') === 'true';
    const checkNew = searchParams.get('checkNew') === 'true';
    const generateMockBatch = searchParams.get('generateMockBatch') === 'true';

    // Validate required parameters
    if (!agency || !assetClass) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Reset the store if requested
    if (reset) {
      console.log(`Resetting intraday store for ${agency}-${assetClass}`);
      intraDayStore.resetStore(agency, assetClass);

      // Initialize with batch 1
      const initialBatchTrades = intraDayStore.generateMockBatch(agency, assetClass, 1, 10);
      intraDayStore.addBatch(agency, assetClass, 1, initialBatchTrades);
    }

    // Generate a new mock batch for testing if requested
    if (generateMockBatch) {
      const metadata = intraDayStore.getMetadata(agency, assetClass);
      const newBatchId = metadata.lastKnownBatchId + 1;

      console.log(`Generating new mock batch ${newBatchId} for ${agency}-${assetClass}`);
      const newBatchTrades = intraDayStore.generateMockBatch(
        agency,
        assetClass,
        newBatchId,
        Math.floor(Math.random() * 5) + 3 // 3-7 trades in each batch
      );

      // Add the new batch to the store
      intraDayStore.addBatch(agency, assetClass, newBatchId, newBatchTrades);
    }

    // Check if we should only look for new data
    if (checkNew) {
      console.log(`Checking for new intraday data for ${agency}-${assetClass}`);

      // Parse last known batch ID
      const lastKnownBatchId = lastKnownSliceIdStr
        ? parseInt(lastKnownSliceIdStr, 10)
        : 0;

      // Get new trades since the last known batch ID
      const {
        trades,
        processedBatchIds,
        highestBatchId
      } = intraDayStore.getNewTradesSince(agency, assetClass, lastKnownBatchId);

      // Get metadata
      const metadata = intraDayStore.getMetadata(agency, assetClass);

      const response: DTCCResponse = {
        trades,
        metadata: {
          count: trades.length,
          startDate: new Date(),
          endDate: new Date(),
          agency,
          assetClass,
          fetchDuration: 0,
          highestSliceId: highestBatchId,
          processedSliceIds: processedBatchIds,
          lastUpdated: metadata.lastUpdated
        }
      };

      return NextResponse.json(response);
    }

    // Parse numeric parameters if provided
    const minSliceId = minSliceIdStr ? parseInt(minSliceIdStr, 10) : 1;
    const lastKnownSliceId = lastKnownSliceIdStr ? parseInt(lastKnownSliceIdStr, 10) : 0;

    console.log(`Fetching all intraday data for ${agency}-${assetClass}`);

    // Check if we have any data for this agency/assetClass
    const metadata = intraDayStore.getMetadata(agency, assetClass);

    // If the store is empty, initialize with batch 1
    if (metadata.totalTrades === 0) {
      console.log(`No data found for ${agency}-${assetClass}, generating initial batch`);
      const initialBatchTrades = intraDayStore.generateMockBatch(agency, assetClass, 1, 10);
      intraDayStore.addBatch(agency, assetClass, 1, initialBatchTrades);
    }

    // Get all accumulated trades
    const allTrades = intraDayStore.getAllTrades(agency, assetClass);

    // Get updated metadata
    const updatedMetadata = intraDayStore.getMetadata(agency, assetClass);

    // Prepare response
    const response: DTCCResponse = {
      trades: allTrades,
      metadata: {
        count: allTrades.length,
        startDate: new Date(),
        endDate: new Date(),
        agency,
        assetClass,
        fetchDuration: 0,
        cacheHit: false,
        highestSliceId: updatedMetadata.lastKnownBatchId,
        processedSliceIds: updatedMetadata.batchIds,
        lastUpdated: updatedMetadata.lastUpdated
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in DTCC intraday endpoint:', error);

    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}