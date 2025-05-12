'use client';

/**
 * Saved Queries Page
 * 
 * Allows users to manage saved queries for quick access.
 */

import { useState } from 'react';
import Layout from '@/components/layout/Layout';

interface SavedQuery {
  id: number;
  name: string;
  description: string;
  agency: string;
  assetClass: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

export default function SavedQueriesPage() {
  // Mock saved queries for demonstration
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([
    {
      id: 1,
      name: 'CFTC RATES Last Week',
      description: 'Standard weekly RATES monitoring query',
      agency: 'CFTC',
      assetClass: 'RATES',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 2,
      name: 'Monthly FOREX Report',
      description: 'Monthly FOREX activity snapshot',
      agency: 'CFTC',
      assetClass: 'FOREX',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    },
    {
      id: 3,
      name: 'CREDITS Q2 Analysis',
      description: 'Quarterly CREDITS market analysis',
      agency: 'SEC',
      assetClass: 'CREDITS',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  ]);
  
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  
  const handleDeleteQuery = (id: number) => {
    setIsDeleting(id);
    
    // Simulate deletion with timeout
    setTimeout(() => {
      setSavedQueries(savedQueries.filter(query => query.id !== id));
      setIsDeleting(null);
    }, 500);
  };
  
  const handleRunQuery = (id: number) => {
    // In a real implementation, this would redirect to the trades page with the query parameters
    console.log(`Running query: ${id}`);
  };
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Saved Queries</h1>
          <p className="mt-2 text-gray-600">
            Manage your saved search queries for quick access to frequently used data views.
          </p>
        </div>
        
        {savedQueries.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-center h-64">
            <svg
              className="w-16 h-16 text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">No saved queries</h3>
            <p className="mt-1 text-sm text-gray-500">
              Save your search queries to quickly access them in the future.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Range
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {savedQueries.map((query) => (
                  <tr key={query.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{query.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{query.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {query.agency} / {query.assetClass}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {query.startDate.toLocaleDateString()} to {query.endDate.toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {query.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRunQuery(query.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Run
                      </button>
                      <button
                        onClick={() => handleDeleteQuery(query.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={isDeleting === query.id}
                      >
                        {isDeleting === query.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}