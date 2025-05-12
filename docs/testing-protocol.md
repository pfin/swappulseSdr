# DTCC SDR Analyzer Testing Protocol

This document outlines the standardized testing procedure for the DTCC SDR Analyzer application, ensuring consistent quality and functionality across development iterations.

## Testing Objectives

1. **Functionality Verification**: Ensure all features work as specified in the user stories
2. **UI/UX Consistency**: Verify visual elements render correctly across different pages
3. **Performance Validation**: Test application performance with realistic data loads
4. **Error Handling**: Confirm proper handling of invalid inputs and failed operations
5. **Cross-Browser Compatibility**: Verify functionality across major browsers

## Testing Tools

### Automated Testing
- **Puppeteer**: For end-to-end (E2E) testing and screenshot capture
- **Jest**: For component and unit testing
- **React Testing Library**: For component testing

### Manual Testing
- **Developer Testing**: Structured testing using this protocol
- **User Acceptance Testing**: Guided testing sessions with stakeholders

## Testing Workflow

### 1. Pre-Testing Setup

1. **Environment Preparation**
   - Start a clean development server: `npm run dev`
   - Verify server running at http://localhost:3001 (or configured port)
   - Clear browser cache before testing

2. **Test Data Preparation**
   - Ensure mock data generators are configured correctly
   - Verify in-memory database is empty or in a known state

### 2. Automated Testing Execution

1. **Unit Tests**
   - Run unit tests with: `npm test`
   - Verify all tests pass
   - Address any failing tests before proceeding

2. **End-to-End Tests**
   - Run E2E tests with: `node tests/e2e/test-app.js`
   - Verify all test scenarios pass
   - Review generated screenshots for visual verification

### 3. Manual Testing Checklist

#### Homepage
- [ ] Verify all navigation links are working
- [ ] Confirm dashboard sections load correctly
- [ ] Test responsive layout at different screen sizes

#### Trade Data Page
1. **Data Fetching Form**
   - [ ] Test all asset class selections
   - [ ] Test date range validation
   - [ ] Test agency selection
   - [ ] Verify form submission with valid inputs
   - [ ] Test form validation for invalid inputs

2. **Trade Data Table**
   - [ ] Verify data loads and displays correctly
   - [ ] Test sorting functionality on each column
   - [ ] Test pagination functionality
   - [ ] Test filtering options

#### Analytics Pages
1. **Volume Analytics**
   - [ ] Verify product distribution chart renders
   - [ ] Hover on chart elements to confirm tooltips
   - [ ] Test time period selection controls

2. **Term Structure**
   - [ ] Verify term structure chart renders correctly
   - [ ] Test multiple date selection functionality
   - [ ] Test forward curve display options

3. **Time Series**
   - [ ] Test time series chart loading
   - [ ] Verify series selection controls work
   - [ ] Test date range filters
   - [ ] Verify dual axis functionality
   - [ ] Test moving average and standard deviation overlays

4. **Swap Spreads**
   - [ ] Verify spread curve displays correctly
   - [ ] Test component/spread view toggle
   - [ ] Verify benchmark selection controls

#### Dynamic Routes
- [ ] Test each asset class route (/trades/[assetClass])
- [ ] Test each analytics view route (/analytics/[view])
- [ ] Verify 404 page for invalid routes

#### Error Handling
- [ ] Test error handling for server API errors
- [ ] Test recovery from network disconnection
- [ ] Verify error messages are informative and user-friendly

### 4. Visual Regression Testing

1. **Screenshot Comparison**
   - Compare current test run screenshots against baseline
   - Document any visual differences
   - Determine if differences are expected or require fixes

2. **Responsive Design Verification**
   - Test at mobile dimensions (375px width)
   - Test at tablet dimensions (768px width)
   - Test at desktop dimensions (1280px width)
   - Test at large desktop dimensions (1920px width)

### 5. Performance Testing

1. **Load Testing**
   - Test with large dataset (50,000+ records)
   - Measure rendering time for data tables
   - Measure chart rendering performance
   - Monitor memory usage in browser

2. **Network Performance**
   - Test with throttled network (simulate slow connection)
   - Verify data caching mechanisms work as expected
   - Test application behavior during API timeouts

## Puppeteer Testing Script Usage

The automated testing script at `tests/e2e/test-app.js` provides comprehensive E2E testing of the application. 

### Running the Tests

1. Ensure the development server is running: `npm run dev`
2. Install Puppeteer if not already installed: `npm install puppeteer`
3. Run the test script: `node tests/e2e/test-app.js`

### Test Script Configuration

The script is configurable with the following options in the `config` object:

```javascript
const config = {
  baseUrl: 'http://localhost:3001',  // Adjust to your dev server port
  screenshotsDir: path.join(__dirname, 'screenshots'),
  headless: false,                  // Set to true for CI/CD
  slowMo: 50,                       // Slow down operations for visibility
  timeout: 30000,                   // Default timeout (30s)
  viewportWidth: 1280,
  viewportHeight: 800
};
```

### Test Cases Included

1. **Home Page Test**: Verifies navigation, layout, and core elements
2. **Trades Page Test**: Tests data form components and interaction
3. **Analytics Page Test**: Verifies charts and visualization components
4. **Dynamic Routes Test**: Tests asset-specific and view-specific routes
5. **Data Filtering Test**: Tests form submission and result display
6. **Analytics Charts Test**: Verifies all chart types render correctly

### Screenshot Capture

The test script automatically captures screenshots at key testing points, storing them in the `tests/e2e/screenshots` directory with timestamps. These screenshots can be:

1. Used for visual verification
2. Compared against baseline images
3. Incorporated into documentation
4. Used for troubleshooting test failures

## Test Reporting

After completing testing, compile the following information:

1. **Test Results Summary**
   - Number of tests passed/failed
   - List of any failing tests with details
   - Screenshots with any visual issues

2. **Performance Metrics**
   - Page load times
   - Chart rendering times
   - Data processing times

3. **Browser Compatibility Summary**
   - Results from each tested browser
   - Any browser-specific issues

## Continuous Integration

For CI environments, the following adjustments should be made:

1. Use headless mode in Puppeteer (`headless: true`)
2. Adjust timeouts based on CI environment performance
3. Ensure screenshots are saved as artifacts for later review
4. Add reporting plugins to generate structured test reports

## Regression Testing Guidelines

When making application changes, focus regression testing on:

1. The specific component being modified
2. Any dependent components that may be affected
3. Key user journeys that involve the modified components
4. Edge cases that could be impacted by the changes

## Testing Schedule

- **Unit Tests**: Run before each commit
- **E2E Tests**: Run before merging PRs
- **Full Manual Testing**: Conduct before major releases
- **Performance Testing**: Conduct monthly and before major releases