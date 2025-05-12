'use client';

/**
 * Intraday Monitoring Page
 *
 * This page provides real-time monitoring of DTCC intraday data
 * with stable UI updates and batch-based accumulation.
 * Uses the useIntradayData hook for asynchronous data fetching.
 */

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import TradeTable from '@/components/data/TradeTable';
import { useIntradayData } from '@/hooks/useIntradayData';
import { Agency, AssetClass, DTCCTrade } from '@/types/dtcc';

export default function IntradayMonitoringPage() {
  // Parameters for monitoring
  const [selectedAgency, setSelectedAgency] = useState<Agency>('CFTC');
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass>('RATES');
  const [pollingInterval, setPollingInterval] = useState<number>(30000); // 30 seconds default
  const [pollingEnabled, setPollingEnabled] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<{
    message: string;
    timestamp: Date;
  }[]>([]);

  // Handle new data notifications
  const handleNewData = (newTrades: DTCCTrade[]) => {
    if (newTrades.length > 0) {
      const now = new Date();
      setNotifications(prev => [
        {
          message: `Received ${newTrades.length} new trades for ${selectedAssetClass}`,
          timestamp: now
        },
        ...prev.slice(0, 9) // Keep last 10 notifications
      ]);
    }
  };

  // Use the intraday data hook
  const {
    trades,
    metadata,
    isLoading,
    isPolling,
    error,
    refresh,
    reset
  } = useIntradayData({
    agency: selectedAgency,
    assetClass: selectedAssetClass,
    pollingInterval,
    enabled: pollingEnabled,
    onNewData: handleNewData
  });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">DTCC Intraday Monitoring</h1>
          <p className="mt-2 text-gray-600">
            Real-time monitoring of intraday swap trades from DTCC Swap Data Repository.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Monitor Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Agency Selection */}
            <div>
              <label htmlFor="agency" className="block text-sm font-medium text-gray-700 mb-1">
                Agency
              </label>
              <select
                id="agency"
                value={selectedAgency}
                onChange={(e) => {
                  setSelectedAgency(e.target.value as Agency);
                  reset(); // Reset data when agency changes
                }}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="CFTC">CFTC</option>
                <option value="SEC">SEC</option>
              </select>
            </div>

            {/* Asset Class Selection */}
            <div>
              <label htmlFor="assetClass" className="block text-sm font-medium text-gray-700 mb-1">
                Asset Class
              </label>
              <select
                id="assetClass"
                value={selectedAssetClass}
                onChange={(e) => {
                  setSelectedAssetClass(e.target.value as AssetClass);
                  reset(); // Reset data when asset class changes
                }}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="RATES">RATES</option>
                <option value="CREDITS">CREDITS</option>
                <option value="EQUITIES">EQUITIES</option>
                <option value="FOREX">FOREX</option>
                <option value="COMMODITIES">COMMODITIES</option>
              </select>
            </div>

            {/* Polling Interval */}
            <div>
              <label htmlFor="pollingInterval" className="block text-sm font-medium text-gray-700 mb-1">
                Polling Interval
              </label>
              <select
                id="pollingInterval"
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <p>
                This monitor accumulates all intraday trades from the DTCC SDR. Each batch contains new trades as they are
                reported, and we build the complete dataset by combining all batches.
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={refresh}
                disabled={isLoading || isPolling}
                className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50"
              >
                Refresh Now
              </button>

              <div className="flex items-center">
                <input
                  id="autoRefresh"
                  type="checkbox"
                  checked={pollingEnabled}
                  onChange={(e) => setPollingEnabled(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRefresh" className="ml-2 block text-sm text-gray-900">
                  Auto-refresh
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Status Header */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Intraday Monitor: {selectedAssetClass}</h2>
            <p className="text-sm text-gray-500">
              {isLoading ? (
                'Loading initial data...'
              ) : (
                <>
                  Showing {trades.length} trades • Last batch: {metadata.lastKnownSliceId} •
                  Last updated: {metadata.lastUpdated?.toLocaleTimeString() || 'N/A'}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
              isPolling ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'
            }`}></span>
            <span className="text-sm text-gray-600">
              {isPolling ? 'Fetching...' : 'Live'}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
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

        {/* Activity Log */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Table */}
          <div className="md:w-3/4">
            <div className="relative">
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-2"></div>
                    <p className="text-indigo-600">Loading intraday data...</p>
                  </div>
                </div>
              )}

              {/* Trade Table */}
              <TradeTable
                trades={trades}
                loading={isLoading}
              />
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="md:w-1/4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Activity Log</h3>

              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No activity yet</p>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((notification, index) => (
                    <li key={index} className="text-sm border-l-2 border-indigo-500 pl-3 py-1">
                      <span className="text-gray-900">{notification.message}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {metadata.processedSliceIds && metadata.processedSliceIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Most Recent Batch IDs</h4>
                  <div className="flex flex-wrap gap-1">
                    {metadata.processedSliceIds.map(id => (
                      <span key={id} className="px-2 py-1 text-xs bg-gray-100 rounded-full">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}