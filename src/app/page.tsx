"use client";

/**
 * Dashboard Page
 *
 * Main dashboard page for the DTCC SDR Analyzer.
 */

import Layout from '@/components/layout/Layout';
import Link from 'next/link';

export default function Home() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DTCC SDR Analyzer Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Welcome to the DTCC SDR Analyzer. Analyze swap trade data from the DTCC Swap Data Repository.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Feature Cards */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-lg font-medium text-indigo-700">Trade Data</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 mb-4">
                Search and explore swap trade data from the DTCC SDR. View trade details, filter by criteria, and export results.
              </p>
              <Link href="/trades" className="text-indigo-600 hover:text-indigo-900 font-medium">
                Explore Trade Data &rarr;
              </Link>
            </div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-lg font-medium text-indigo-700">Analytics</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 mb-4">
                Visualize trade data with interactive charts and graphs. Analyze trends, distributions, and key metrics.
              </p>
              <Link href="/analytics" className="text-indigo-600 hover:text-indigo-900 font-medium">
                View Analytics &rarr;
              </Link>
            </div>
          </div>
          
          <div className="bg-white shadow-sm rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-6 py-5 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-lg font-medium text-indigo-700">Saved Queries</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 mb-4">
                Save and manage your frequently used data queries. Quickly access your favorite views and filters.
              </p>
              <Link href="/saved-queries" className="text-indigo-600 hover:text-indigo-900 font-medium">
                Manage Saved Queries &rarr;
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Asset Classes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link 
              href="/trades/rates" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">RATES</span>
            </Link>
            
            <Link 
              href="/trades/credits" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">CREDITS</span>
            </Link>
            
            <Link 
              href="/trades/equities" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">EQUITIES</span>
            </Link>
            
            <Link 
              href="/trades/forex" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">FOREX</span>
            </Link>
            
            <Link 
              href="/trades/commodities" 
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg 
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span className="mt-2 font-medium text-gray-900">COMMODITIES</span>
            </Link>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            About DTCC SDR Analyzer
          </h2>
          <p className="text-gray-700 mb-4">
            The DTCC SDR Analyzer is a comprehensive tool for analyzing swap data reported to the DTCC Swap Data Repository (SDR).
            It provides powerful data retrieval, visualization, and analysis capabilities to help users gain insights into the swap markets.
          </p>
          <p className="text-gray-700">
            The application fetches data directly from the DTCC SDR public data portal, processes it, and provides a user-friendly interface
            for exploring and analyzing the data. Users can filter the data by various criteria, visualize trends and patterns, and save
            their queries for future use.
          </p>
        </div>
      </div>
    </Layout>
  );
}