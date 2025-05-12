/**
 * DTCC Intraday API Route
 * 
 * This file defines the API endpoint for accessing DTCC intraday data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DTCCService } from '@/lib/dtcc/dtccService';
import { Agency, AssetClass, DTCCIntraDayParams } from '@/types/dtcc';

// Initialize the DTCC service
const dtccService = new DTCCService();

/**
 * Get DTCC intraday data
 * 
 * Endpoint: GET /api/dtcc/intraday
 * Query parameters:
 * - agency: 'CFTC' | 'SEC'
 * - assetClass: 'RATES' | 'CREDITS' | 'EQUITIES' | 'FOREX' | 'COMMODITIES'
 * - minSliceId: number (optional) - The first slice ID to fetch (default: 1)
 * - lastKnownSliceId: number (optional) - The last slice ID that was previously fetched
 * - useCache: boolean (optional) - Whether to use cached data (default: true)
 * - checkNew: boolean (optional) - Only check for new data since the last fetch
 * 
 * Note: Intraday data is published in sequential batch files. Each file has an ID 
 * starting from 1 and incrementing throughout the day. To get all of today's trades,
 * you need to accumulate all batch files published so far.
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
    
    // Parse numeric parameters
    const minSliceId = minSliceIdStr ? parseInt(minSliceIdStr, 10) : undefined;
    const lastKnownSliceId = lastKnownSliceIdStr ? parseInt(lastKnownSliceIdStr, 10) : undefined;
    
    // Check if we should only look for new data
    if (checkNew) {
      const response = await dtccService.checkForNewIntradayData(agency, assetClass);
      return NextResponse.json(response);
    }
    
    // Create fetch parameters
    const fetchParams: DTCCIntraDayParams = {
      agency,
      assetClass,
      minSliceId,
      lastKnownSliceId,
      useCache
    };
    
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