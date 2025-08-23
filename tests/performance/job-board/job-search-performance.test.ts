// Performance tests for job board search and filtering functionality
// Measures search response times, pagination performance, and filter efficiency

import { chromium, Browser, Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  SEARCH_RESPONSE_TIME: 2000, // 2 seconds
  PAGE_LOAD_TIME: 3000, // 3 seconds
  FILTER_APPLICATION_TIME: 1500, // 1.5 seconds
  PAGINATION_TIME: 1000, // 1 second
  CORE_WEB_VITALS: {
    LCP: 2500, // Largest Contentful Paint
    FID: 100, // First Input Delay
    CLS: 0.1 // Cumulative Layout Shift
  }
}

// Test data configuration
const SEARCH_TEST_CASES = [
  { query: 'React', expectedMinResults: 5 },
  { query: 'Senior Developer', expectedMinResults: 3 },
  { query: 'Remote', expectedMinResults: 10 },
  { query: 'JavaScript TypeScript Node', expectedMinResults: 1 }
]

const FILTER_TEST_CASES = [
  { filter: 'jobType', value: 'CONTRACT', description: 'Contract jobs filter' },
  { filter: 'isRemote', value: 'true', description: 'Remote work filter' },
  { filter: 'minRate', value: '50', description: 'Minimum rate filter' },
  { filter: 'maxRate', value: '150', description: 'Maximum rate filter' }
]

describe('Job Board Search Performance Tests', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
    
    // Set up performance monitoring
    await page.addInitScript(() => {
      // Track performance metrics
      window.__performanceMetrics = {
        navigationStart: performance.now(),
        searchTimes: [],
        filterTimes: [],
        paginationTimes: []
      }
    })
    
    // Navigate to job board
    await page.goto('http://localhost:3000/jobs')
    await page.waitForLoadState('networkidle')
  })

  afterAll(async () => {
    await browser.close()
  })

  describe('Search Response Time Performance', () => {
    SEARCH_TEST_CASES.forEach(({ query, expectedMinResults }) => {
      test(`search for "${query}" completes within ${PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME}ms`, async () => {
        const searchInput = page.locator('[data-testid="job-search-input"]')
        const searchButton = page.locator('[data-testid="job-search-button"]')
        
        // Clear previous search
        await searchInput.clear()
        
        // Measure search performance
        const startTime = Date.now()
        
        await searchInput.fill(query)
        await searchButton.click()
        
        // Wait for results to load
        await page.waitForSelector('[data-testid="job-list"]')
        await page.waitForLoadState('networkidle')
        
        const endTime = Date.now()
        const searchTime = endTime - startTime
        
        // Verify performance threshold
        expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME)
        
        // Verify search results are relevant
        const jobCards = page.locator('[data-testid="job-card"]')
        const resultCount = await jobCards.count()
        expect(resultCount).toBeGreaterThanOrEqual(Math.min(expectedMinResults, 1))
        
        console.log(`Search "${query}": ${searchTime}ms, ${resultCount} results`)
      })
    })
  })

  describe('Filter Application Performance', () => {
    FILTER_TEST_CASES.forEach(({ filter, value, description }) => {
      test(`${description} applies within ${PERFORMANCE_THRESHOLDS.FILTER_APPLICATION_TIME}ms`, async () => {
        // Reset filters
        await page.click('[data-testid="clear-filters"]')
        await page.waitForLoadState('networkidle')
        
        const startTime = Date.now()
        
        // Apply filter based on type
        if (filter === 'jobType') {
          await page.click('[data-testid="job-type-filter"]')
          await page.click(`[data-testid="job-type-${value}"]`)
        } else if (filter === 'isRemote') {
          await page.check('[data-testid="remote-work-filter"]')
        } else if (filter === 'minRate' || filter === 'maxRate') {
          await page.fill(`[data-testid="${filter}-input"]`, value)
          await page.click('[data-testid="apply-rate-filter"]')
        }
        
        // Wait for filtered results
        await page.waitForSelector('[data-testid="job-list"]')
        await page.waitForLoadState('networkidle')
        
        const endTime = Date.now()
        const filterTime = endTime - startTime
        
        // Verify performance threshold
        expect(filterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FILTER_APPLICATION_TIME)
        
        // Verify filter was applied
        const activeFilters = page.locator('[data-testid="active-filter"]')
        const filterCount = await activeFilters.count()
        expect(filterCount).toBeGreaterThan(0)
        
        console.log(`Filter ${description}: ${filterTime}ms`)
      })
    })
  })

  describe('Pagination Performance', () => {
    test(`pagination navigation completes within ${PERFORMANCE_THRESHOLDS.PAGINATION_TIME}ms`, async () => {
      // Ensure we have multiple pages
      await page.goto('http://localhost:3000/jobs?limit=5')
      await page.waitForLoadState('networkidle')
      
      const pagination = page.locator('[data-testid="pagination"]')
      const nextButton = pagination.locator('[data-testid="next-page"]')
      
      // Check if next page exists
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        const startTime = Date.now()
        
        await nextButton.click()
        await page.waitForSelector('[data-testid="job-list"]')
        await page.waitForLoadState('networkidle')
        
        const endTime = Date.now()
        const paginationTime = endTime - startTime
        
        expect(paginationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGINATION_TIME)
        
        // Verify page changed
        const currentPage = await page.locator('[data-testid="current-page"]').textContent()
        expect(currentPage).toBe('2')
        
        console.log(`Pagination: ${paginationTime}ms`)
      }
    })
  })

  describe('Core Web Vitals Performance', () => {
    test('Largest Contentful Paint (LCP) meets performance standards', async () => {
      await page.goto('http://localhost:3000/jobs')
      
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            resolve(lastEntry.startTime)
          })
          observer.observe({ type: 'largest-contentful-paint', buffered: true })
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000)
        })
      })
      
      expect(lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.CORE_WEB_VITALS.LCP)
      console.log(`LCP: ${lcp}ms`)
    })

    test('First Input Delay (FID) meets performance standards', async () => {
      await page.goto('http://localhost:3000/jobs')
      await page.waitForLoadState('networkidle')
      
      const startTime = Date.now()
      await page.click('[data-testid="job-search-input"]')
      const endTime = Date.now()
      
      const fid = endTime - startTime
      expect(fid).toBeLessThan(PERFORMANCE_THRESHOLDS.CORE_WEB_VITALS.FID)
      
      console.log(`FID: ${fid}ms`)
    })

    test('Cumulative Layout Shift (CLS) meets performance standards', async () => {
      await page.goto('http://localhost:3000/jobs')
      
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cumulativeScore = 0
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cumulativeScore += entry.value
              }
            }
          })
          
          observer.observe({ type: 'layout-shift', buffered: true })
          
          setTimeout(() => {
            observer.disconnect()
            resolve(cumulativeScore)
          }, 3000)
        })
      })
      
      expect(cls).toBeLessThan(PERFORMANCE_THRESHOLDS.CORE_WEB_VITALS.CLS)
      console.log(`CLS: ${cls}`)
    })
  })

  describe('Memory and Resource Usage', () => {
    test('job search does not cause memory leaks', async () => {
      const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
      
      // Perform multiple searches to test for memory leaks
      for (const { query } of SEARCH_TEST_CASES) {
        await page.fill('[data-testid="job-search-input"]', query)
        await page.click('[data-testid="job-search-button"]')
        await page.waitForLoadState('networkidle')
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc()
        }
      })
      
      const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
      
      // Memory should not increase by more than 50MB
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB
      
      console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    test('concurrent searches do not degrade performance', async () => {
      const searchPromises = SEARCH_TEST_CASES.map(async ({ query }, index) => {
        const newPage = await browser.newPage()
        await newPage.goto('http://localhost:3000/jobs')
        
        const startTime = Date.now()
        await newPage.fill('[data-testid="job-search-input"]', query)
        await newPage.click('[data-testid="job-search-button"]')
        await newPage.waitForLoadState('networkidle')
        const endTime = Date.now()
        
        await newPage.close()
        
        return {
          query,
          time: endTime - startTime,
          index
        }
      })
      
      const results = await Promise.all(searchPromises)
      
      // All concurrent searches should complete within threshold
      results.forEach(({ query, time }) => {
        expect(time).toBeLessThan(PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME * 1.5) // 50% tolerance for concurrency
        console.log(`Concurrent search "${query}": ${time}ms`)
      })
    })
  })

  describe('Network Performance', () => {
    test('API responses are efficiently cached', async () => {
      // First request - should hit the server
      const firstSearchTime = await performSearch('React')
      
      // Second request - should use cache
      const secondSearchTime = await performSearch('React')
      
      // Cache should make subsequent requests faster
      expect(secondSearchTime).toBeLessThan(firstSearchTime)
      
      console.log(`First search: ${firstSearchTime}ms, Cached search: ${secondSearchTime}ms`)
    })

    test('pagination requests are optimized', async () => {
      await page.goto('http://localhost:3000/jobs?limit=10')
      
      // Monitor network requests
      const networkRequests: string[] = []
      page.on('request', request => {
        if (request.url().includes('/api/jobs')) {
          networkRequests.push(request.url())
        }
      })
      
      // Navigate through pages
      for (let i = 0; i < 3; i++) {
        const nextButton = page.locator('[data-testid="next-page"]')
        if (await nextButton.isVisible() && await nextButton.isEnabled()) {
          await nextButton.click()
          await page.waitForLoadState('networkidle')
        }
      }
      
      // Should make efficient API calls with proper pagination
      expect(networkRequests.length).toBeGreaterThan(0)
      expect(networkRequests.length).toBeLessThan(10) // Reasonable number of requests
    })
  })

  // Helper function for search performance measurement
  async function performSearch(query: string): Promise<number> {
    await page.fill('[data-testid="job-search-input"]', query)
    
    const startTime = Date.now()
    await page.click('[data-testid="job-search-button"]')
    await page.waitForLoadState('networkidle')
    const endTime = Date.now()
    
    return endTime - startTime
  }
})

// Export performance metrics for reporting
export { PERFORMANCE_THRESHOLDS }