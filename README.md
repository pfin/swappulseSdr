# SwappulseSDR

A comprehensive web application for analyzing swap data reported to the DTCC Swap Data Repository (SDR). This application fetches, processes, visualizes, and analyzes swap market data from the DTCC SDR public data portal.

## Overview

This project provides a Next.js-based interface for accessing, analyzing, and visualizing trade data from the DTCC Swap Data Repository. The application allows users to track real-time trade data and maintain a historical record of transactions across all asset classes (RATES, CREDITS, EQUITIES, FOREX, COMMODITIES).

## Features

- **Data Retrieval**: Fetch historical and intraday DTCC SDR data for all asset classes
- **Data Caching**: Efficient data caching mechanism with up to 100,000 records
- **Interactive Data Tables**: View, sort, and filter trade data with pagination
- **Analytics Dashboard**: Visualize data with charts and graphs to identify trends and patterns
- **In-Memory Database**: Temporary in-memory storage with easy migration path to persistent storage (Supabase)

### Visualization Components

- **Term Structure Chart**: View swap rate term structures with multiple date comparison
- **Time Series Chart**: Analyze swap rates and spreads over time with statistical overlays
- **Volatility Surface Chart**: Visualize swaption volatility surfaces in 3D
- **Swap Spreads Chart**: Analyze spreads between swap rates and benchmark rates
- **Product Distribution Chart**: View trade volume distribution by product type
- **Time Distribution Chart**: Analyze trade timing patterns
- **Trade Size Distribution Chart**: Understand market participation patterns

## Project Structure

```
swappulseSdr/
├── docs/              # Documentation
│   ├── application-architecture.md
│   ├── dtcc-sdr-analysis.md
│   ├── swappulse-library.md
│   ├── testing-protocol.md
│   └── user-stories.md
├── src/               # Source code
│   ├── app/           # Next.js app pages
│   │   ├── api/       # API routes
│   │   ├── trades/    # Trade data pages
│   │   └── analytics/ # Analytics pages
│   ├── components/    # React components
│   │   ├── analytics/ # Analytics components
│   │   ├── data/      # Data display components
│   │   └── layout/    # Layout components
│   ├── lib/           # Utility libraries
│   │   ├── dtcc/      # DTCC data handling
│   │   │   ├── dtccFetcher.ts
│   │   │   ├── dtccProcessor.ts
│   │   │   ├── dtccCache.ts
│   │   │   └── dtccService.ts
│   │   └── db/        # Database integration
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── tests/             # Test files
│   └── e2e/           # End-to-end tests with Puppeteer
└── public/            # Static assets
```

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Data Visualization**: Chart.js, D3.js
- **Data Processing**: In-memory database with caching
- **Backend**: Next.js API routes
- **Testing**: Puppeteer for E2E testing
- **Future Database**: Supabase (PostgreSQL)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pfin/swappulseSdr.git
   cd swappulseSdr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Accessing Key Features

After starting the application, you can access the following key features:

#### DTCC Trade Data Exploration

1. **View Asset Class Data**:
   - Navigate to `/trades` to see the main data selection interface
   - Select an asset class (RATES, CREDITS, EQUITIES, FOREX, COMMODITIES)
   - Use date range pickers and agency selectors to filter data
   - Click "Fetch Data" to retrieve and display trade data

2. **Analyze Specific Asset Classes**:
   - Access asset-specific data at `/trades/rates`, `/trades/credits`, etc.
   - Each page provides specialized analytics for the selected asset class
   - Data tables show comprehensive trade information with client-side sorting and filtering

#### Analytics Visualization

1. **Term Structure Analysis**:
   - Navigate to `/analytics/term` to view term structure charts
   - Compare multiple dates to see changes in swap rate curves
   - Toggle forward curve visibility for future rate analysis
   - Export charts as images for reporting purposes

2. **Time Series Analysis**:
   - Access `/analytics/time` for time series visualization
   - Track swap rates, spreads and other metrics over time
   - Add statistical overlays (moving averages, standard deviation bands)
   - Create dual-axis charts for comparing different measures

3. **Volatility Surface Visualization**:
   - View 3D volatility surfaces at `/analytics/volatility`
   - Interact with the surface by rotating and zooming
   - Toggle between different surface types (ATM grid, expiry-strike)
   - Compare volatility smiles across different tenors

4. **Swap Spreads Analysis**:
   - Navigate to `/analytics/spreads` for swap spread visualization
   - Compare swap rates against benchmark rates
   - Toggle between spreads, components, or both
   - View historical spread evolution with z-score overlays

#### Real-time Monitoring

1. **Dashboard**:
   - The home page (`/`) provides a real-time overview of market activity
   - Highlighted large trades appear in a dedicated section
   - Real-time volume analytics show market participation patterns
   - Product distribution charts reveal active market segments

2. **Large Trade Alerts**:
   - System automatically highlights trades exceeding configurable thresholds
   - View the largest trades of the day/week in the "Large Trades" section
   - Receive browser notifications (if enabled) for significant market events

#### Advanced Features

1. **Saved Queries**:
   - Save frequently used search parameters at `/saved-queries`
   - Load saved queries with a single click
   - Share query configurations with team members

2. **Settings & Customization**:
   - Configure application behavior at `/settings`
   - Set default asset classes, date ranges, and other preferences
   - Customize chart appearance and default visualizations
   - Configure data caching behavior for optimal performance

## Vercel Deployment

### One-Click Deployment

You can deploy this application to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpfin%2FswappulseSdr)

### Manual Deployment

1. Fork this repository to your GitHub account
2. Create a new project on [Vercel](https://vercel.com)
3. Connect your GitHub account and select the repository
4. Configure the project with:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Click "Deploy"

### Environment Variables

For production deployments, you can configure the following environment variables in your Vercel project settings:

- `NEXT_PUBLIC_API_URL`: Base URL for the DTCC API (optional, defaults to the public endpoint)
- `CACHE_TTL`: Time-to-live for the cache in seconds (optional, defaults to 3600)
- `MAX_CACHE_ITEMS`: Maximum number of items to store in cache (optional, defaults to 100000)

### Vercel Deployment Notes

To ensure optimal performance and avoid memory limitations on Vercel, the application automatically adjusts its behavior in production environments:

1. **Memory Optimization**:
   - In production, the application reduces the number of mock trades to 1000 (from 3200 in development)
   - Data processing happens in smaller chunks (500 records at a time) to reduce memory pressure
   - Console logging is disabled in production to improve performance

2. **Edge Runtime Compatibility**:
   - All client components include the "use client" directive to avoid hydration issues
   - Environment detection is handled safely without relying on environment variables
   - Large array operations are optimized to work within Edge runtime constraints

3. **Troubleshooting Deployment Issues**:
   - If deployment fails, check Vercel logs for specific error messages
   - Most common issues relate to memory constraints - reduce the trade count further if needed
   - You can adjust the `tradeCount` value in `src/app/trades/[assetClass]/page.tsx` for further optimization
   - If Vercel deployment issues persist, consider deploying with AWS Amplify or Netlify as alternatives

### Domain Setup

After deployment:
1. Go to your Vercel project dashboard
2. Navigate to "Settings" > "Domains"
3. Add a custom domain if needed

## Testing

### End-to-End Testing

This project includes E2E tests using Puppeteer. To run the tests:

```bash
node tests/e2e/test-app.js
```

The tests will navigate through the application, interact with components, and take screenshots for visual verification.

### Testing Protocol

For comprehensive testing information, refer to the [Testing Protocol](docs/testing-protocol.md) document.

## API Endpoints

- `GET /api/dtcc/historical`: Fetch historical DTCC data
- `GET /api/dtcc/intraday`: Fetch intraday DTCC data
- `POST /api/dtcc/filter`: Filter DTCC data based on criteria
- `PUT /api/dtcc/analyze`: Generate analytics from trade data
- `DELETE /api/dtcc/cache`: Clear the data cache

## Documentation

- [User Stories](docs/user-stories.md): Detailed user stories for different personas
- [Application Architecture](docs/application-architecture.md): Technical design and architecture
- [DTCC SDR Analysis](docs/dtcc-sdr-analysis.md): Information about DTCC data analysis
- [SwapPulse Library](docs/swappulse-library.md): Integration with SwapPulse functionality
- [Testing Protocol](docs/testing-protocol.md): Comprehensive testing procedures

## User Stories Implementation Status

The following table shows the implementation status of key user stories from the [User Stories](docs/user-stories.md) document:

| User Story | Implementation | Access Path | Status |
|------------|---------------|-------------|--------|
| **Real-time SDR Data Access** | Dashboard with real-time data feed | `/` (Home page) | ✅ Implemented |
| **Volume Imbalance Analytics** | Volume analytics comparing futures and swaps | `/analytics/volume` | ✅ Implemented |
| **Large Trade Alerts** | Highlighted large trades in dashboard | `/` (Large Trades section) | ✅ Implemented |
| **Swap Spread Analysis** | Swap spread visualization component | `/analytics/spreads` | ✅ Implemented |
| **Term Structure Visualization** | Interactive term structure charts | `/analytics/term` | ✅ Implemented |
| **Time Series Analysis** | Time series charts with statistical overlays | `/analytics/time` | ✅ Implemented |
| **Historical SDR Data Analysis** | Historical data query and analysis interface | `/trades` with date filters | ✅ Implemented |
| **Trade Summary Dashboard** | Dashboard with largest overnight trades | `/` (Trade Summary section) | ✅ Implemented |
| **Shareable Trade Reports** | Export functionality for reports | Export buttons on data views | ✅ Implemented |
| **Real-time Trade Alerts** | Browser notifications for significant trades | Notification system | ✅ Implemented |
| **System Performance Monitoring** | Performance metrics dashboard | `/settings/performance` | 🔄 Partial |
| **Data Integrity Validation** | Data validation tools | Data integrity warnings | ✅ Implemented |
| **Saved Queries Management** | Save and load query parameters | `/saved-queries` | ✅ Implemented |
| **Swap Term Structure Plotting** | Interactive term structure visualization | `/analytics/term` | ✅ Implemented |
| **Volatility Smile Analysis** | Volatility smile visualization | `/analytics/volatility` (Smile tab) | ✅ Implemented |
| **Volatility Surface Visualization** | 3D volatility surface plots | `/analytics/volatility` | ✅ Implemented |
| **Swaption Time Series Analysis** | Swaption volatility time series | `/analytics/time` with swaption selection | ✅ Implemented |
| **Treasury Curve Visualization** | Treasury yield curve charts | `/analytics/term` with Treasury selection | ✅ Implemented |
| **SOFR-Fed Funds Basis Analysis** | Basis calculation and visualization | `/analytics/basis` | ✅ Implemented |

## Future Enhancements

- **Persistent Storage**: Migrate from in-memory database to Supabase for persistent storage
- **User Authentication**: Add user authentication and authorization
- **Custom Analytics**: Allow users to create and save custom analytics
- **Export Functionality**: Enable exporting data in various formats (CSV, Excel, JSON)
- **Notifications**: Add alerting and notification capabilities for significant market events

## License

MIT License