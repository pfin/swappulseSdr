# DTCC SDR Analyzer

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
dtcc-sdr-analyzer/
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
   git clone https://github.com/your-username/dtcc-sdr-analyzer.git
   cd dtcc-sdr-analyzer
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

## Future Enhancements

- **Persistent Storage**: Migrate from in-memory database to Supabase for persistent storage
- **User Authentication**: Add user authentication and authorization
- **Custom Analytics**: Allow users to create and save custom analytics
- **Export Functionality**: Enable exporting data in various formats (CSV, Excel, JSON)
- **Notifications**: Add alerting and notification capabilities for significant market events

## License

MIT License