/**
 * E2E Test Suite for DTCC SDR Analyzer
 * 
 * This script uses Puppeteer to test the core functionality of the application.
 * It navigates through various pages, interacts with components, and validates responses.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');

// Test configuration
const config = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  screenshotPath: screenshotsDir
};

/**
 * Takes a screenshot and saves it
 */
async function takeScreenshot(page, name) {
  await fs.mkdir(config.screenshotPath, { recursive: true });
  await page.screenshot({ 
    path: path.join(config.screenshotPath, `${name}.png`),
    fullPage: true 
  });
  console.log(`Screenshot saved: ${name}.png`);
}

/**
 * Main test function
 */
async function runTests() {
  console.log('Starting E2E tests for DTCC SDR Analyzer');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(config.timeout);
  
  try {
    // Test 1: Home page
    console.log('Test 1: Loading home page');
    await page.goto(`${config.baseUrl}/`);
    await page.waitForSelector('h1');
    await takeScreenshot(page, '01-home-page');
    
    // Test 2: Trades page
    console.log('Test 2: Navigating to trades page');
    await page.goto(`${config.baseUrl}/trades`);
    await page.waitForSelector('h1');
    await takeScreenshot(page, '02-trades-page');
    
    // Test 3: Load asset class page
    console.log('Test 3: Navigating to RATES asset class page');
    await page.goto(`${config.baseUrl}/trades/rates`);
    await page.waitForSelector('h1');
    await takeScreenshot(page, '03-rates-page');
    
    // Test 4: Fetch data interaction
    console.log('Test 4: Testing data fetching with date selection');
    
    // Set date range (1 week ago to today)
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Select CFTC as agency
    await page.click('select[name="agency"]');
    await page.select('select[name="agency"]', 'CFTC');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for data to load
    await page.waitForSelector('table');
    await takeScreenshot(page, '04-rates-data-loaded');
    
    // Test 5: Check analytics components
    console.log('Test 5: Verifying analytics components render correctly');
    await page.waitForSelector('h2:contains("Analytics")');
    await page.waitForSelector('canvas'); // Charts should render as canvas elements
    await takeScreenshot(page, '05-analytics-components');
    
    // Test 6: Analytics page
    console.log('Test 6: Navigating to analytics page');
    await page.goto(`${config.baseUrl}/analytics`);
    await page.waitForSelector('h1');
    await takeScreenshot(page, '06-analytics-page');
    
    // Test 7: Time series analytics view
    console.log('Test 7: Testing time series analytics');
    await page.goto(`${config.baseUrl}/analytics/time`);
    await page.waitForSelector('h1');
    await takeScreenshot(page, '07-time-series-view');
    
    console.log('All tests completed successfully\!');
  } catch (error) {
    console.error('Test failed:', error);
    // Take screenshot of failure state
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
}

// Run the tests
runTests().catch(console.error);
EOL < /dev/null
