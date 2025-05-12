/**
 * DTCC SDR Data Fetcher
 * 
 * This service is responsible for fetching data from the DTCC SDR API.
 * It is a TypeScript adaptation of the DTCCFetcher class from SwapPulse.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { 
  Agency, 
  AssetClass, 
  DTCCTrade, 
  DTCCError, 
  DTCCFetchParams,
  DTCCIntraDayParams,
  DTCCHeaders
} from '@/types/dtcc';
import { addBusinessDays, format, isBefore, isEqual, parseISO, isSameDay } from 'date-fns';
import { getBusinessDatesInRange } from '@/utils/dates';
import JSZip from 'jszip';

// Constants
const DTCC_BASE_URL = 'https://pddata.dtcc.com/ppd';
const MAX_RETRIES = 5;
const BACKOFF_FACTOR = 1;

export class DTCCFetcher {
  private axiosInstance: AxiosInstance;
  private cacheEnabled: boolean;
  
  constructor(options: { cacheEnabled?: boolean, timeout?: number } = {}) {
    const { cacheEnabled = true, timeout = 30000 } = options;
    
    this.cacheEnabled = cacheEnabled;
    this.axiosInstance = axios.create({
      timeout,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      }
    });
  }
  
  /**
   * Fetch historical reports from DTCC
   */
  public async fetchHistoricalReports(params: DTCCFetchParams): Promise<DTCCTrade[]> {
    const { 
      agency, 
      assetClass, 
      startDate, 
      endDate, 
      maxConcurrentTasks = 5,
      parallelize = true
    } = params;
    
    // Get business dates in range
    const businessDates = getBusinessDatesInRange(startDate, endDate);
    
    // Create date strings for DTCC API
    const dateStrings = businessDates.map(date => 
      format(date, 'yyyy_MM_dd')
    );
    
    // Check cache if enabled
    if (this.cacheEnabled) {
      // Here would be cache implementation
      // For now, just proceed with fetching
    }
    
    // Fetch data for each date in parallel or serially
    const allResults: DTCCTrade[] = [];
    
    if (parallelize) {
      // Parallel fetching with concurrency control
      const chunks = this.chunkArray(dateStrings, maxConcurrentTasks);
      
      for (const chunk of chunks) {
        const promises = chunk.map(dateString => 
          this.fetchDTCCData(agency, assetClass, dateString)
        );
        
        const results = await Promise.all(promises);
        for (const result of results) {
          if (result && result.length > 0) {
            allResults.push(...result);
          }
        }
      }
    } else {
      // Serial fetching
      for (const dateString of dateStrings) {
        const result = await this.fetchDTCCData(agency, assetClass, dateString);
        if (result && result.length > 0) {
          allResults.push(...result);
        }
      }
    }
    
    return allResults;
  }
  
  /**
   * Fetch intraday reports from DTCC
   * 
   * Note: DTCC intraday data identifiers are sequential numbers starting from 1
   * and incrementing throughout the day. They don't refer to timestamps but rather
   * to batch sequence numbers.
   */
  public async fetchIntradayReports(params: DTCCIntraDayParams): Promise<DTCCTrade[]> {
    const { 
      agency, 
      assetClass,
      maxSlices = 10 // Default to fetching up to 10 most recent intraday slices
    } = params;
    
    // Fetch intraday slice IDs without timestamp filtering
    const sliceIds = await this.getDTCCIntradaySliceIds(agency, assetClass);
    
    if (!sliceIds || sliceIds.length === 0) {
      return [];
    }
    
    // Sort slice IDs numerically in descending order (most recent first)
    // Since intraday slice IDs are sequential numbers
    const sortedSliceIds = sliceIds
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id))
      .sort((a, b) => b - a) // Descending order
      .map(id => id.toString());
    
    // Limit to the specified number of most recent slices
    const recentSliceIds = sortedSliceIds.slice(0, maxSlices);
    
    // Fetch data for each slice
    const allResults: DTCCTrade[] = [];
    
    for (const sliceId of recentSliceIds) {
      const result = await this.fetchDTCCData(agency, assetClass, sliceId, true);
      if (result && result.length > 0) {
        allResults.push(...result);
      }
    }
    
    return allResults;
  }
  
  /**
   * Fetch all reports (historical + intraday if needed)
   */
  public async fetchReports(params: DTCCFetchParams): Promise<DTCCTrade[]> {
    const { agency, assetClass, startDate, endDate } = params;
    
    // Start with historical data
    const historicalData = await this.fetchHistoricalReports(params);
    
    // Check if we need intraday data (if end date is today)
    const today = new Date();
    const needsIntraday = (
      isSameDay(endDate, today) || 
      isEqual(endDate, today) || 
      isBefore(today, endDate)
    );
    
    if (needsIntraday) {
      const intradayParams: DTCCIntraDayParams = {
        agency,
        assetClass,
        maxSlices: 20 // Fetch up to 20 most recent intraday slices for today
      };
      
      const intradayData = await this.fetchIntradayReports(intradayParams);
      
      return [...historicalData, ...intradayData];
    }
    
    return historicalData;
  }
  
  /**
   * Fetch data from DTCC for a specific date or slice
   */
  private async fetchDTCCData(
    agency: Agency, 
    assetClass: AssetClass, 
    dateString: string,
    isIntraday: boolean = false
  ): Promise<DTCCTrade[] | null> {
    const url = this.getDTCCUrl(agency, assetClass, dateString, isIntraday);
    const headers = this.getDTCCHeaders(agency, assetClass, dateString, isIntraday);
    
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const response = await this.axiosInstance.get(url, { headers, responseType: 'arraybuffer' });
        
        if (response.status === 200 && response.data) {
          // Extract data from zip file
          const zipData = await JSZip.loadAsync(response.data);
          const files = Object.keys(zipData.files).filter(
            name => name.endsWith('.csv') || name.endsWith('.xlsx')
          );
          
          if (files.length === 0) {
            return null;
          }
          
          // Process each file
          const allTrades: DTCCTrade[] = [];
          
          for (const fileName of files) {
            const fileData = await zipData.files[fileName].async('nodebuffer');
            
            // Here we would process the CSV or Excel data
            // For now, just assume we have a function to do this
            const trades = await this.processFileData(fileData, fileName, agency, assetClass);
            
            if (trades && trades.length > 0) {
              allTrades.push(...trades);
            }
          }
          
          return allTrades;
        }
        
        return null;
      } catch (error) {
        retries += 1;
        
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // File not found, no need to retry
          console.log(`No data found for ${agency}-${assetClass}-${dateString}`);
          return null;
        }
        
        // Exponential backoff
        const waitTime = BACKOFF_FACTOR * (2 ** (retries - 1));
        console.log(`Error fetching data for ${agency}-${assetClass}-${dateString}. Retrying in ${waitTime}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
    
    console.error(`Max retries exceeded for ${agency}-${assetClass}-${dateString}`);
    return null;
  }
  
  /**
   * Process file data from DTCC
   * This is a placeholder - in a real implementation, this would parse CSV or Excel data
   */
  private async processFileData(
    fileData: Buffer, 
    fileName: string,
    agency: Agency,
    assetClass: AssetClass
  ): Promise<DTCCTrade[] | null> {
    // In a real implementation, this would parse the CSV or Excel data
    // For now, just return an empty array
    return [];
  }
  
  /**
   * Get DTCC URL for a specific date or slice
   */
  private getDTCCUrl(
    agency: Agency, 
    assetClass: AssetClass, 
    dateString: string,
    isIntraday: boolean = false
  ): string {
    if (isIntraday) {
      return `${DTCC_BASE_URL}/api/report/intraday/${agency.toLowerCase()}/${agency}_SLICE_${assetClass}_${dateString}.zip`;
    } else {
      return `${DTCC_BASE_URL}/api/report/cumulative/${agency.toLowerCase()}/${agency}_CUMULATIVE_${assetClass}_${dateString}.zip`;
    }
  }
  
  /**
   * Get DTCC headers for a specific date or slice
   */
  private getDTCCHeaders(
    agency: Agency, 
    assetClass: AssetClass, 
    dateString: string,
    isIntraday: boolean = false
  ): DTCCHeaders {
    const url = this.getDTCCUrl(agency, assetClass, dateString, isIntraday);
    
    return {
      'authority': 'pddata.dtcc.com',
      'method': 'GET',
      'path': url.split('.com')[1],
      'scheme': 'https',
      'accept': 'application/json, text/plain, */*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-US,en;q=0.9',
      'dnt': '1',
      'priority': 'u=1, i',
      'referer': `${DTCC_BASE_URL}/${agency.toLowerCase()}dashboard`,
      'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    };
  }
  
  /**
   * Get DTCC intraday slice IDs
   * 
   * Intraday slices are identified by sequential numbers starting from 1
   * and incrementing throughout the day.
   */
  private async getDTCCIntradaySliceIds(
    agency: Agency,
    assetClass: AssetClass
  ): Promise<string[]> {
    // Asset class mapping for intraday IDs
    const assetClassIdMap: Record<AssetClass, string> = {
      'RATES': 'IR',
      'CREDITS': 'CR',
      'EQUITIES': 'EQ',
      'FOREX': 'FX',
      'COMMODITIES': 'CO'
    };
    
    const assetClassId = assetClassIdMap[assetClass];
    const url = `${DTCC_BASE_URL}/api/slice/${agency}/${assetClassId}`;
    
    try {
      const headers = {
        'authority': 'pddata.dtcc.com',
        'method': 'GET',
        'path': `/ppd/api/slice/${agency}/${assetClassId}`,
        'scheme': 'https',
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'dnt': '1',
        'priority': 'u=1, i',
        'referer': `${DTCC_BASE_URL}/${agency.toLowerCase()}dashboard`,
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      };
      
      const response = await this.axiosInstance.get(url, { headers });
      
      if (response.status === 200 && response.data) {
        const sliceData = response.data;
        
        // Extract only the sequence numbers from slice IDs
        // Format is typically: AGENCY_SLICE_ASSETCLASS_NUMBER.zip
        return sliceData.map((slice: any) => {
          const fileName = slice.fileName.toString();
          const parts = fileName.split(`_${assetClass}_`);
          if (parts.length > 1) {
            // The part after ASSETCLASS_ is just a sequence number
            return parts[1].split('.')[0];
          }
          return null;
        }).filter(Boolean);
      }
    } catch (error) {
      console.error(`Error fetching intraday slice IDs: ${error}`);
    }
    
    return [];
  }
  
  /**
   * Utility to chunk an array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    
    return chunks;
  }
}