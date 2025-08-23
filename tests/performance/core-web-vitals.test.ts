// Core Web Vitals performance testing for job board pages
// Tests LCP, FID, CLS, and other performance metrics

import { chromium, Browser, Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

const CORE_WEB_VITALS_THRESHOLDS = {
  // Core Web Vitals thresholds (good performance)
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms) 
  CLS: 0.1,  // Cumulative Layout Shift (score)
  
  // Additional performance metrics
  FCP: 1800, // First Contentful Paint (ms)
  TTI: 3800, // Time to Interactive (ms)
  TBT: 300,  // Total Blocking Time (ms)
  SI: 3400   // Speed Index
}

const TEST_PAGES = [
  { path: '/jobs', name: 'Job Listings Page' },
  { path: '/post-job', name: 'Job Posting Form' },
  { path: '/jobs/sample-job-id', name: 'Job Detail Page' },
  { path: '/profile', name: 'User Profile Page' },
  { path: '/', name: 'Home Page' }
]

describe('Core Web Vitals Performance Tests', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser.close()
  })

  beforeEach(async () => {
    page = await browser.newPage()
    
    // Set up Core Web Vitals monitoring
    await page.addInitScript(() => {
      // Global performance metrics collection
      window.__performanceMetrics = {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        tti: 0,
        tbt: 0
      }

      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        window.__performanceMetrics.lcp = lastEntry.startTime
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

      // FCP Observer
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
        if (fcpEntry) {
          window.__performanceMetrics.fcp = fcpEntry.startTime
        }
      })
      fcpObserver.observe({ type: 'paint', buffered: true })

      // CLS Observer
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        window.__performanceMetrics.cls = clsValue
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })

      // FID simulation (first interaction delay)
      let isFirstInput = true
      document.addEventListener('click', (event) => {
        if (isFirstInput) {
          window.__performanceMetrics.fid = performance.now() - event.timeStamp
          isFirstInput = false
        }
      })
    })
  })

  afterEach(async () => {
    await page.close()
  })

  describe('Largest Contentful Paint (LCP)', () => {
    TEST_PAGES.forEach(({ path, name }) => {
      test(`${name} LCP is under ${CORE_WEB_VITALS_THRESHOLDS.LCP}ms`, async () => {
        await page.goto(`http://localhost:3000${path}`)
        await page.waitForLoadState('networkidle')
        
        // Wait a bit more to ensure LCP measurement is complete
        await page.waitForTimeout(2000)
        
        const lcp = await page.evaluate(() => window.__performanceMetrics.lcp)
        
        expect(lcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP)
        expect(lcp).toBeGreaterThan(0) // Ensure measurement was captured
        
        console.log(`${name} LCP: ${lcp}ms`)
      })
    })
  })

  describe('First Input Delay (FID)', () => {
    TEST_PAGES.forEach(({ path, name }) => {
      test(`${name} FID is under ${CORE_WEB_VITALS_THRESHOLDS.FID}ms`, async () => {
        await page.goto(`http://localhost:3000${path}`)
        await page.waitForLoadState('networkidle')
        
        // Simulate first user interaction
        const startTime = Date.now()
        
        // Try to find an interactive element based on the page
        let selector = 'body'
        if (path === '/jobs') {
          selector = '[data-testid="job-search-input"]'
        } else if (path === '/post-job') {
          selector = '[data-testid="job-title-input"]'
        }
        
        await page.click(selector)
        const endTime = Date.now()
        
        const fid = endTime - startTime
        
        expect(fid).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.FID)
        
        console.log(`${name} FID: ${fid}ms`)
      })
    })
  })

  describe('Cumulative Layout Shift (CLS)', () => {
    TEST_PAGES.forEach(({ path, name }) => {
      test(`${name} CLS is under ${CORE_WEB_VITALS_THRESHOLDS.CLS}`, async () => {
        await page.goto(`http://localhost:3000${path}`)
        
        // Monitor layout shifts during page load and interaction
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000) // Allow time for potential layout shifts
        
        // Simulate user interactions that might cause layout shifts
        if (path === '/jobs') {
          await page.click('[data-testid="job-search-input"]')
          await page.fill('[data-testid="job-search-input"]', 'React')
          await page.click('[data-testid="job-search-button"]')
          await page.waitForLoadState('networkidle')
        }
        
        const cls = await page.evaluate(() => window.__performanceMetrics.cls)
        
        expect(cls).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.CLS)
        
        console.log(`${name} CLS: ${cls}`)
      })
    })
  })

  describe('First Contentful Paint (FCP)', () => {
    TEST_PAGES.forEach(({ path, name }) => {
      test(`${name} FCP is under ${CORE_WEB_VITALS_THRESHOLDS.FCP}ms`, async () => {
        await page.goto(`http://localhost:3000${path}`)
        await page.waitForLoadState('networkidle')
        
        const fcp = await page.evaluate(() => window.__performanceMetrics.fcp)
        
        expect(fcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.FCP)
        expect(fcp).toBeGreaterThan(0)
        
        console.log(`${name} FCP: ${fcp}ms`)
      })
    })
  })

  describe('Mobile Core Web Vitals', () => {
    const mobileViewport = { width: 375, height: 667 }
    
    beforeEach(async () => {
      await page.setViewportSize(mobileViewport)
      
      // Simulate mobile network conditions
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40 // 40ms RTT
      })
    })

    TEST_PAGES.forEach(({ path, name }) => {
      test(`${name} mobile LCP meets standards`, async () => {
        await page.goto(`http://localhost:3000${path}`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)
        
        const lcp = await page.evaluate(() => window.__performanceMetrics.lcp)
        
        // Mobile LCP threshold is slightly more lenient
        expect(lcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP * 1.2)
        
        console.log(`${name} Mobile LCP: ${lcp}ms`)
      })
    })
  })

  describe('Performance Under Load', () => {
    test('Core Web Vitals remain stable under concurrent users', async () => {
      const concurrentPages = 5
      const pages: Page[] = []
      
      try {
        // Create multiple pages to simulate concurrent load
        for (let i = 0; i < concurrentPages; i++) {
          const newPage = await browser.newPage()
          await newPage.addInitScript(() => {
            window.__performanceMetrics = { lcp: 0, fid: 0, cls: 0, fcp: 0 }
            
            const lcpObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries()
              const lastEntry = entries[entries.length - 1]
              window.__performanceMetrics.lcp = lastEntry.startTime
            })
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
          })
          pages.push(newPage)
        }
        
        // Load the same page on all concurrent sessions
        await Promise.all(pages.map(p => p.goto('http://localhost:3000/jobs')))
        await Promise.all(pages.map(p => p.waitForLoadState('networkidle')))
        await Promise.all(pages.map(p => p.waitForTimeout(2000)))
        
        // Collect LCP measurements from all pages
        const lcpValues = await Promise.all(
          pages.map(p => p.evaluate(() => window.__performanceMetrics.lcp))
        )
        
        const avgLCP = lcpValues.reduce((sum, lcp) => sum + lcp, 0) / lcpValues.length
        const maxLCP = Math.max(...lcpValues)
        
        console.log(`Concurrent Load Test - Avg LCP: ${avgLCP}ms, Max LCP: ${maxLCP}ms`)
        
        // Performance shouldn't degrade significantly under load
        expect(avgLCP).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP * 1.3)
        expect(maxLCP).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP * 1.5)
        
      } finally {
        await Promise.all(pages.map(p => p.close()))
      }
    })
  })

  describe('Performance Budget Monitoring', () => {
    test('JavaScript bundle size impact on Core Web Vitals', async () => {
      await page.goto('http://localhost:3000/jobs')
      
      // Monitor resource loading
      const resourceSizes: { [key: string]: number } = {}
      
      page.on('response', async (response) => {
        const url = response.url()
        if (url.includes('.js') || url.includes('.css')) {
          try {
            const buffer = await response.body()
            resourceSizes[url] = buffer.length
          } catch (e) {
            // Ignore errors for resource size calculation
          }
        }
      })
      
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      
      const lcp = await page.evaluate(() => window.__performanceMetrics.lcp)
      const fcp = await page.evaluate(() => window.__performanceMetrics.fcp)
      
      const totalJSSize = Object.entries(resourceSizes)
        .filter(([url]) => url.includes('.js'))
        .reduce((total, [, size]) => total + size, 0)
      
      const totalCSSSize = Object.entries(resourceSizes)
        .filter(([url]) => url.includes('.css'))
        .reduce((total, [, size]) => total + size, 0)
      
      console.log(`Resource Analysis:`)
      console.log(`- Total JS Size: ${(totalJSSize / 1024).toFixed(2)}KB`)
      console.log(`- Total CSS Size: ${(totalCSSSize / 1024).toFixed(2)}KB`)
      console.log(`- LCP: ${lcp}ms`)
      console.log(`- FCP: ${fcp}ms`)
      
      // Performance budget checks
      expect(totalJSSize).toBeLessThan(500 * 1024) // 500KB JS budget
      expect(totalCSSSize).toBeLessThan(100 * 1024) // 100KB CSS budget
      expect(lcp).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP)
    })
  })

  describe('Progressive Loading Performance', () => {
    test('job listings progressive loading maintains good Core Web Vitals', async () => {
      await page.goto('http://localhost:3000/jobs')
      
      // Monitor LCP as more content loads
      const lcpValues: number[] = []
      
      // Collect LCP at different stages
      await page.waitForSelector('[data-testid="job-list"]')
      let currentLCP = await page.evaluate(() => window.__performanceMetrics.lcp)
      lcpValues.push(currentLCP)
      
      // Trigger more content loading (pagination)
      const nextButton = page.locator('[data-testid="next-page"]')
      if (await nextButton.isVisible()) {
        await nextButton.click()
        await page.waitForLoadState('networkidle')
        currentLCP = await page.evaluate(() => window.__performanceMetrics.lcp)
        lcpValues.push(currentLCP)
      }
      
      // LCP shouldn't increase significantly during progressive loading
      const initialLCP = lcpValues[0]
      const finalLCP = lcpValues[lcpValues.length - 1]
      
      expect(initialLCP).toBeLessThan(CORE_WEB_VITALS_THRESHOLDS.LCP)
      expect(finalLCP - initialLCP).toBeLessThan(500) // Max 500ms increase
      
      console.log(`Progressive Loading - Initial LCP: ${initialLCP}ms, Final LCP: ${finalLCP}ms`)
    })
  })
})

export { CORE_WEB_VITALS_THRESHOLDS }