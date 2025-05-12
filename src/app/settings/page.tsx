'use client';

/**
 * Settings Page
 * 
 * Allows users to configure application settings and preferences.
 */

import { useState } from 'react';
import Layout from '@/components/layout/Layout';

interface Settings {
  cacheEnabled: boolean;
  cacheMaxSize: number; // in number of records
  cacheTTL: number; // in hours
  maxConcurrentRequests: number;
  defaultAgency: 'CFTC' | 'SEC';
  defaultAssetClass: 'RATES' | 'CREDITS' | 'EQUITIES' | 'FOREX' | 'COMMODITIES';
  theme: 'light' | 'dark' | 'system';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    cacheEnabled: true,
    cacheMaxSize: 100000,
    cacheTTL: 24,
    maxConcurrentRequests: 5,
    defaultAgency: 'CFTC',
    defaultAssetClass: 'RATES',
    theme: 'light',
    dateFormat: 'MM/DD/YYYY'
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setSettings(prev => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate saving with timeout
    setTimeout(() => {
      setIsSaving(false);
      setShowSavedMessage(true);
      
      // Hide message after 3 seconds
      setTimeout(() => {
        setShowSavedMessage(false);
      }, 3000);
    }, 800);
  };
  
  return (
    <Layout showSidebar={false}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure application settings and preferences.
          </p>
        </div>
        
        {showSavedMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg 
                  className="h-5 w-5 text-green-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Settings saved successfully.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm">
          <div className="space-y-8">
            {/* Cache Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Settings</h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="cacheEnabled"
                        name="cacheEnabled"
                        type="checkbox"
                        checked={settings.cacheEnabled}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="cacheEnabled" className="font-medium text-gray-700">Enable Caching</label>
                      <p className="text-gray-500">Use local cache to improve performance.</p>
                    </div>
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="cacheTTL" className="block text-sm font-medium text-gray-700">
                    Cache TTL (hours)
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="cacheTTL"
                      id="cacheTTL"
                      value={settings.cacheTTL}
                      onChange={handleChange}
                      min={1}
                      max={168}
                      disabled={!settings.cacheEnabled}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="cacheMaxSize" className="block text-sm font-medium text-gray-700">
                    Max Cache Size (records)
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="cacheMaxSize"
                      id="cacheMaxSize"
                      value={settings.cacheMaxSize}
                      onChange={handleChange}
                      min={10000}
                      max={1000000}
                      step={10000}
                      disabled={!settings.cacheEnabled}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Recommended: 100,000</p>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="maxConcurrentRequests" className="block text-sm font-medium text-gray-700">
                    Max Concurrent Requests
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="maxConcurrentRequests"
                      id="maxConcurrentRequests"
                      value={settings.maxConcurrentRequests}
                      onChange={handleChange}
                      min={1}
                      max={10}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Higher values may trigger rate limiting.</p>
                </div>
              </div>
            </div>
            
            {/* Default Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Default Settings</h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="defaultAgency" className="block text-sm font-medium text-gray-700">
                    Default Agency
                  </label>
                  <div className="mt-1">
                    <select
                      id="defaultAgency"
                      name="defaultAgency"
                      value={settings.defaultAgency}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="CFTC">CFTC</option>
                      <option value="SEC">SEC</option>
                    </select>
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="defaultAssetClass" className="block text-sm font-medium text-gray-700">
                    Default Asset Class
                  </label>
                  <div className="mt-1">
                    <select
                      id="defaultAssetClass"
                      name="defaultAssetClass"
                      value={settings.defaultAssetClass}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="RATES">RATES</option>
                      <option value="CREDITS">CREDITS</option>
                      <option value="EQUITIES">EQUITIES</option>
                      <option value="FOREX">FOREX</option>
                      <option value="COMMODITIES">COMMODITIES</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Display Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Display Settings</h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                    Theme
                  </label>
                  <div className="mt-1">
                    <select
                      id="theme"
                      name="theme"
                      value={settings.theme}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System Default</option>
                    </select>
                  </div>
                </div>
                
                <div className="sm:col-span-3">
                  <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700">
                    Date Format
                  </label>
                  <div className="mt-1">
                    <select
                      id="dateFormat"
                      name="dateFormat"
                      value={settings.dateFormat}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Reset to Defaults
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}