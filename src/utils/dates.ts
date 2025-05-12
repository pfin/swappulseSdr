/**
 * Date utility functions for DTCC SDR Analyzer
 */

import { 
  addDays, 
  isWeekend, 
  isWithinInterval, 
  format,
  differenceInDays,
  isEqual
} from 'date-fns';

/**
 * Check if a date is a holiday (US holidays only)
 * This is a simplified implementation that only checks major US holidays
 */
export function isHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = January)
  const day = date.getDate();
  
  // New Year's Day (January 1)
  if (month === 0 && day === 1) return true;
  
  // Martin Luther King Jr. Day (Third Monday in January)
  if (month === 0 && isMonday(date) && day >= 15 && day <= 21) return true;
  
  // Presidents' Day (Third Monday in February)
  if (month === 1 && isMonday(date) && day >= 15 && day <= 21) return true;
  
  // Memorial Day (Last Monday in May)
  if (month === 4 && isMonday(date) && day >= 25 && day <= 31) return true;
  
  // Independence Day (July 4)
  if (month === 6 && day === 4) return true;
  
  // Labor Day (First Monday in September)
  if (month === 8 && isMonday(date) && day <= 7) return true;
  
  // Thanksgiving Day (Fourth Thursday in November)
  if (month === 10 && isThursday(date) && day >= 22 && day <= 28) return true;
  
  // Christmas Day (December 25)
  if (month === 11 && day === 25) return true;
  
  return false;
}

/**
 * Check if a date is a business day
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date);
}

/**
 * Get the next business day
 */
export function getNextBusinessDay(date: Date): Date {
  let nextDay = addDays(date, 1);
  
  while (!isBusinessDay(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }
  
  return nextDay;
}

/**
 * Get all business days in a date range
 */
export function getBusinessDatesInRange(startDate: Date, endDate: Date): Date[] {
  const result: Date[] = [];
  let currentDate = new Date(startDate);
  
  // Ensure we don't exceed the end date
  const daysInRange = differenceInDays(endDate, startDate);
  if (daysInRange < 0) {
    return [];
  }
  
  // Handle case when start and end date are the same
  if (isEqual(startDate, endDate)) {
    if (isBusinessDay(startDate)) {
      return [new Date(startDate)];
    }
    return [];
  }
  
  // Iterate through the range
  while (isWithinInterval(currentDate, { start: startDate, end: endDate })) {
    if (isBusinessDay(currentDate)) {
      result.push(new Date(currentDate));
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return result;
}

/**
 * Format a date for the DTCC API
 */
export function formatDTCCDate(date: Date): string {
  return format(date, 'yyyy_MM_dd');
}

/**
 * Helper functions for checking days of the week
 */
function isMonday(date: Date): boolean {
  return date.getDay() === 1; // 1 = Monday
}

function isThursday(date: Date): boolean {
  return date.getDay() === 4; // 4 = Thursday
}