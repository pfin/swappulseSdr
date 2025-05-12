"use client";

/**
 * Sidebar Component
 * 
 * Sidebar navigation for the DTCC SDR Analyzer.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  name: string;
  path: string;
  icon: JSX.Element;
}

export default function Sidebar() {
  const pathname = usePathname();
  
  const items: SidebarItem[] = [
    {
      name: 'RATES',
      path: '/trades/rates',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      name: 'CREDITS',
      path: '/trades/credits',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      name: 'EQUITIES',
      path: '/trades/equities',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      name: 'FOREX',
      path: '/trades/forex',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      name: 'COMMODITIES',
      path: '/trades/commodities',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )
    }
  ];
  
  const analyticsItems: SidebarItem[] = [
    {
      name: 'Trade Volume',
      path: '/analytics/volume',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      name: 'Product Analysis',
      path: '/analytics/products',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      name: 'Time Analysis',
      path: '/analytics/time',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];
  
  return (
    <div className="h-full py-6 px-3">
      <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
        Asset Classes
      </h3>
      <nav className="space-y-1 mb-8">
        {items.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              pathname.includes(item.path)
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            aria-current={pathname.includes(item.path) ? 'page' : undefined}
          >
            <div className={`mr-3 ${
              pathname.includes(item.path) ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'
            }`}>
              {item.icon}
            </div>
            {item.name}
          </Link>
        ))}
      </nav>
      
      <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
        Analytics
      </h3>
      <nav className="space-y-1">
        {analyticsItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              pathname.includes(item.path)
                ? 'bg-indigo-100 text-indigo-600'
                : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            aria-current={pathname.includes(item.path) ? 'page' : undefined}
          >
            <div className={`mr-3 ${
              pathname.includes(item.path) ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'
            }`}>
              {item.icon}
            </div>
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}