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
 * - startTimestamp: ISO date string (optional)
 * - endTimestamp: ISO date string (optional)
 * - useCache: boolean (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const agency = searchParams.get('agency') as Agency;
    const assetClass = searchParams.get('assetClass') as AssetClass;
    const startTimestampStr = searchParams.get('startTimestamp');
    const endTimestampStr = searchParams.get('endTimestamp');
    const useCache = searchParams.get('useCache') !== 'false';
    
    // Validate required parameters
    if (!agency || !assetClass) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Parse timestamp strings if provided
    const startTimestamp = startTimestampStr ? parseISO(startTimestampStr) : undefined;
    const endTimestamp = endTimestampStr ? parseISO(endTimestampStr) : undefined;
    
    // Create fetch parameters
    const fetchParams: DTCCIntraDayParams = {
      agency,
      assetClass,
      startTimestamp,
      endTimestamp,
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