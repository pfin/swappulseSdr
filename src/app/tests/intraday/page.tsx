'use client';

/**
 * Intraday Tests Page
 * 
 * This page provides a UI for running intraday data aggregation tests
 * to verify that the batch-based accumulation works correctly.
 */

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { IntradayTests } from '../../../../tests/intradayTests';

export default function IntradayTestsPage() {
  const [testResults, setTestResults] = useState<{
    success?: boolean;
    message?: string;
    logs: string[];
  }>({
    logs: []
  });
  
  const [isRunning, setIsRunning] = useState(false);
  
  // Capture console.log for display in the UI
  const runTests = async () => {
    setIsRunning(true);
    setTestResults({ logs: [] });
    
    // Override console.log to capture output
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];
    
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      logs.push(message);
      originalLog(...args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      logs.push(`ERROR: ${message}`);
      originalError(...args);
    };
    
    try {
      // Run all tests
      const result = await IntradayTests.runAllTests();
      
      setTestResults({
        success: result.success,
        message: result.message,
        logs
      });
    } catch (error) {
      setTestResults({
        success: false,
        message: `Unexpected error: ${(error as Error).message}`,
        logs
      });
    } finally {
      // Restore console.log
      console.log = originalLog;
      console.error = originalError;
      setIsRunning(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Intraday Data Tests</h1>
          <p className="mt-2 text-gray-600">
            Run tests to validate intraday data aggregation and batch processing.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Test Suite</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-700">
              These tests validate that the intraday batch aggregation logic works correctly.
              They simulate receiving multiple batches of data and ensure that:
            </p>
            <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
              <li>Batches are properly accumulated</li>
              <li>The last known batch ID is correctly tracked</li>
              <li>Trade deduplication works correctly</li>
              <li>Incremental updates don't cause data corruption</li>
            </ul>
          </div>
          
          <button
            onClick={runTests}
            disabled={isRunning}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run Intraday Tests'}
          </button>
        </div>
        
        {testResults.logs.length > 0 && (
          <div className="bg-gray-800 text-white p-4 rounded-lg overflow-auto max-h-96">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-medium">Test Results:</h3>
              {testResults.success !== undefined && (
                <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                  testResults.success ? 'bg-green-700' : 'bg-red-700'
                }`}>
                  {testResults.success ? 'PASSED' : 'FAILED'}
                </span>
              )}
            </div>
            
            {testResults.message && (
              <div className={`mb-4 p-2 text-sm rounded ${
                testResults.success ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'
              }`}>
                {testResults.message}
              </div>
            )}
            
            <div className="text-sm font-mono whitespace-pre-wrap">
              {testResults.logs.map((log, index) => (
                <div 
                  key={index}
                  className={`py-1 ${
                    log.startsWith('ERROR') 
                      ? 'text-red-300' 
                      : log.includes('✅') 
                        ? 'text-green-300'
                        : log.includes('❌')
                          ? 'text-red-300'
                          : 'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}