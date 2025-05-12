"use client";

/**
 * Layout Component
 * 
 * Main layout for the DTCC SDR Analyzer.
 */

import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function Layout({ children, showSidebar = true }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <div className="flex-grow flex">
        {showSidebar && (
          <div className="w-64 bg-gray-100 shadow-inner">
            <Sidebar />
          </div>
        )}
        
        <main className="flex-grow bg-gray-50 p-6">
          {children}
        </main>
      </div>
      
      <Footer />
    </div>
  );
}