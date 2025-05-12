/**
 * DTCC Intraday API Route
 * 
 * This file defines the API endpoint for accessing DTCC intraday data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DTCCService } from '@/lib/dtcc/dtccService';
import { Agency, AssetClass, DTCCIntraDayParams } from '@/types/dtcc';
import { parseISO } from 'date-fns';

// Initialize the DTCC service
const dtccService = new DTCCService();

/**
 * Get DTCC intraday data
 *
 * Endpoint: GET /api/dtcc/intraday
 * Query parameters:
 * - agency: 'CFTC' | 'SEC'
 * - assetClass: 'RATES' | 'CREDITS' | 'EQUITIES' | 'FOREX' | 'COMMODITIES'
 * - minSliceId: number (optional) - The first batch ID to fetch (default: 1)
 * - lastKnownSliceId: number (optional) - The last known batch ID
 * - useCache: boolean (optional) - Whether to use cached data (default: true)
 * - checkNew: boolean (optional) - Whether to check for new data since the last known batch
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
    const useCache = searchParams.get('useCache') !== 'false';
    const checkNew = searchParams.get('checkNew') === 'true';

    // Validate required parameters
    if (!agency || !assetClass) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if we should only look for new data
    if (checkNew) {
      console.log(`Checking for new intraday data for ${agency}-${assetClass}`);
      const response = await dtccService.checkForNewIntradayData(agency, assetClass);
      return NextResponse.json(response);
    }

    // Parse numeric parameters if provided
    const minSliceId = minSliceIdStr ? parseInt(minSliceIdStr, 10) : undefined;
    const lastKnownSliceId = lastKnownSliceIdStr ? parseInt(lastKnownSliceIdStr, 10) : undefined;

    // For backward compatibility, also accept timestamp parameters
    const startTimestampStr = searchParams.get('startTimestamp');
    const endTimestampStr = searchParams.get('endTimestamp');
    const startTimestamp = startTimestampStr ? parseISO(startTimestampStr) : undefined;
    const endTimestamp = endTimestampStr ? parseISO(endTimestampStr) : undefined;

    if (startTimestampStr || endTimestampStr) {
      console.warn('startTimestamp and endTimestamp are deprecated for intraday data. Use minSliceId and lastKnownSliceId instead.');
    }

    // Create fetch parameters
    const fetchParams: DTCCIntraDayParams = {
      agency,
      assetClass,
      minSliceId,
      lastKnownSliceId,
      startTimestamp, // For backward compatibility
      endTimestamp,   // For backward compatibility
      useCache
    };

    console.log(`Fetching intraday data for ${agency}-${assetClass} with parameters:`, {
      minSliceId,
      lastKnownSliceId,
      useCache
    });

    // Fetch data
    const response = await dtccService.fetchIntradayData(fetchParams);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in DTCC intraday endpoint:', error);

    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}