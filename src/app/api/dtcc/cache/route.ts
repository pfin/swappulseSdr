/**
 * DTCC Cache API Route
 * 
 * This file defines the API endpoints for managing the DTCC data cache.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DTCCService } from '@/lib/dtcc/dtccService';

// Initialize the DTCC service
const dtccService = new DTCCService();

/**
 * Clear the DTCC cache
 * 
 * Endpoint: DELETE /api/dtcc/cache
 */
export async function DELETE(request: NextRequest) {
  try {
    await dtccService.clearCache();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing DTCC cache:', error);
    
    return NextResponse.json(
      { error: `Server error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}