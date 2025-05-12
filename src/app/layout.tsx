/**
 * Root Layout
 * 
 * This is the root layout that wraps all pages.
 */

import { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'DTCC SDR Analyzer',
  description: 'Analyze swap trade data from the DTCC Swap Data Repository',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}