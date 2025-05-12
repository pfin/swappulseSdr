/**
 * Trade Table Component
 * 
 * Displays DTCC trade data in a sortable, filterable table.
 */

import { useState, useMemo } from 'react';
import { DTCCTrade, AssetClass } from '@/types/dtcc';
import { format } from 'date-fns';

interface TradeTableProps {
  trades: DTCCTrade[];
  loading?: boolean;
}

interface SortConfig {
  key: keyof DTCCTrade | '';
  direction: 'asc' | 'desc';
}

export default function TradeTable({ trades, loading = false }: TradeTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'executionTimestamp', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Memoized sorted trades
  const sortedTrades = useMemo(() => {
    if (!sortConfig.key) return trades;
    
    return [...trades].sort((a, b) => {
      if (a[sortConfig.key] === null || a[sortConfig.key] === undefined) return 1;
      if (b[sortConfig.key] === null || b[sortConfig.key] === undefined) return -1;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }, [trades, sortConfig]);
  
  // Pagination
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedTrades.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedTrades, currentPage, rowsPerPage]);
  
  // Calculate total pages
  const totalPages = Math.ceil(trades.length / rowsPerPage);
  
  // Request sort
  const requestSort = (key: keyof DTCCTrade) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };
  
  // Get CSS classes for the sort button
  const getSortDirectionIcon = (key: keyof DTCCTrade) => {
    if (sortConfig.key !== key) {
      return '↕️';
    }
    
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };
  
  // Format trade values for display
  const formatValue = (key: keyof DTCCTrade, value: any) => {
    if (value === null || value === undefined) return '-';
    
    if (value instanceof Date) {
      return format(value, 'yyyy-MM-dd HH:mm:ss');
    }
    
    if (key === 'notionalLeg1' || key === 'notionalLeg2') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
      }
    }
    
    if (key === 'spreadLeg1' || key === 'spreadLeg2') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return `${num.toFixed(4)}%`;
      }
    }
    
    return value;
  };
  
  // Columns to display
  const columns: { key: keyof DTCCTrade; label: string }[] = [
    { key: 'executionTimestamp', label: 'Execution Time' },
    { key: 'effectiveDate', label: 'Effective Date' },
    { key: 'expirationDate', label: 'Expiration Date' },
    { key: 'notionalLeg1', label: 'Notional' },
    { key: 'productType', label: 'Product Type' },
    { key: 'underlying', label: 'Underlying' },
    { key: 'assetClass', label: 'Asset Class' },
    { key: 'spreadLeg1', label: 'Spread/Rate' }
  ];
  
  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-10 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    );
  }
  
  // Empty state
  if (trades.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-sm">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No trades found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Try selecting a different date range or asset class.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    <span className="text-gray-400">
                      {getSortDirectionIcon(column.key)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTrades.map((trade, index) => (
              <tr 
                key={index}
                className="hover:bg-gray-50"
              >
                {columns.map((column) => (
                  <td
                    key={`${index}-${column.key}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {formatValue(column.key, trade[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 sm:px-6 flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * rowsPerPage, sortedTrades.length)}
              </span>{' '}
              of <span className="font-medium">{sortedTrades.length}</span> results
            </p>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <label htmlFor="rows-per-page" className="text-sm text-gray-600">Rows per page:</label>
              <select
                id="rows-per-page"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px mt-2" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">First</span>
                ⟪
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                ←
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                let pageNum = currentPage;
                if (totalPages <= 5) {
                  pageNum = index + 1;
                } else if (currentPage <= 3) {
                  pageNum = index + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + index;
                } else {
                  pageNum = currentPage - 2 + index;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === pageNum
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                →
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Last</span>
                ⟫
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}