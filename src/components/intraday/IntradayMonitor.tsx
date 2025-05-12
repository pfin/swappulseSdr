'use client';

/**
 * Intraday Monitor Component
 * 
 * Provides real-time monitoring of DTCC intraday data with stable UI updates.
 * Handles batch-based data accumulation without causing UI jitter.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Agency, AssetClass, DTCCResponse, DTCCTrade } from '@/types/dtcc';
import TradeTable from '@/components/data/TradeTable';

interface IntradayMonitorProps {
  agency: Agency;
  assetClass: AssetClass;
  pollingInterval?: number; // in milliseconds
  onNewData?: (newTrades: DTCCTrade[]) => void;
}

export default function IntradayMonitor({
  agency,
  assetClass,
  pollingInterval = 30000, // Default: poll every 30 seconds
  onNewData
}: IntradayMonitorProps) {
  // Store accumulated trades
  const [trades, setTrades] = useState<DTCCTrade[]>([]);
  
  // Track metadata for display and polling
  const [metadata, setMetadata] = useState<{
    lastKnownSliceId: number;
    highestSliceId: number;
    lastUpdated: Date | null;
    totalTradeCount: number;
    isPolling: boolean;
    isInitialLoad: boolean;
  }>({
    lastKnownSliceId: 0,
    highestSliceId: 0,
    lastUpdated: null,
    totalTradeCount: 0,
    isPolling: false,
    isInitialLoad: true
  });
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to prevent race conditions during polling
  const tradesRef = useRef<DTCCTrade[]>(trades);
  const metadataRef = useRef(metadata);
  
  // Update refs when state changes
  useEffect(() => {
    tradesRef.current = trades;
    metadataRef.current = metadata;
  }, [trades, metadata]);
  
  // Initial data fetch
  useEffect(() => {
    fetchInitialData();
  }, [agency, assetClass]);
  
  // Polling mechanism
  useEffect(() => {
    // Only start polling after initial load completes
    if (metadata.isInitialLoad) {
      return;
    }
    
    const intervalId = setInterval(() => {
      pollForNewData();
    }, pollingInterval);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [metadata.isInitialLoad, pollingInterval]);
  
  // Fetch initial intraday data (all available batches)
  const fetchInitialData = async () => {
    try {
      setError(null);
      
      // Build API URL
      const apiUrl = `/api/dtcc/intraday?agency=${agency}&assetClass=${assetClass}&minSliceId=1&useCache=true`;
      
      // Fetch initial data
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data: DTCCResponse = await response.json();
      
      // Update state with stable references
      // This prevents UI jitter by setting all state at once
      setTrades(data.trades);
      setMetadata({
        lastKnownSliceId: data.metadata.highestSliceId || 0,
        highestSliceId: data.metadata.highestSliceId || 0,
        lastUpdated: data.metadata.lastUpdated ? new Date(data.metadata.lastUpdated) : new Date(),
        totalTradeCount: data.trades.length,
        isPolling: false,
        isInitialLoad: false
      });
      
      // Notify parent component if callback provided
      if (onNewData) {
        onNewData(data.trades);
      }
      
    } catch (err) {
      setError(`Failed to fetch initial intraday data: ${(err as Error).message}`);
      setMetadata(prev => ({
        ...prev,
        isInitialLoad: false
      }));
    }
  };
  
  // Poll for new intraday data (only new batches)
  const pollForNewData = async () => {
    // Prevent concurrent polling
    if (metadataRef.current.isPolling) {
      return;
    }
    
    try {
      // Update polling state
      setMetadata(prev => ({
        ...prev,
        isPolling: true
      }));
      
      // Build API URL for checking new data
      const apiUrl = `/api/dtcc/intraday?agency=${agency}&assetClass=${assetClass}&checkNew=true`;
      
      // Fetch only new data
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data: DTCCResponse = await response.json();
      
      // Check if we got new data
      if (data.trades.length > 0) {
        console.log(`Found ${data.trades.length} new trades in batch(es)`, data.metadata.processedSliceIds);
        
        // Create a stable reference for the combined data
        // This is key to preventing UI jitter - we create the new array once
        // rather than incrementally updating the state
        const updatedTrades = [...tradesRef.current, ...data.trades];
        
        // Update UI in a single state update to prevent jitter
        setTrades(updatedTrades);
        setMetadata(prev => ({
          ...prev,
          lastKnownSliceId: data.metadata.highestSliceId || prev.lastKnownSliceId,
          highestSliceId: data.metadata.highestSliceId || prev.highestSliceId,
          lastUpdated: data.metadata.lastUpdated ? new Date(data.metadata.lastUpdated) : new Date(),
          totalTradeCount: updatedTrades.length,
          isPolling: false
        }));
        
        // Notify parent component if callback provided
        if (onNewData) {
          onNewData(data.trades);
        }
      } else {
        // No new data, just update polling state
        setMetadata(prev => ({
          ...prev,
          lastUpdated: new Date(),
          isPolling: false
        }));
      }
    } catch (err) {
      setError(`Error polling for new data: ${(err as Error).message}`);
      setMetadata(prev => ({
        ...prev,
        isPolling: false
      }));
    }
  };
  
  // Force a manual refresh
  const handleManualRefresh = () => {
    if (!metadata.isPolling) {
      pollForNewData();
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Intraday Monitor: {assetClass}</h2>
          <p className="text-sm text-gray-500">
            {metadata.isInitialLoad ? (
              'Loading initial data...'
            ) : (
              <>
                Showing {trades.length} trades • Last batch: {metadata.lastKnownSliceId} • 
                Last updated: {metadata.lastUpdated?.toLocaleTimeString() || 'N/A'}
              </>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <div className="flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
              metadata.isPolling ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'
            }`}></span>
            <span className="text-sm text-gray-600">
              {metadata.isPolling ? 'Fetching...' : 'Live'}
            </span>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={metadata.isPolling || metadata.isInitialLoad}
            className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Data Display with Stable References */}
      <div className="relative">
        {/* Loading Overlay */}
        {metadata.isInitialLoad && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-2"></div>
              <p className="text-indigo-600">Loading intraday data...</p>
            </div>
          </div>
        )}
        
        {/* Trade Table */}
        <TradeTable
          trades={trades}
          loading={metadata.isInitialLoad}
        />
      </div>
    </div>
  );
}