# DTCC SDR Analyzer - Application Architecture

This document outlines the architecture for the DTCC SDR Analyzer application, a Next.js-based web application for analyzing DTCC Swap Data Repository trade data.

## Architecture Overview

The application follows a modern Next.js architecture with server components, API routes, and client-side components for visualization. The design focuses on performance, scalability, and separation of concerns.

```
┌───────────────────────────────────────────────────────┐
│                        Client                         │
│ ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐ │
│ │   Charts    │ │ Data Tables │ │ Alert Components │ │
│ └─────────────┘ └─────────────┘ └──────────────────┘ │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│                     Next.js                           │
│ ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐ │
│ │ API Routes  │ │  Server     │ │   Data Cache     │ │
│ │             │ │ Components  │ │                  │ │
│ └─────────────┘ └─────────────┘ └──────────────────┘ │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│                    Services                           │
│ ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐ │
│ │ DTCC Data   │ │ Data        │ │ Analytics        │ │
│ │ Fetcher     │ │ Processor   │ │ Service          │ │
│ └─────────────┘ └─────────────┘ └──────────────────┘ │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│                    Storage                            │
│ ┌─────────────┐ ┌─────────────┐                      │
│ │ PostgreSQL  │ │ Memory      │                      │
│ │ Database    │ │ Cache       │                      │
│ └─────────────┘ └─────────────┘                      │
└───────────────────────────────────────────────────────┘
```

## Technology Stack

- **Frontend**: React, Next.js, TailwindCSS, Recharts/D3.js
- **Backend**: Next.js API routes, Server Components
- **Database**: PostgreSQL
- **Caching**: Server memory cache, optionally Redis
- **API Integration**: Custom DTCC SDR API client
- **Deployment**: Docker, potentially Vercel

## Application Components

### 1. Core Framework

- **Next.js App Router**: For page routing and layout management
- **API Routes**: For data fetching and processing endpoints
- **Authentication**: Optional auth layer for enterprise features

### 2. Data Layer

#### 2.1 DTCC Data Service (`/src/lib/dtcc`)

- `dtccFetcher.ts`: Port of SwapPulse's DTCCFetcher for TypeScript
- `dtccProcessor.ts`: Data processing and transformation
- `dtccTypes.ts`: TypeScript interfaces for DTCC data
- `dtccCache.ts`: Caching mechanisms for DTCC data

#### 2.2 Database Service (`/src/lib/db`)

- `postgresClient.ts`: PostgreSQL client for data storage
- `migrations/`: Database schema and migrations
- `repositories/`: Data access objects
- `models/`: Database models

#### 2.3 Analytics Service (`/src/lib/analytics`)

- `volumeAnalytics.ts`: Trade volume analysis functions
- `marketAnalytics.ts`: Market structure analysis
- `tradeAnalytics.ts`: Individual trade analysis
- `timeSeriesAnalytics.ts`: Time-series analysis utilities

### 3. API Layer

#### 3.1 DTCC API (`/src/app/api/dtcc`)

- `route.ts`: Main SDR data endpoint
- `historical/route.ts`: Historical data endpoint
- `realtime/route.ts`: Real-time data endpoint
- `analytics/route.ts`: Analytics endpoints

#### 3.2 Management API (`/src/app/api/admin`)

- `status/route.ts`: System status endpoint
- `settings/route.ts`: Application settings endpoint

### 4. Frontend Components

#### 4.1 Layout Components (`/src/components/layout`)

- `DashboardLayout.tsx`: Main application layout
- `Sidebar.tsx`: Navigation sidebar
- `Header.tsx`: Application header
- `Footer.tsx`: Application footer

#### 4.2 Data Display Components (`/src/components/data`)

- `TradeTable.tsx`: Interactive trade data table
- `TradeDetails.tsx`: Detailed view of a single trade
- `VolumeChart.tsx`: Trade volume visualization
- `TimeSeriesChart.tsx`: Time-series data visualization

#### 4.3 Analytics Components (`/src/components/analytics`)

- `MarketStructure.tsx`: Market structure visualization
- `VolumeAnalysis.tsx`: Volume analysis dashboard
- `TradeFlow.tsx`: Trade flow visualization
- `AlertPanel.tsx`: Real-time alerts display

### 5. Utility Layer

#### 5.1 Common Utilities (`/src/utils`)

- `dates.ts`: Date manipulation utilities
- `formatting.ts`: Data formatting utilities
- `validation.ts`: Input validation utilities
- `fetching.ts`: Advanced data fetching utilities

#### 5.2 Hooks (`/src/hooks`)

- `useTradeData.ts`: Hook for accessing trade data
- `useAnalytics.ts`: Hook for analytics functionality
- `useRealtime.ts`: Hook for real-time updates
- `useCache.ts`: Hook for managing cached data

## Data Flow

1. **Data Acquisition**:
   - Scheduled tasks fetch data from DTCC SDR API
   - API routes expose endpoints for client-side requests
   - Real-time updates via polling or WebSockets

2. **Data Processing**:
   - Raw data is transformed and normalized
   - Analytics are computed on the data
   - Processed data is stored in the database

3. **Data Access**:
   - Client components request data via API routes
   - Server components access data directly
   - Cached data is used when appropriate

4. **Data Visualization**:
   - Client components render data visualizations
   - Updates are pushed to the client as needed
   - Interactive elements allow data exploration

## Database Schema

### Trade Table

```sql
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    event_timestamp TIMESTAMP WITH TIME ZONE,
    execution_timestamp TIMESTAMP WITH TIME ZONE,
    effective_date DATE,
    expiration_date DATE,
    notional_leg1 NUMERIC,
    notional_leg2 NUMERIC,
    spread_leg1 VARCHAR(50),
    spread_leg2 VARCHAR(50),
    strike_price VARCHAR(50),
    asset_class VARCHAR(50),
    product_type VARCHAR(100),
    action_type VARCHAR(50),
    -- Additional fields as required
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_trades_event_timestamp ON trades(event_timestamp);
CREATE INDEX idx_trades_execution_timestamp ON trades(execution_timestamp);
CREATE INDEX idx_trades_product_type ON trades(product_type);
```

### Analytics Table

```sql
CREATE TABLE analytics (
    id SERIAL PRIMARY KEY,
    date DATE,
    metric_type VARCHAR(50),
    metric_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analytics_date ON analytics(date);
CREATE INDEX idx_analytics_metric_type ON analytics(metric_type);
```

## API Endpoints

### Data Endpoints

- `GET /api/dtcc/trades`: Get a paginated list of trades
- `GET /api/dtcc/trades/:id`: Get details of a specific trade
- `GET /api/dtcc/historical`: Get historical trade data
- `GET /api/dtcc/realtime`: Get real-time trade updates

### Analytics Endpoints

- `GET /api/analytics/volume`: Get volume analysis
- `GET /api/analytics/market`: Get market structure analysis
- `GET /api/analytics/timerange`: Get time-range specific analysis

### Admin Endpoints

- `GET /api/admin/status`: Get system status
- `POST /api/admin/settings`: Update application settings

## Deployment Architecture

The application can be deployed in various ways depending on requirements:

### Option 1: Vercel Deployment

- Next.js application hosted on Vercel
- Database hosted on a managed PostgreSQL provider
- Scheduled tasks via Vercel Cron Jobs

### Option 2: Docker Deployment

- Next.js application containerized with Docker
- Database containerized or connected to external PostgreSQL
- Docker Compose for local development
- Kubernetes for production deployment

### Option 3: Hybrid Approach

- Next.js frontend hosted on Vercel
- Backend services deployed separately
- Database hosted on a managed service

## Performance Optimizations

1. **Data Fetching**:
   - Incremental Static Regeneration (ISR) for static content
   - Server-side rendering for dynamic content
   - Client-side fetching for real-time updates

2. **Caching**:
   - API response caching
   - Database query caching
   - Client-side caching of static assets

3. **Database**:
   - Proper indexing for frequently queried fields
   - Materialized views for common analytics
   - Connection pooling for efficient database usage

## Security Considerations

1. **API Security**:
   - Rate limiting to prevent abuse
   - Input validation for all endpoints
   - Sanitization of all user inputs

2. **Data Security**:
   - Secure connection to DTCC API
   - Encrypted database connections
   - No sensitive data stored in client-side code

3. **Authentication & Authorization**:
   - JWT-based authentication for API endpoints
   - Role-based access control for admin functionality
   - Secure storage of credentials

## Next Steps

1. **Project Initialization**:
   - Set up Next.js project with TypeScript
   - Configure TailwindCSS and other dependencies
   - Set up linting and formatting

2. **Core Infrastructure**:
   - Implement database connection
   - Create DTCC fetcher service
   - Set up basic API routes

3. **Data Processing**:
   - Implement data transformation
   - Set up analytics computation
   - Create caching mechanisms

4. **Frontend Development**:
   - Develop core UI components
   - Implement data visualization
   - Create interactive features