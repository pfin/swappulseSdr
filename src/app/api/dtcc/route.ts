/**
 * DTCC API Routes
 * 
 * This file defines the API endpoints for accessing DTCC data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DTCCService } from '@/lib/dtcc/dtccService';
import { 
  Agency, 
  AssetClass, 
  DTCCFetchParams,
  TradeFilters 
} from '@/types/dtcc';
import { parse, parseISO } from 'date-fns';

// Initialize the DTCC service
const dtccService = new DTCCService();

/**
 * Get DTCC historical data
 * 
 * Endpoint: GET /api/dtcc/historical
 * Query parameters:
 * - agency: 'CFTC' | 'SEC'
 * - assetClass: 'RATES' | 'CREDITS' | 'EQUITIES' | 'FOREX' | 'COMMODITIES'
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - useCache: boolean (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters
    const agency = searchParams.get('agency') as Agency;
    const assetClass = searchParams.get('assetClass') as AssetClass;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const useCache = searchParams.get('useCache') !== 'false';
    
    // Validate required parameters
    if (!agency || !assetClass || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Parse date strings
    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);
    
    // Validate date range (max 30 days)
    const maxDays = 30;
    const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff < 0) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }
    
    if (dayDiff > maxDays) {
      return NextResponse.json(
        { error: `Date range cannot exceed ${maxDays} days` },
        { status: 400 }
      );
    }
    
    // Create fetch parameters
    const fetchParams: DTCCFetchParams = {
      agency,
      assetClass,
      startDate,
      endDate,
      useCache
    };
    
    // Fetch data
    const response = await dtccService.fetchAllData(fetchParams);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in DTCC historical endpoint:', error);
    
    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Filter DTCC data
 * 
 * Endpoint: POST /api/dtcc/filter
 * Body:
 * - trades: DTCCTrade[]
 * - filters: TradeFilters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get body parameters
    const { trades, filters } = body;
    
    // Validate required parameters
    if (!trades || !filters) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Convert date strings to Date objects in filters
    const processedFilters: TradeFilters = {
      ...filters,
      startDate: filters.startDate ? parseISO(filters.startDate) : undefined,
      endDate: filters.endDate ? parseISO(filters.endDate) : undefined
    };
    
    // Apply filters
    const filteredTrades = dtccService.filterTrades(trades, processedFilters);
    
    // Generate analytics if requested
    let analytics = undefined;
    if (body.generateAnalytics === true) {
      analytics = dtccService.generateAnalytics(filteredTrades);
    }
    
    return NextResponse.json({
      trades: filteredTrades,
      count: filteredTrades.length,
      analytics
    });
  } catch (error) {
    console.error('Error in DTCC filter endpoint:', error);
    
    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Analyze DTCC data
 * 
 * Endpoint: POST /api/dtcc/analyze
 * Body:
 * - trades: DTCCTrade[]
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get body parameters
    const { trades } = body;
    
    // Validate required parameters
    if (!trades || !Array.isArray(trades)) {
      return NextResponse.json(
        { error: 'Missing or invalid trades parameter' },
        { status: 400 }
      );
    }
    
    // Generate analytics
    const analytics = dtccService.generateAnalytics(trades);
    
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error in DTCC analyze endpoint:', error);
    
    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}