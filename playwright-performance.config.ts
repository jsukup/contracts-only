import { defineConfig, devices } from '@playwright/test'

/**
 * Performance testing configuration for Playwright
 * Optimized for Core Web Vitals and load testing scenarios
 */
export default defineConfig({
  testDir: './tests/performance',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { open: 'never', outputFolder: 'test-results/performance-report' }],
    ['junit', { outputFile: 'test-results/performance-results.xml' }],
    ['json', { outputFile: 'test-results/performance-results.json' }],
    ['line']
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Performance testing specific configurations
    actionTimeout: 30_000, // Longer timeouts for performance tests
    navigationTimeout: 30_000,
    
    // Collect performance metrics
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium-performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable performance monitoring
        launchOptions: {
          args: [
            '--enable-gpu-benchmarking',
            '--enable-memory-info',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      },
    },

    {
      name: 'mobile-performance',
      use: { 
        ...devices['iPhone 12'],
        // Mobile performance testing with network throttling
      },
    },

    {
      name: 'load-testing',
      use: { 
        ...devices['Desktop Chrome'],
        // Optimized for load testing scenarios
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security'
          ]
        }
      },
    },

    {
      name: 'core-web-vitals',
      use: { 
        ...devices['Desktop Chrome'],
        // Specific configuration for Core Web Vitals testing
        launchOptions: {
          args: [
            '--enable-gpu-benchmarking',
            '--enable-memory-info'
          ]
        }
      },
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // Global test configuration
  timeout: 60_000, // 1 minute timeout for performance tests
  expect: {
    timeout: 10_000, // 10 seconds for assertions
  },

  // Output directories
  outputDir: 'test-results/performance-artifacts',
})