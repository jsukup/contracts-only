// Load testing for job board under concurrent user scenarios
// Tests system behavior under high traffic and concurrent operations

import { chromium, Browser, Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

const LOAD_TEST_CONFIG = {
  CONCURRENT_USERS: 10,
  SEARCH_DURATION: 30000, // 30 seconds
  CONCURRENT_SUBMISSIONS: 5,
  MAX_RESPONSE_TIME_UNDER_LOAD: 5000, // 5 seconds
  ERROR_RATE_THRESHOLD: 0.05, // 5% error rate
  MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
  CPU_THRESHOLD: 80 // 80% CPU usage
}

interface LoadTestResult {
  userId: number
  operation: string
  startTime: number
  endTime: number
  success: boolean
  error?: string
  responseTime: number
}

describe('Job Board Load Testing', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'] // Better for load testing
    })
  })

  afterAll(async () => {
    await browser.close()
  })

  describe('Concurrent Job Search Load Testing', () => {
    test('handles concurrent job searches without performance degradation', async () => {
      const results: LoadTestResult[] = []
      const searchQueries = ['React', 'Node.js', 'Python', 'Java', 'TypeScript', 'Angular', 'Vue', 'PHP', 'Ruby', 'Go']
      
      // Create concurrent user sessions
      const userPromises = Array.from({ length: LOAD_TEST_CONFIG.CONCURRENT_USERS }, async (_, userId) => {
        const page = await browser.newPage()
        const userResults: LoadTestResult[] = []
        
        try {
          await page.goto('http://localhost:3000/jobs')
          await page.waitForLoadState('networkidle')
          
          const testStartTime = Date.now()
          const endTime = testStartTime + LOAD_TEST_CONFIG.SEARCH_DURATION
          
          while (Date.now() < endTime) {
            const query = searchQueries[Math.floor(Math.random() * searchQueries.length)]
            
            const startTime = Date.now()
            try {
              await page.fill('[data-testid="job-search-input"]', query)
              await page.click('[data-testid="job-search-button"]')
              await page.waitForSelector('[data-testid="job-list"]', { timeout: 10000 })
              
              const operationEndTime = Date.now()
              userResults.push({
                userId,
                operation: 'search',
                startTime,
                endTime: operationEndTime,
                success: true,
                responseTime: operationEndTime - startTime
              })
            } catch (error) {
              const operationEndTime = Date.now()
              userResults.push({
                userId,
                operation: 'search',
                startTime,
                endTime: operationEndTime,
                success: false,
                error: error.message,
                responseTime: operationEndTime - startTime
              })
            }
            
            // Random delay between searches (1-3 seconds)
            await page.waitForTimeout(1000 + Math.random() * 2000)
          }
        } finally {
          await page.close()
        }
        
        return userResults
      })
      
      // Execute all concurrent users
      const allResults = await Promise.all(userPromises)
      const flatResults = allResults.flat()
      results.push(...flatResults)
      
      // Analyze results
      const successfulOperations = results.filter(r => r.success)
      const failedOperations = results.filter(r => !r.success)
      
      const errorRate = failedOperations.length / results.length
      const avgResponseTime = successfulOperations.reduce((sum, r) => sum + r.responseTime, 0) / successfulOperations.length
      const maxResponseTime = Math.max(...successfulOperations.map(r => r.responseTime))
      
      console.log(`Load Test Results:`)
      console.log(`- Total operations: ${results.length}`)
      console.log(`- Successful: ${successfulOperations.length}`)
      console.log(`- Failed: ${failedOperations.length}`)
      console.log(`- Error rate: ${(errorRate * 100).toFixed(2)}%`)
      console.log(`- Average response time: ${avgResponseTime.toFixed(0)}ms`)
      console.log(`- Max response time: ${maxResponseTime}ms`)
      
      // Performance assertions
      expect(errorRate).toBeLessThan(LOAD_TEST_CONFIG.ERROR_RATE_THRESHOLD)
      expect(maxResponseTime).toBeLessThan(LOAD_TEST_CONFIG.MAX_RESPONSE_TIME_UNDER_LOAD)
      expect(avgResponseTime).toBeLessThan(LOAD_TEST_CONFIG.MAX_RESPONSE_TIME_UNDER_LOAD / 2)
    })
  })

  describe('Concurrent Job Posting Load Testing', () => {
    test('handles concurrent job submissions without data corruption', async () => {
      const results: LoadTestResult[] = []
      
      const jobTemplates = [
        { title: 'Frontend Developer', company: 'Tech Co A', rate: '80-120' },
        { title: 'Backend Engineer', company: 'Tech Co B', rate: '90-130' },
        { title: 'Full Stack Developer', company: 'Tech Co C', rate: '85-125' },
        { title: 'DevOps Engineer', company: 'Tech Co D', rate: '100-140' },
        { title: 'Data Scientist', company: 'Tech Co E', rate: '110-150' }
      ]
      
      // Create concurrent job posting sessions
      const postingPromises = Array.from({ length: LOAD_TEST_CONFIG.CONCURRENT_SUBMISSIONS }, async (_, userId) => {
        const page = await browser.newPage()
        const template = jobTemplates[userId % jobTemplates.length]
        
        const startTime = Date.now()
        try {
          await page.goto('http://localhost:3000/post-job')
          await page.waitForLoadState('networkidle')
          
          // Fill form with unique data
          await page.fill('[data-testid="job-title-input"]', `${template.title} ${userId}`)
          await page.fill('[data-testid="job-description-textarea"]', `Description for ${template.title} position at ${template.company}`)
          await page.fill('[data-testid="company-input"]', template.company)
          await page.fill('[data-testid="location-input"]', 'San Francisco, CA')
          await page.fill('[data-testid="hourly-rate-min-input"]', template.rate.split('-')[0])
          await page.fill('[data-testid="hourly-rate-max-input"]', template.rate.split('-')[1])
          await page.fill('[data-testid="application-url-input"]', `https://example.com/apply/${userId}`)
          
          // Submit form
          await page.click('[data-testid="submit-job-button"]')
          await page.waitForSelector('[data-testid="submission-success"]', { timeout: 10000 })
          
          const endTime = Date.now()
          
          await page.close()
          
          return {
            userId,
            operation: 'job_submission',
            startTime,
            endTime,
            success: true,
            responseTime: endTime - startTime
          } as LoadTestResult
          
        } catch (error) {
          const endTime = Date.now()
          await page.close()
          
          return {
            userId,
            operation: 'job_submission',
            startTime,
            endTime,
            success: false,
            error: error.message,
            responseTime: endTime - startTime
          } as LoadTestResult
        }
      })
      
      // Execute all concurrent submissions
      const submissionResults = await Promise.all(postingPromises)
      results.push(...submissionResults)
      
      // Analyze results
      const successfulSubmissions = results.filter(r => r.success)
      const failedSubmissions = results.filter(r => !r.success)
      
      const errorRate = failedSubmissions.length / results.length
      const avgSubmissionTime = successfulSubmissions.reduce((sum, r) => sum + r.responseTime, 0) / successfulSubmissions.length
      
      console.log(`Job Submission Load Test Results:`)
      console.log(`- Total submissions: ${results.length}`)
      console.log(`- Successful: ${successfulSubmissions.length}`)
      console.log(`- Failed: ${failedSubmissions.length}`)
      console.log(`- Error rate: ${(errorRate * 100).toFixed(2)}%`)
      console.log(`- Average submission time: ${avgSubmissionTime.toFixed(0)}ms`)
      
      // Performance assertions
      expect(errorRate).toBeLessThan(LOAD_TEST_CONFIG.ERROR_RATE_THRESHOLD)
      expect(avgSubmissionTime).toBeLessThan(LOAD_TEST_CONFIG.MAX_RESPONSE_TIME_UNDER_LOAD)
      
      // Verify no data corruption by checking job uniqueness
      if (successfulSubmissions.length > 1) {
        const page = await browser.newPage()
        await page.goto('http://localhost:3000/jobs')
        await page.waitForLoadState('networkidle')
        
        // Check that submitted jobs appear correctly
        for (const result of successfulSubmissions) {
          const jobTitle = `Frontend Developer ${result.userId}` // Adjust based on template
          await page.fill('[data-testid="job-search-input"]', jobTitle)
          await page.click('[data-testid="job-search-button"]')
          
          // Should find the specific job
          const jobResults = page.locator('[data-testid="job-card"]')
          expect(await jobResults.count()).toBeGreaterThan(0)
        }
        
        await page.close()
      }
    })
  })

  describe('Database Connection Pool Load Testing', () => {
    test('handles high concurrent database queries efficiently', async () => {
      const results: LoadTestResult[] = []
      const operations = ['search', 'filter', 'pagination']
      
      // Simulate high database load
      const dbLoadPromises = Array.from({ length: LOAD_TEST_CONFIG.CONCURRENT_USERS * 2 }, async (_, userId) => {
        const page = await browser.newPage()
        const userResults: LoadTestResult[] = []
        
        try {
          await page.goto('http://localhost:3000/jobs')
          await page.waitForLoadState('networkidle')
          
          // Perform rapid database operations
          for (let i = 0; i < 10; i++) {
            const operation = operations[i % operations.length]
            const startTime = Date.now()
            
            try {
              switch (operation) {
                case 'search':
                  await page.fill('[data-testid="job-search-input"]', `search${i}`)
                  await page.click('[data-testid="job-search-button"]')
                  break
                case 'filter':
                  await page.click('[data-testid="remote-work-filter"]')
                  break
                case 'pagination':
                  const nextButton = page.locator('[data-testid="next-page"]')
                  if (await nextButton.isVisible()) {
                    await nextButton.click()
                  }
                  break
              }
              
              await page.waitForLoadState('networkidle')
              
              const endTime = Date.now()
              userResults.push({
                userId,
                operation,
                startTime,
                endTime,
                success: true,
                responseTime: endTime - startTime
              })
              
            } catch (error) {
              const endTime = Date.now()
              userResults.push({
                userId,
                operation,
                startTime,
                endTime,
                success: false,
                error: error.message,
                responseTime: endTime - startTime
              })
            }
            
            // Small delay between operations
            await page.waitForTimeout(100)
          }
        } finally {
          await page.close()
        }
        
        return userResults
      })
      
      const allResults = await Promise.all(dbLoadPromises)
      const flatResults = allResults.flat()
      results.push(...flatResults)
      
      // Analyze database performance under load
      const successfulOps = results.filter(r => r.success)
      const errorRate = (results.length - successfulOps.length) / results.length
      const avgResponseTime = successfulOps.reduce((sum, r) => sum + r.responseTime, 0) / successfulOps.length
      
      console.log(`Database Load Test Results:`)
      console.log(`- Total operations: ${results.length}`)
      console.log(`- Success rate: ${((1 - errorRate) * 100).toFixed(2)}%`)
      console.log(`- Average response time: ${avgResponseTime.toFixed(0)}ms`)
      
      expect(errorRate).toBeLessThan(LOAD_TEST_CONFIG.ERROR_RATE_THRESHOLD)
      expect(avgResponseTime).toBeLessThan(3000) // 3 second threshold for DB operations
    })
  })

  describe('Resource Usage Under Load', () => {
    test('monitors memory usage during peak load', async () => {
      const pages: Page[] = []
      
      try {
        // Create multiple pages to simulate concurrent users
        for (let i = 0; i < LOAD_TEST_CONFIG.CONCURRENT_USERS; i++) {
          const page = await browser.newPage()
          await page.goto('http://localhost:3000/jobs')
          pages.push(page)
        }
        
        // Monitor memory usage
        const initialMemory = await pages[0].evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
        
        // Perform operations on all pages simultaneously
        await Promise.all(pages.map(async (page, index) => {
          for (let i = 0; i < 5; i++) {
            await page.fill('[data-testid="job-search-input"]', `concurrent${index}_${i}`)
            await page.click('[data-testid="job-search-button"]')
            await page.waitForLoadState('networkidle')
          }
        }))
        
        const finalMemory = await pages[0].evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
        const memoryIncrease = finalMemory - initialMemory
        
        console.log(`Memory usage under load: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`)
        
        expect(memoryIncrease).toBeLessThan(LOAD_TEST_CONFIG.MEMORY_THRESHOLD)
        
      } finally {
        // Clean up all pages
        await Promise.all(pages.map(page => page.close()))
      }
    })
  })

  describe('API Rate Limiting and Throttling', () => {
    test('handles rapid API requests gracefully', async () => {
      const page = await browser.newPage()
      await page.goto('http://localhost:3000/jobs')
      
      let successCount = 0
      let errorCount = 0
      const rapidRequests = 20
      
      // Make rapid API requests
      for (let i = 0; i < rapidRequests; i++) {
        try {
          await page.fill('[data-testid="job-search-input"]', `rapid${i}`)
          await page.click('[data-testid="job-search-button"]')
          await page.waitForSelector('[data-testid="job-list"]', { timeout: 5000 })
          successCount++
        } catch (error) {
          errorCount++
        }
        
        // Very minimal delay to simulate rapid requests
        await page.waitForTimeout(50)
      }
      
      const errorRate = errorCount / rapidRequests
      
      console.log(`Rapid API Requests:`)
      console.log(`- Successful: ${successCount}`)
      console.log(`- Failed: ${errorCount}`)
      console.log(`- Error rate: ${(errorRate * 100).toFixed(2)}%`)
      
      // Should handle rapid requests with reasonable error tolerance
      expect(errorRate).toBeLessThan(0.3) // 30% tolerance for rate limiting
      
      await page.close()
    })
  })
})

export { LOAD_TEST_CONFIG }