/**
 * useIntradayData Hook
 * 
 * A React hook for fetching and managing DTCC intraday data with
 * asynchronous communication with the backend.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Agency, AssetClass, DTCCTrade, DTCCResponse } from '@/types/dtcc';

interface UseIntradayDataOptions {
  agency: Agency;
  assetClass: AssetClass;
  pollingInterval?: number; // milliseconds
  enabled?: boolean; // whether polling is enabled
  onNewData?: (newTrades: DTCCTrade[]) => void;
}

interface IntradayDataState {
  trades: DTCCTrade[];
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  metadata: {
    lastUpdated: Date | null;
    highestSliceId: number;
    lastKnownSliceId: number;
    tradeCount: number;
    processedSliceIds: number[];
    cacheHit?: boolean;
  };
}

/**
 * Hook for managing DTCC intraday data with stable UI updates
 */
export const useIntradayData = ({
  agency,
  assetClass,
  pollingInterval = 30000,
  enabled = true,
  onNewData
}: UseIntradayDataOptions) => {
  // State for intraday data
  const [state, setState] = useState<IntradayDataState>({
    trades: [],
    isLoading: true,
    isPolling: false,
    error: null,
    metadata: {
      lastUpdated: null,
      highestSliceId: 0,
      lastKnownSliceId: 0,
      tradeCount: 0,
      processedSliceIds: []
    }
  });
  
  // Refs to prevent race conditions
  const stateRef = useRef(state);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update ref when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Build API URL for initial fetch
      const url = `/api/dtcc/intraday?agency=${agency}&assetClass=${assetClass}&minSliceId=1&useCache=true`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data: DTCCResponse = await response.json();
      
      // Update state with a stable reference to prevent UI jitter
      setState({
        trades: data.trades,
        isLoading: false,
        isPolling: false,
        error: null,
        metadata: {
          lastUpdated: data.metadata.lastUpdated ? new Date(data.metadata.lastUpdated) : new Date(),
          highestSliceId: data.metadata.highestSliceId || 0,
          lastKnownSliceId: data.metadata.highestSliceId || 0,
          tradeCount: data.trades.length,
          processedSliceIds: data.metadata.processedSliceIds || [],
          cacheHit: data.metadata.cacheHit
        }
      });
      
      // Notify if callback provided
      if (onNewData && data.trades.length > 0) {
        onNewData(data.trades);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to fetch initial data: ${(error as Error).message}`
      }));
    }
  }, [agency, assetClass, onNewData]);
  
  // Poll for new data
  const pollForNewData = useCallback(async () => {
    // Skip if already polling
    if (stateRef.current.isPolling) {
      return;
    }
    
    try {
      // Update polling state
      setState(prev => ({ ...prev, isPolling: true }));
      
      // Build API URL to check for new data
      const url = `/api/dtcc/intraday?agency=${agency}&assetClass=${assetClass}&checkNew=true`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data: DTCCResponse = await response.json();
      
      // Check if we got new data
      if (data.trades.length > 0) {
        // Update with stable references to prevent UI jitter
        setState(prev => {
          // Create a new array with all trades
          const updatedTrades = [...prev.trades, ...data.trades];
          
          return {
            trades: updatedTrades,
            isLoading: false,
            isPolling: false,
            error: null,
            metadata: {
              lastUpdated: data.metadata.lastUpdated ? new Date(data.metadata.lastUpdated) : new Date(),
              highestSliceId: data.metadata.highestSliceId || prev.metadata.highestSliceId,
              lastKnownSliceId: data.metadata.highestSliceId || prev.metadata.lastKnownSliceId,
              tradeCount: updatedTrades.length,
              processedSliceIds: data.metadata.processedSliceIds || [],
              cacheHit: data.metadata.cacheHit
            }
          };
        });
        
        // Notify if callback provided
        if (onNewData) {
          onNewData(data.trades);
        }
      } else {
        // No new data, just update polling state and timestamp
        setState(prev => ({
          ...prev,
          isPolling: false,
          metadata: {
            ...prev.metadata,
            lastUpdated: new Date()
          }
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isPolling: false,
        error: `Error polling for new data: ${(error as Error).message}`
      }));
    }
  }, [agency, assetClass, onNewData]);
  
  // Manual refresh function
  const refresh = useCallback(() => {
    if (!state.isPolling) {
      pollForNewData();
    }
  }, [pollForNewData, state.isPolling]);
  
  // Reset all data
  const reset = useCallback(() => {
    setState({
      trades: [],
      isLoading: true,
      isPolling: false,
      error: null,
      metadata: {
        lastUpdated: null,
        highestSliceId: 0,
        lastKnownSliceId: 0,
        tradeCount: 0,
        processedSliceIds: []
      }
    });
    
    fetchInitialData();
  }, [fetchInitialData]);
  
  // Initial fetch on mount or when params change
  useEffect(() => {
    fetchInitialData();
    
    // Cleanup polling on unmount or params change
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchInitialData, agency, assetClass]);
  
  // Set up polling if enabled
  useEffect(() => {
    // Only start polling after initial load and if enabled
    if (state.isLoading || !enabled) {
      return;
    }
    
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Start new polling
    pollingRef.current = setInterval(() => {
      pollForNewData();
    }, pollingInterval);
    
    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [state.isLoading, enabled, pollingInterval, pollForNewData]);
  
  return {
    // Data
    trades: state.trades,
    metadata: state.metadata,
    
    // Status
    isLoading: state.isLoading,
    isPolling: state.isPolling,
    error: state.error,
    
    // Actions
    refresh,
    reset
  };
};