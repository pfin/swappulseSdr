/**
 * Large Trades Table Component
 * 
 * Displays a table of the largest trades by notional amount.
 */

import { DTCCTrade } from '@/types/dtcc';
import { format } from 'date-fns';

interface LargeTradesTableProps {
  largestTrades: DTCCTrade[];
}

export default function LargeTradesTable({ largestTrades }: LargeTradesTableProps) {
  if (!largestTrades || largestTrades.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center h-300">
        <p className="text-gray-500">No large trades data available</p>
      </div>
    );
  }
  
  // Format value for display
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
    
    return value;
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Largest Trades</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Execution Time
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Type
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notional
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Underlying
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {largestTrades.map((trade, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                  {formatValue('executionTimestamp', trade.executionTimestamp)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                  {formatValue('productType', trade.productType)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                  {formatValue('notionalLeg1', trade.notionalLeg1)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                  {formatValue('underlying', trade.underlying)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}