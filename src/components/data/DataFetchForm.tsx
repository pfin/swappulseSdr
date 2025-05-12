/**
 * Data Fetch Form Component
 * 
 * Form for fetching DTCC SDR data with controls for date range, asset class, and more.
 */

import { useState, useEffect } from 'react';
import { Agency, AssetClass, DTCCFetchParams } from '@/types/dtcc';
import { addDays, format, parseISO, subDays } from 'date-fns';

interface DataFetchFormProps {
  onFetch: (params: DTCCFetchParams) => void;
  loading?: boolean;
  defaultAssetClass?: AssetClass;
  defaultAgency?: Agency;
}

export default function DataFetchForm({
  onFetch,
  loading = false,
  defaultAssetClass = 'RATES',
  defaultAgency = 'CFTC'
}: DataFetchFormProps) {
  const today = new Date();
  const yesterday = subDays(today, 1);
  const lastWeek = subDays(today, 7);
  
  const [formValues, setFormValues] = useState<{
    agency: Agency;
    assetClass: AssetClass;
    startDate: string;
    endDate: string;
    useCache: boolean;
    maxConcurrentTasks: number;
  }>({
    agency: defaultAgency,
    assetClass: defaultAssetClass,
    startDate: format(lastWeek, 'yyyy-MM-dd'),
    endDate: format(yesterday, 'yyyy-MM-dd'),
    useCache: true,
    maxConcurrentTasks: 5
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormValues(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'maxConcurrentTasks') {
      setFormValues(prev => ({ ...prev, [name]: parseInt(value) }));
    } else {
      setFormValues(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const params: DTCCFetchParams = {
      agency: formValues.agency,
      assetClass: formValues.assetClass,
      startDate: parseISO(formValues.startDate),
      endDate: parseISO(formValues.endDate),
      useCache: formValues.useCache,
      maxConcurrentTasks: formValues.maxConcurrentTasks,
      parallelize: true
    };
    
    onFetch(params);
  };
  
  const setDateRange = (days: number) => {
    const end = format(yesterday, 'yyyy-MM-dd');
    const start = format(subDays(yesterday, days), 'yyyy-MM-dd');
    
    setFormValues(prev => ({
      ...prev,
      startDate: start,
      endDate: end
    }));
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="agency" className="block text-sm font-medium text-gray-700 mb-1">
            Agency
          </label>
          <select
            id="agency"
            name="agency"
            value={formValues.agency}
            onChange={handleChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loading}
          >
            <option value="CFTC">CFTC</option>
            <option value="SEC">SEC</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="assetClass" className="block text-sm font-medium text-gray-700 mb-1">
            Asset Class
          </label>
          <select
            id="assetClass"
            name="assetClass"
            value={formValues.assetClass}
            onChange={handleChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loading}
          >
            <option value="RATES">RATES</option>
            <option value="CREDITS">CREDITS</option>
            <option value="EQUITIES">EQUITIES</option>
            <option value="FOREX">FOREX</option>
            <option value="COMMODITIES">COMMODITIES</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formValues.startDate}
            onChange={handleChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            max={formValues.endDate}
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formValues.endDate}
            onChange={handleChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            min={formValues.startDate}
            max={format(today, 'yyyy-MM-dd')}
            disabled={loading}
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDateRange(1)}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          Last day
        </button>
        <button
          type="button"
          onClick={() => setDateRange(7)}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          Last week
        </button>
        <button
          type="button"
          onClick={() => setDateRange(30)}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          Last month
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center">
          <input
            id="useCache"
            name="useCache"
            type="checkbox"
            checked={formValues.useCache}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            disabled={loading}
          />
          <label htmlFor="useCache" className="ml-2 block text-sm text-gray-700">
            Use cache (faster if data was previously fetched)
          </label>
        </div>
        
        <div>
          <label htmlFor="maxConcurrentTasks" className="block text-sm font-medium text-gray-700 mb-1">
            Max Concurrent Tasks
          </label>
          <input
            type="number"
            id="maxConcurrentTasks"
            name="maxConcurrentTasks"
            value={formValues.maxConcurrentTasks}
            onChange={handleChange}
            min={1}
            max={10}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Higher values may improve performance but could trigger rate limiting
          </p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fetching data...
            </>
          ) : (
            'Fetch Data'
          )}
        </button>
      </div>
    </form>
  );
}