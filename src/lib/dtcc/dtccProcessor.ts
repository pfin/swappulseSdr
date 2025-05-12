/**
 * DTCC SDR Data Processor
 * 
 * This service is responsible for processing and transforming raw DTCC data.
 */

import { 
  DTCCTrade, 
  DTCCAnalytics, 
  AssetClass, 
  TradeFilters 
} from '@/types/dtcc';
import { parse } from 'date-fns';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export class DTCCProcessor {
  /**
   * Process CSV data from DTCC
   */
  public processCSVData(data: Buffer, assetClass: AssetClass): DTCCTrade[] {
    const csvString = data.toString('utf8');
    const parsed = Papa.parse(csvString, { header: true });
    
    if (!parsed.data || parsed.data.length === 0) {
      return [];
    }
    
    return this.mapRawDataToTrades(parsed.data, assetClass);
  }
  
  /**
   * Process Excel data from DTCC
   */
  public processExcelData(data: Buffer, assetClass: AssetClass): DTCCTrade[] {
    const workbook = XLSX.read(data);
    const firstSheetName = workbook.SheetNames[0];
    
    if (!firstSheetName) {
      return [];
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    return this.mapRawDataToTrades(jsonData, assetClass);
  }
  
  /**
   * Map raw data to trade objects
   */
  private mapRawDataToTrades(rawData: any[], assetClass: AssetClass): DTCCTrade[] {
    return rawData.map(row => this.mapRowToTrade(row, assetClass))
      .filter(trade => trade !== null) as DTCCTrade[];
  }
  
  /**
   * Map a single row to a trade object
   */
  private mapRowToTrade(row: any, assetClass: AssetClass): DTCCTrade | null {
    try {
      // Fields mapping based on asset class
      const fieldMap = this.getFieldMapForAssetClass(assetClass);
      
      // Extract timestamps
      const eventTimestamp = this.parseTimestamp(row[fieldMap.eventTimestamp]);
      const executionTimestamp = this.parseTimestamp(row[fieldMap.executionTimestamp]);
      const effectiveDate = row[fieldMap.effectiveDate] ? 
        this.parseDate(row[fieldMap.effectiveDate]) : null;
      const expirationDate = row[fieldMap.expirationDate] ? 
        this.parseDate(row[fieldMap.expirationDate]) : null;
      
      // Create trade object
      const trade: DTCCTrade = {
        eventTimestamp,
        executionTimestamp,
        effectiveDate,
        expirationDate,
        notionalLeg1: row[fieldMap.notionalLeg1] || null,
        notionalLeg2: row[fieldMap.notionalLeg2] || null,
        spreadLeg1: row[fieldMap.spreadLeg1] || null,
        spreadLeg2: row[fieldMap.spreadLeg2] || null,
        strikePrice: row[fieldMap.strikePrice] || null,
        otherPaymentAmount: row[fieldMap.otherPaymentAmount] || null,
        actionType: row[fieldMap.actionType] || null,
        assetClass,
        productType: row[fieldMap.productType] || null,
        underlying: row[fieldMap.underlying] || null,
        rawData: row
      };
      
      return trade;
    } catch (error) {
      console.error('Error mapping row to trade:', error);
      return null;
    }
  }
  
  /**
   * Get field mapping for a specific asset class
   */
  private getFieldMapForAssetClass(assetClass: AssetClass): Record<string, string> {
    // These mappings would be specific to each asset class
    // based on the DTCC SDR data format
    const commonFields = {
      eventTimestamp: 'Dissemination Date and Time',
      executionTimestamp: 'Execution Date and Time',
      actionType: 'Action',
    };
    
    switch (assetClass) {
      case 'RATES':
        return {
          ...commonFields,
          effectiveDate: 'Effective Date',
          expirationDate: 'End Date',
          notionalLeg1: 'Notional Amount 1',
          notionalLeg2: 'Notional Amount 2',
          spreadLeg1: 'Fixed Rate 1',
          spreadLeg2: 'Floating Rate 1',
          otherPaymentAmount: 'Other Payment Amount',
          productType: 'Asset Class',
          underlying: 'Underlying Asset'
        };
      
      case 'CREDITS':
        return {
          ...commonFields,
          effectiveDate: 'Effective Date',
          expirationDate: 'Maturity Date',
          notionalLeg1: 'Notional Amount',
          spreadLeg1: 'Fixed Rate',
          productType: 'Contract Type',
          underlying: 'Reference Entity'
        };
      
      case 'EQUITIES':
        return {
          ...commonFields,
          effectiveDate: 'Effective Date',
          expirationDate: 'Maturity Date',
          notionalLeg1: 'Notional Amount',
          strikePrice: 'Strike Price',
          productType: 'Product',
          underlying: 'Underlying Asset'
        };
      
      case 'FOREX':
        return {
          ...commonFields,
          effectiveDate: 'Effective Date',
          expirationDate: 'Maturity Date',
          notionalLeg1: 'Notional Amount 1',
          notionalLeg2: 'Notional Amount 2',
          productType: 'Contract Type',
          underlying: 'Asset'
        };
      
      case 'COMMODITIES':
        return {
          ...commonFields,
          effectiveDate: 'Effective Date',
          expirationDate: 'Maturity Date',
          notionalLeg1: 'Notional Quantity',
          strikePrice: 'Strike Price',
          productType: 'Product Type',
          underlying: 'Underlying Asset'
        };
      
      default:
        return commonFields;
    }
  }
  
  /**
   * Parse timestamp from DTCC format
   */
  private parseTimestamp(timestamp: string): Date {
    if (!timestamp) {
      return new Date();
    }
    
    // DTCC timestamps can have different formats
    try {
      // Try "YYYY-MM-DD HH:MM:SS" format
      return parse(timestamp, 'yyyy-MM-dd HH:mm:ss', new Date());
    } catch (error) {
      try {
        // Try "MM/DD/YYYY HH:MM:SS AM/PM" format
        return parse(timestamp, 'MM/dd/yyyy hh:mm:ss a', new Date());
      } catch (error) {
        // Default to current date if parsing fails
        console.warn(`Failed to parse timestamp: ${timestamp}`);
        return new Date();
      }
    }
  }
  
  /**
   * Parse date from DTCC format
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) {
      return null;
    }
    
    try {
      // Try common date formats
      return parse(dateStr, 'yyyy-MM-dd', new Date());
    } catch (error) {
      try {
        return parse(dateStr, 'MM/dd/yyyy', new Date());
      } catch (error) {
        console.warn(`Failed to parse date: ${dateStr}`);
        return null;
      }
    }
  }
  
  /**
   * Filter trades based on criteria
   */
  public filterTrades(trades: DTCCTrade[], filters: TradeFilters): DTCCTrade[] {
    return trades.filter(trade => {
      // Filter by product type
      if (filters.productTypes && filters.productTypes.length > 0) {
        if (!trade.productType || !filters.productTypes.includes(trade.productType)) {
          return false;
        }
      }
      
      // Filter by notional
      if (filters.minNotional && trade.notionalLeg1) {
        const notional = parseFloat(trade.notionalLeg1);
        if (isNaN(notional) || notional < filters.minNotional) {
          return false;
        }
      }
      
      if (filters.maxNotional && trade.notionalLeg1) {
        const notional = parseFloat(trade.notionalLeg1);
        if (isNaN(notional) || notional > filters.maxNotional) {
          return false;
        }
      }
      
      // Filter by date range
      if (filters.startDate && trade.executionTimestamp) {
        if (trade.executionTimestamp < filters.startDate) {
          return false;
        }
      }
      
      if (filters.endDate && trade.executionTimestamp) {
        if (trade.executionTimestamp > filters.endDate) {
          return false;
        }
      }
      
      // Filter by asset class
      if (filters.assetClass && trade.assetClass !== filters.assetClass) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Generate analytics from trade data
   */
  public generateAnalytics(trades: DTCCTrade[]): DTCCAnalytics {
    const totalTrades = trades.length;
    const volumeByProduct: Record<string, number> = {};
    const tradeSizeDistribution: Record<string, number> = {};
    const timeDistribution: Record<string, number> = {};
    
    // Sort trades by notional amount to find largest trades
    const sortedTrades = [...trades].sort((a, b) => {
      const aNotional = a.notionalLeg1 ? parseFloat(a.notionalLeg1) : 0;
      const bNotional = b.notionalLeg1 ? parseFloat(b.notionalLeg1) : 0;
      return bNotional - aNotional;
    });
    
    // Calculate volume by product
    trades.forEach(trade => {
      if (trade.productType) {
        const notional = trade.notionalLeg1 ? parseFloat(trade.notionalLeg1) : 0;
        if (!isNaN(notional)) {
          volumeByProduct[trade.productType] = (volumeByProduct[trade.productType] || 0) + notional;
        }
      }
    });
    
    // Calculate trade size distribution
    trades.forEach(trade => {
      const notional = trade.notionalLeg1 ? parseFloat(trade.notionalLeg1) : 0;
      if (!isNaN(notional)) {
        let bucket = '0-1M';
        if (notional > 1000000 && notional <= 10000000) bucket = '1M-10M';
        else if (notional > 10000000 && notional <= 50000000) bucket = '10M-50M';
        else if (notional > 50000000 && notional <= 100000000) bucket = '50M-100M';
        else if (notional > 100000000) bucket = '100M+';
        
        tradeSizeDistribution[bucket] = (tradeSizeDistribution[bucket] || 0) + 1;
      }
    });
    
    // Calculate time distribution
    trades.forEach(trade => {
      if (trade.executionTimestamp) {
        const hour = trade.executionTimestamp.getHours();
        const bucket = `${hour}:00-${hour}:59`;
        timeDistribution[bucket] = (timeDistribution[bucket] || 0) + 1;
      }
    });
    
    // Get largest trades (top 10)
    const largestTrades = sortedTrades.slice(0, 10);
    
    return {
      totalTrades,
      volumeByProduct,
      tradeSizeDistribution,
      timeDistribution,
      largestTrades
    };
  }
}