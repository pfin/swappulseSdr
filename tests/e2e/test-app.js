/**
 * E2E Testing for DTCC SDR Analyzer
 * 
 * This script tests the application's main functionality using Puppeteer.
 * It navigates through the application, interacts with main components,
 * and verifies that core features work as expected.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs/promises');

// Configuration
const config = {
  baseUrl: 'http://localhost:3001',  // Adjust to your dev server port
  screenshotsDir: path.join(__dirname, 'screenshots'),
  headless: false,                  // Set to true for CI/CD
  slowMo: 50,                       // Slow down operations by 50ms for visibility
  timeout: 30000,                   // Default timeout (30s)
  viewportWidth: 1280,
  viewportHeight: 800
};

// Ensure screenshots directory exists
async function ensureScreenshotDir() {
  try {
    await fs.mkdir(config.screenshotsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create screenshots directory:', error);
  }
}

// Take a screenshot with timestamp
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const fileName = `${timestamp}_${name}.png`;
  const filePath = path.join(config.screenshotsDir, fileName);
  
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Screenshot saved: ${fileName}`);
  return filePath;
}

// Helper function to wait for network to be idle
async function waitForNetworkIdle(page, timeout = 2000) {
  return new Promise((resolve) => {
    let timer;
    let requestCounter = 0;
    
    const requestStarted = () => {
      requestCounter++;
      clearTimeout(timer);
    };
    
    const requestFinished = () => {
      requestCounter--;
      if (requestCounter === 0) {
        timer = setTimeout(onIdle, timeout);
      }
    };
    
    const onIdle = () => {
      page.off('request', requestStarted);
      page.off('requestfinished', requestFinished);
      page.off('requestfailed', requestFinished);
      resolve();
    };
    
    page.on('request', requestStarted);
    page.on('requestfinished', requestFinished);
    page.on('requestfailed', requestFinished);
    
    // Start the timer
    timer = setTimeout(onIdle, timeout);
  });
}

// Test suite
async function runTests() {
  console.log('Starting E2E tests for DTCC SDR Analyzer');
  
  // Create browser instance
  const browser = await puppeteer.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    defaultViewport: {
      width: config.viewportWidth,
      height: config.viewportHeight
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Create a new page
  const page = await browser.newPage();
  
  // Test results
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    errors: []
  };
  
  try {
    await ensureScreenshotDir();
    
    // Test cases
    await testHomePage();
    await testTradesPage();
    await testAnalyticsPage();
    await testDynamicRoutes();
    await testDataFilteringForm();
    await testAnalyticsCharts();
    
    // Print test results
    console.log('\n===== TEST RESULTS =====');
    console.log(`PASSED: ${results.passed}/${results.total} tests`);
    
    if (results.failed > 0) {
      console.log('\nFAILED TESTS:');
      results.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.test}: ${error.message}`);
      });
    }
    
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    // Close the browser
    await browser.close();
  }
  
  // Test functions
  
  // Test the home page
  async function testHomePage() {
    const testName = 'Home Page';
    try {
      // Navigate to the home page
      await page.goto(config.baseUrl, { waitUntil: 'networkidle2', timeout: config.timeout });
      
      // Take a screenshot
      await takeScreenshot(page, 'home_page');
      
      // Verify the page title
      const title = await page.title();
      assertThat(title.includes('DTCC SDR Analyzer'), 'Page title should contain "DTCC SDR Analyzer"');
      
      // Verify navigation elements exist
      const navElements = await page.$$('nav a');
      assertThat(navElements.length > 0, 'Navigation menu should be present');
      
      // Verify main sections
      const mainTitle = await page.$eval('h1', el => el.textContent);
      assertThat(mainTitle.includes('DTCC SDR'), 'Main title should contain "DTCC SDR"');
      
      recordResult(testName, true);
    } catch (error) {
      recordResult(testName, false, error.message);
    }
  }
  
  // Test the trades page
  async function testTradesPage() {
    const testName = 'Trades Page';
    try {
      // Navigate to the trades page
      await page.goto(`${config.baseUrl}/trades`, { waitUntil: 'networkidle2', timeout: config.timeout });
      
      // Take a screenshot
      await takeScreenshot(page, 'trades_page');
      
      // Verify the page contains data fetching form
      const formExists = await page.$('.data-fetch-form') !== null;
      assertThat(formExists, 'Data fetch form should be present');
      
      // Verify asset class selection dropdown
      const assetClassSelect = await page.$('select[name="assetClass"]');
      assertThat(assetClassSelect !== null, 'Asset class selection should be present');
      
      recordResult(testName, true);
    } catch (error) {
      recordResult(testName, false, error.message);
    }
  }
  
  // Test the analytics page
  async function testAnalyticsPage() {
    const testName = 'Analytics Page';
    try {
      // Navigate to the analytics page
      await page.goto(`${config.baseUrl}/analytics`, { waitUntil: 'networkidle2', timeout: config.timeout });
      
      // Take a screenshot
      await takeScreenshot(page, 'analytics_page');
      
      // Verify analytics dashboard exists
      const dashboardExists = await page.$('.analytics-dashboard') !== null;
      assertThat(dashboardExists, 'Analytics dashboard should be present');
      
      // Check for chart elements
      const chartElements = await page.$$('canvas');
      assertThat(chartElements.length > 0, 'Chart elements should be present');
      
      recordResult(testName, true);
    } catch (error) {
      recordResult(testName, false, error.message);
    }
  }
  
  // Test dynamic routes
  async function testDynamicRoutes() {
    const testName = 'Dynamic Routes';
    try {
      // Test asset class specific route
      await page.goto(`${config.baseUrl}/trades/rates`, { waitUntil: 'networkidle2', timeout: config.timeout });
      
      // Take a screenshot
      await takeScreenshot(page, 'trades_rates_page');
      
      // Verify the page contains RATES specific information
      const pageTitle = await page.$eval('h1', el => el.textContent);
      assertThat(pageTitle.includes('RATES'), 'Page title should contain the asset class name');
      
      // Test analytics view route
      await page.goto(`${config.baseUrl}/analytics/volume`, { waitUntil: 'networkidle2', timeout: config.timeout });
      
      // Take a screenshot
      await takeScreenshot(page, 'analytics_volume_page');
      
      // Verify the page contains volume-specific information
      const viewTitle = await page.$eval('h1, h2', el => el.textContent);
      assertThat(viewTitle.includes('Volume') || viewTitle.includes('Trade Volume'), 
                 'Page title should contain the analytics view name');
      
      recordResult(testName, true);
    } catch (error) {
      recordResult(testName, false, error.message);
    }
  }
  
  // Test data filtering form functionality
  async function testDataFilteringForm() {
    const testName = 'Data Filtering Form';
    try {
      // Navigate to the trades page
      await page.goto(`${config.baseUrl}/trades`, { waitUntil: 'networkidle2', timeout: config.timeout });
      
      // Select asset class
      await page.select('select[name="assetClass"]', 'RATES');
      
      // Fill in date range
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };
      
      await page.$eval('input[name="startDate"]', (el, date) => el.value = date, formatDate(oneWeekAgo));
      await page.$eval('input[name="endDate"]', (el, date) => el.value = date, formatDate(today));
      
      // Click the fetch button
      await page.click('button[type="submit"]');
      
      // Wait for data to load
      await waitForNetworkIdle(page);
      
      // Take a screenshot
      await takeScreenshot(page, 'data_filtering_form_results');
      
      // Verify data table is displayed
      const tableExists = await page.$('.trade-table') !== null;
      assertThat(tableExists, 'Trade data table should be displayed after form submission');
      
      recordResult(testName, true);
    } catch (error) {
      recordResult(testName, false, error.message);
    }
  }
  
  // Test analytics charts
  async function testAnalyticsCharts() {
    const testName = 'Analytics Charts';
    try {
      // Navigate to the analytics page
      await page.goto(`${config.baseUrl}/analytics`, { waitUntil: 'networkidle2', timeout: config.timeout });
      
      // Check for various chart types
      const charts = [
        { selector: '.product-distribution-chart', name: 'product_distribution' },
        { selector: '.time-distribution-chart', name: 'time_distribution' },
        { selector: '.trade-size-distribution-chart', name: 'trade_size_distribution' }
      ];
      
      for (const chart of charts) {
        const chartExists = await page.$(chart.selector) !== null;
        assertThat(chartExists, `${chart.name} chart should be present`);
        
        if (chartExists) {
          // Scroll to chart
          await page.$eval(chart.selector, el => el.scrollIntoView());
          await page.waitForTimeout(500);
          
          // Take screenshot of the chart
          await takeScreenshot(page, chart.name);
        }
      }
      
      recordResult(testName, true);
    } catch (error) {
      recordResult(testName, false, error.message);
    }
  }
  
  // Helper functions for assertions
  function assertThat(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }
  
  // Record test result
  function recordResult(testName, passed, errorMessage = null) {
    results.total++;
    
    if (passed) {
      results.passed++;
      console.log(`✅ ${testName}: PASSED`);
    } else {
      results.failed++;
      console.log(`❌ ${testName}: FAILED - ${errorMessage}`);
      results.errors.push({ test: testName, message: errorMessage });
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});