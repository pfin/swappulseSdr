# SwapPulse Library Documentation

This document provides an overview of the SwapPulse library, which serves as a reference and foundation for our DTCC SDR Analyzer application.

## Library Overview

SwapPulse is a comprehensive Python library for analyzing interest rate derivatives and fixed income products. The library is organized into various modules that handle data fetching, analytics, visualization, and product-specific functionality.

## Key Components

### Fetchers

The fetchers module contains classes for retrieving data from various sources:

- **DTCCFetcher.py**: Retrieves swap data repository (SDR) information from DTCC
- **BaseFetcher.py**: Base class with common functionality for all fetchers
- **CMEFetcher.py/CMEFetcherV2.py**: Gets data from Chicago Mercantile Exchange
- **AnnaDSBFetcher.py**: Works with ANNA DSB (Derivatives Service Bureau) data
- **BarchartFetcher.py**: Accesses Barchart market data
- **FedInvest.py**: Handles US Treasury securities data
- **TreasuryDirectFetcher.py**: Retrieves Treasury Direct data
- **WSJFetcher.py**: Gets data from Wall Street Journal

### Analytics

Modules for analyzing fixed income and derivatives data:

- **SDR**: Contains tools specific to Swap Data Repository analytics
  - **Formatters/swaps.py**: Formats swap trade data
  - **Formatters/swaptions.py**: Formats swaption trade data
  - **SDRDBBuilder.py**: Builds and manages SDR databases
  - **SwaptionAnalytics.py**: Analyzes swaption data

- **Interpolation**: Various curve interpolation algorithms
- **HedgeHog**: Portfolio and position management tools
- **SwapRV**: Swap relative value analytics
- **Spectral**: Advanced statistical analysis tools

### Products

Provides product-specific functionality:

- **Swaps.py**: Functions for working with interest rate swaps
- **Swaptions.py**: Tools for swaption analysis
- **Cash.py**: Handles cash products like Treasury securities
- **SwapSpreads.py**: Analyzes swap spread products
- **CurveBuilding**: Tools for constructing yield curves

### Database Tools

- **update_sdr.py**: Updates local databases with SDR data
- **update_cme_usd_ois_curve.py**: Updates CME USD OIS curve data

### Utilities

- **dtcc_sdr_utils.py**: Utility functions for working with DTCC SDR data
- **anna_dsb_upi_utils.py**: Utilities for ANNA DSB UPI data

## DTCC SDR Integration

### Key Files for SDR Integration

1. **DTCCFetcher.py**: 
   - Core component for fetching DTCC SDR data
   - Handles authentication, rate limiting, and retry logic
   - Manages HTTP requests to DTCC API endpoints

2. **dtcc_sdr_utils.py**:
   - Provides utility functions for parsing and processing SDR data
   - Includes data transformation and normalization functions
   - Contains helpers for working with SDR identifiers

3. **SDRDBBuilder.py**:
   - Creates database schema for storing SDR data
   - Handles database updates and migrations
   - Manages data versioning and consistency

4. **Formatters/swaps.py**:
   - Formats swap data into standardized structures
   - Normalizes different swap types for consistent analysis
   - Extracts key fields for analytics

## Database Structure

SwapPulse uses PostgreSQL for data storage. The main SDR-related tables include:

- `dtcc_sdr_raw`: Raw data from DTCC SDR
- `dtcc_sdr_processed`: Cleaned and processed SDR records
- `dtcc_sdr_analytics`: Pre-computed analytics for faster retrieval

## Data Flow Process

1. **Data Acquisition**: DTCCFetcher retrieves data from DTCC SDR API
2. **Validation & Cleaning**: Data is validated and cleaned using utilities
3. **Storage**: Processed data is stored in PostgreSQL database
4. **Analysis**: Analytics modules process and analyze the data
5. **Visualization**: Products modules provide visualization capabilities

## Challenges and Solutions

### Connection and Timeout Handling
- SwapPulse implements exponential backoff for API requests
- Configurable timeouts to handle slow connections
- Session management to maintain efficient connections

### Proxy Server Configuration
- Support for various proxy server configurations
- Authentication handling for proxied connections
- Flexible network configuration options

### Rate Limiting
- Implements rate limiting compliance for API services
- Queuing mechanisms to manage request rates
- Bulk request batching when appropriate

## Lessons for DTCC SDR Analyzer

1. **Modular Design**: Adopt SwapPulse's modular approach for maintainability
2. **Consistent Error Handling**: Implement robust error handling throughout
3. **Efficient Data Storage**: Use appropriate caching and storage strategies
4. **Flexible Configuration**: Allow customization of data sources and parameters
5. **Comprehensive Testing**: Ensure thorough testing of all components