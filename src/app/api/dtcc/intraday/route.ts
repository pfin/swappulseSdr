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
 * - maxSlices: number (optional, default: 10) - Maximum number of most recent slices to fetch
 * - useCache: boolean (optional)
 * 
 * Note: startTimestamp and endTimestamp parameters are deprecated as intraday data
 * is identified by sequential batch numbers, not timestamps.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const agency = searchParams.get('agency') as Agency;
    const assetClass = searchParams.get('assetClass') as AssetClass;
    const maxSlicesStr = searchParams.get('maxSlices');
    const useCache = searchParams.get('useCache') !== 'false';
    
    // Validate required parameters
    if (!agency || !assetClass) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Parse maxSlices if provided
    const maxSlices = maxSlicesStr ? parseInt(maxSlicesStr, 10) : undefined;
    
    // Create fetch parameters
    const fetchParams: DTCCIntraDayParams = {
      agency,
      assetClass,
      maxSlices,
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