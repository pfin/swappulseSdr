const puppeteer = require('puppeteer');

async function testIntradayPage() {
  console.log('Starting Puppeteer test for intraday page...');
  
  // Launch browser
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Go to intraday page
    console.log('Navigating to intraday page...');
    await page.goto('http://localhost:3001/intraday', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for initial data to load
    console.log('Waiting for initial data to load...');
    await page.waitForFunction(
      () => !document.querySelector('body').innerText.includes('Loading'),
      { timeout: 10000 }
    );
    
    // Get initial trade count
    const initialTradeCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Showing (\d+) trades/);
      return match ? parseInt(match[1], 10) : 0;
    });
    
    console.log(`Initial trade count: ${initialTradeCount}`);
    
    if (initialTradeCount === 0) {
      throw new Error('No initial trades loaded');
    }
    
    // Click the "Generate New Batch" button (simulating a new batch arriving)
    console.log('Generating a new batch...');
    await page.evaluate(() => {
      // Use fetch directly to call the API with the generateMockBatch parameter
      fetch('/api/dtcc/intraday?agency=CFTC&assetClass=RATES&generateMockBatch=true')
        .then(res => res.json())
        .then(data => console.log('Generated new batch:', data.metadata.count));
    });
    
    // Wait a moment for the polling to detect the new batch
    await page.waitForTimeout(3000);
    
    // Click refresh now button to speed up the test
    const refreshButton = await page.$('button:contains("Refresh Now")');
    if (refreshButton) {
      await refreshButton.click();
      console.log('Clicked refresh button');
    } else {
      // Manual refresh by calling the API
      await page.evaluate(() => {
        document.querySelector('button').click();
      });
    }
    
    // Wait for update
    await page.waitForTimeout(2000);
    
    // Get updated trade count
    const updatedTradeCount = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Showing (\d+) trades/);
      return match ? parseInt(match[1], 10) : 0;
    });
    
    console.log(`Updated trade count: ${updatedTradeCount}`);
    
    // Verify that trade count has increased (data is being accumulated)
    if (updatedTradeCount <= initialTradeCount) {
      throw new Error('Trade count did not increase after new batch. Data is not being accumulated properly.');
    }
    
    console.log(`Success! Trade count increased from ${initialTradeCount} to ${updatedTradeCount}`);
    console.log('Intraday data accumulation is working correctly!');
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'intraday-verification.png' });
    console.log('Screenshot saved to intraday-verification.png');
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    await browser.close();
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testIntradayPage()
  .then(success => {
    if (success) {
      console.log('All tests passed!');
      process.exit(0);
    } else {
      console.error('Some tests failed.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });