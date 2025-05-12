'use client';

/**
 * Intraday Monitoring Page
 * 
 * This page provides real-time monitoring of DTCC intraday data
 * with stable UI updates and batch-based accumulation.
 */

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import IntradayMonitor from '@/components/intraday/IntradayMonitor';
import { Agency, AssetClass, DTCCTrade } from '@/types/dtcc';

export default function IntradayMonitoringPage() {
  // Parameters for monitoring
  const [selectedAgency, setSelectedAgency] = useState<Agency>('CFTC');
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass>('RATES');
  const [pollingInterval, setPollingInterval] = useState<number>(30000); // 30 seconds default
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
                onChange={(e) => setSelectedAgency(e.target.value as Agency)}
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
                onChange={(e) => setSelectedAssetClass(e.target.value as AssetClass)}
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
          
          <div className="mt-4 text-sm text-gray-500">
            <p>
              This monitor accumulates all intraday trades from the DTCC SDR. Each batch contains new trades as they are 
              reported, and we build the complete dataset by combining all batches. The monitor automatically polls for 
              new batches at the specified interval.
            </p>
          </div>
        </div>
        
        {/* Activity Log */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Monitor */}
          <div className="md:w-3/4">
            <IntradayMonitor
              agency={selectedAgency}
              assetClass={selectedAssetClass}
              pollingInterval={pollingInterval}
              onNewData={handleNewData}
            />
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}