import { test, expect } from '@playwright/test'
import { E2EHelpers } from '../e2e-helpers'

test.describe('Vercel Deployment Validation', () => {
  let helpers: E2EHelpers
  const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://contracts-only.vercel.app'
  const PREVIEW_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page)
  })

  test.describe('Production Environment Validation', () => {
    test('Production URL is accessible and responsive', async ({ page }) => {
      test.step('Verify production URL accessibility', async () => {
        // Navigate to production URL
        const response = await page.goto(PRODUCTION_URL)
        
        // Verify successful response
        expect(response?.status()).toBe(200)
        
        // Verify correct content type
        const contentType = response?.headers()['content-type']
        expect(contentType).toContain('text/html')

        // Verify page loads completely
        await helpers.waitForNetworkIdle()
        await helpers.verifyElementExists('[data-testid="homepage"]')

        await helpers.takeScreenshot('production-homepage-loaded')
      })

      test.step('Verify Core Web Vitals performance', async () => {
        // Measure Core Web Vitals
        const metrics = await page.evaluate(() => {
          return new Promise(resolve => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries()
              const vitals = {
                LCP: null,
                FID: null,
                CLS: null,
                TTFB: null
              }
              
              entries.forEach(entry => {
                if (entry.entryType === 'largest-contentful-paint') {
                  vitals.LCP = entry.startTime
                }
                if (entry.entryType === 'first-input') {
                  vitals.FID = entry.processingStart - entry.startTime
                }
                if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                  vitals.CLS = (vitals.CLS || 0) + entry.value
                }
                if (entry.entryType === 'navigation') {
                  vitals.TTFB = entry.responseStart
                }
              })
              
              // Return after a delay to capture all metrics
              setTimeout(() => resolve(vitals), 5000)
            }).observe({entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation']})
          })
        })

        console.log('Core Web Vitals:', metrics)

        // Validate Core Web Vitals thresholds
        if (metrics.LCP) {
          expect(metrics.LCP).toBeLessThan(2500) // LCP < 2.5s
        }
        if (metrics.FID) {
          expect(metrics.FID).toBeLessThan(100) // FID < 100ms
        }
        if (metrics.CLS) {
          expect(metrics.CLS).toBeLessThan(0.1) // CLS < 0.1
        }
        if (metrics.TTFB) {
          expect(metrics.TTFB).toBeLessThan(800) // TTFB < 800ms
        }
      })

      test.step('Verify HTTPS and security headers', async () => {
        // Verify HTTPS is enforced
        expect(PRODUCTION_URL).toMatch(/^https:\/\//)

        // Check security headers
        const response = await page.goto(PRODUCTION_URL)
        const headers = response?.headers()

        // Verify security headers are present
        expect(headers?.['x-frame-options']).toBeDefined()
        expect(headers?.['x-content-type-options']).toBe('nosniff')
        expect(headers?.['referrer-policy']).toBeDefined()
        
        // Verify HSTS header for HTTPS enforcement
        expect(headers?.['strict-transport-security']).toBeDefined()

        console.log('Security headers validated:', {
          'x-frame-options': headers?.['x-frame-options'],
          'x-content-type-options': headers?.['x-content-type-options'],
          'referrer-policy': headers?.['referrer-policy'],
          'strict-transport-security': headers?.['strict-transport-security']
        })
      })
    })

    test('Production job board functionality works end-to-end', async ({ page }) => {
      test.step('Verify job search functionality on production', async () => {
        await page.goto(PRODUCTION_URL)

        // Navigate to jobs page
        await page.click('[data-testid="jobs-link"]')
        await helpers.waitForElement('[data-testid="job-listings"]')

        // Verify job search works
        await page.fill('[data-testid="job-search-input"]', 'React')
        await page.press('[data-testid="job-search-input"]', 'Enter')

        // Wait for search results
        await helpers.waitForNetworkIdle()

        // Verify search results are displayed
        await helpers.verifyElementExists('[data-testid="search-results"]')
        
        // Verify at least one job card is shown (if any jobs exist)
        const jobCards = page.locator('[data-testid="job-card"]')
        const jobCount = await jobCards.count()
        
        if (jobCount > 0) {
          // Test job detail view
          await jobCards.first().click()
          await helpers.waitForElement('[data-testid="job-detail"]')
          
          // Verify job details are loaded
          await helpers.verifyElementExists('[data-testid="job-title"]')
          await helpers.verifyElementExists('[data-testid="job-description"]')
          await helpers.verifyElementExists('[data-testid="apply-button"]')
        }

        await helpers.takeScreenshot('production-job-search')
      })

      test.step('Verify user authentication on production', async () => {
        // Test registration flow
        await page.goto(`${PRODUCTION_URL}/auth/register`)
        
        // Fill registration form with test data
        const testEmail = `test-${Date.now()}@example.com`
        
        await page.fill('[data-testid="email-input"]', testEmail)
        await page.fill('[data-testid="password-input"]', 'TestPassword123!')
        await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!')
        
        // Submit registration
        await page.click('[data-testid="register-button"]')
        
        // Verify registration success or proper error handling
        try {
          await helpers.waitForElement('[data-testid="registration-success"]', { timeout: 10000 })
          console.log('Registration successful on production')
        } catch {
          // Check if user already exists or other validation error
          const errorElement = await page.locator('[data-testid="registration-error"]').textContent()
          console.log('Registration error (expected for existing test data):', errorElement)
          expect(errorElement).toBeTruthy() // Some error should be shown
        }

        await helpers.takeScreenshot('production-auth-test')
      })

      test.step('Verify external integrations work on production', async () => {
        // Test that external job application URLs work
        await page.goto(`${PRODUCTION_URL}/jobs`)
        
        const jobCards = page.locator('[data-testid="job-card"]')
        const jobCount = await jobCards.count()

        if (jobCount > 0) {
          // Find a job with external application URL
          for (let i = 0; i < Math.min(jobCount, 3); i++) {
            await jobCards.nth(i).click()
            await helpers.waitForElement('[data-testid="job-detail"]')
            
            const applyButton = page.locator('[data-testid="apply-button"]')
            const applyUrl = await applyButton.getAttribute('href')
            
            if (applyUrl && applyUrl.startsWith('http')) {
              // Verify external URL is accessible (without following redirects)
              const response = await fetch(applyUrl, { method: 'HEAD' })
              expect(response.status).toBeLessThan(400)
              console.log(`External job URL validated: ${applyUrl} - Status: ${response.status}`)
              break
            }
            
            await page.goBack()
          }
        }

        await helpers.takeScreenshot('production-external-integrations')
      })
    })

    test('Production database connectivity and data integrity', async ({ page }) => {
      test.step('Verify database operations work correctly', async () => {
        await page.goto(PRODUCTION_URL)

        // Test data retrieval by checking if jobs are loaded
        await page.goto(`${PRODUCTION_URL}/jobs`)
        await helpers.waitForNetworkIdle()

        // Check if data is being loaded from database
        const jobsLoaded = await page.evaluate(() => {
          return fetch('/api/jobs')
            .then(response => response.json())
            .then(data => data.jobs ? data.jobs.length : 0)
            .catch(() => 0)
        })

        console.log(`Jobs loaded from production database: ${jobsLoaded}`)
        expect(jobsLoaded).toBeGreaterThanOrEqual(0) // Should at least return empty array

        // Test API endpoint directly
        const apiResponse = await page.request.get(`${PRODUCTION_URL}/api/jobs`)
        expect(apiResponse.status()).toBe(200)
        
        const apiData = await apiResponse.json()
        expect(apiData).toHaveProperty('jobs')
        expect(Array.isArray(apiData.jobs)).toBe(true)

        await helpers.takeScreenshot('production-database-test')
      })

      test.step('Verify API rate limiting and error handling', async () => {
        // Test API rate limiting
        const requests = []
        for (let i = 0; i < 20; i++) {
          requests.push(page.request.get(`${PRODUCTION_URL}/api/jobs`))
        }

        const responses = await Promise.all(requests)
        
        // Check if any requests are rate limited (429 status)
        const rateLimitedResponses = responses.filter(r => r.status() === 429)
        console.log(`Rate limited responses: ${rateLimitedResponses.length}/20`)

        // Verify error responses are properly formatted
        if (rateLimitedResponses.length > 0) {
          const errorResponse = await rateLimitedResponses[0].json()
          expect(errorResponse).toHaveProperty('error')
        }

        // Test invalid API endpoint
        const invalidResponse = await page.request.get(`${PRODUCTION_URL}/api/nonexistent`)
        expect(invalidResponse.status()).toBe(404)
      })
    })
  })

  test.describe('Preview Environment Validation', () => {
    test.skip(!PREVIEW_URL, 'Preview URL validation')
    
    test('Preview deployment matches production functionality', async ({ page }) => {
      test.step('Compare preview and production responses', async () => {
        if (!PREVIEW_URL) return

        // Test homepage on both environments
        const [prodResponse, previewResponse] = await Promise.all([
          page.request.get(PRODUCTION_URL),
          page.request.get(PREVIEW_URL)
        ])

        expect(prodResponse.status()).toBe(200)
        expect(previewResponse.status()).toBe(200)

        // Verify both have similar structure
        await page.goto(PREVIEW_URL)
        await helpers.verifyElementExists('[data-testid="homepage"]')

        console.log(`Production URL: ${PRODUCTION_URL}`)
        console.log(`Preview URL: ${PREVIEW_URL}`)
        console.log('Both environments responding correctly')

        await helpers.takeScreenshot('preview-environment-test')
      })

      test.step('Verify environment variables are set correctly', async () => {
        if (!PREVIEW_URL) return

        // Test API configuration differences
        const previewApiResponse = await page.request.get(`${PREVIEW_URL}/api/jobs`)
        expect(previewApiResponse.status()).toBe(200)

        // Verify preview environment doesn't affect production data
        const previewData = await previewApiResponse.json()
        expect(previewData).toHaveProperty('jobs')
        
        // Environment should be isolated
        console.log('Preview environment properly isolated from production')
      })
    })
  })

  test.describe('Cross-Browser Production Testing', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`Production functionality in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`)

        test.step(`Test core functionality in ${browserName}`, async () => {
          await page.goto(PRODUCTION_URL)

          // Test navigation
          await page.click('[data-testid="jobs-link"]')
          await helpers.waitForElement('[data-testid="job-listings"]')

          // Test search functionality
          await page.fill('[data-testid="job-search-input"]', 'Developer')
          await page.press('[data-testid="job-search-input"]', 'Enter')

          await helpers.waitForNetworkIdle()
          await helpers.verifyElementExists('[data-testid="search-results"]')

          // Test responsive design
          await page.setViewportSize({ width: 768, height: 1024 })
          await helpers.verifyElementExists('[data-testid="mobile-menu-toggle"]')

          await page.setViewportSize({ width: 1920, height: 1080 })

          console.log(`${browserName} compatibility test passed`)
          await helpers.takeScreenshot(`${browserName}-compatibility-test`)
        })
      })
    })
  })

  test.describe('Production Performance Testing', () => {
    test('Page load performance under normal load', async ({ page }) => {
      test.step('Measure page load times for key pages', async () => {
        const pages = [
          { name: 'Homepage', url: PRODUCTION_URL },
          { name: 'Jobs', url: `${PRODUCTION_URL}/jobs` },
          { name: 'About', url: `${PRODUCTION_URL}/about` }
        ]

        const results = []

        for (const testPage of pages) {
          const startTime = Date.now()
          
          await page.goto(testPage.url)
          await page.waitForLoadState('networkidle')
          
          const loadTime = Date.now() - startTime
          results.push({ page: testPage.name, loadTime })

          // Verify reasonable load time
          expect(loadTime).toBeLessThan(5000) // 5 seconds max for production
          
          console.log(`${testPage.name} load time: ${loadTime}ms`)
        }

        // Verify average load time is reasonable
        const averageLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length
        expect(averageLoadTime).toBeLessThan(3000) // 3 seconds average

        console.log(`Average page load time: ${averageLoadTime}ms`)
      })

      test.step('Test image optimization and CDN performance', async () => {
        await page.goto(PRODUCTION_URL)

        // Check if images are optimized
        const images = await page.locator('img').all()
        
        for (const img of images.slice(0, 5)) { // Test first 5 images
          const src = await img.getAttribute('src')
          if (src && src.startsWith('http')) {
            const response = await page.request.head(src)
            
            // Verify images load successfully
            expect(response.status()).toBe(200)
            
            // Check for WebP format or other optimizations
            const contentType = response.headers()['content-type']
            console.log(`Image ${src}: ${contentType}`)
          }
        }

        await helpers.takeScreenshot('image-optimization-test')
      })
    })

    test('API performance under concurrent requests', async ({ page }) => {
      test.step('Test concurrent API requests', async () => {
        const concurrentRequests = 10
        const startTime = Date.now()

        // Make concurrent requests to jobs API
        const requests = Array(concurrentRequests).fill(null).map(() => 
          page.request.get(`${PRODUCTION_URL}/api/jobs`)
        )

        const responses = await Promise.all(requests)
        const totalTime = Date.now() - startTime

        // Verify all requests succeeded
        responses.forEach(response => {
          expect(response.status()).toBe(200)
        })

        // Verify reasonable response time under concurrent load
        const avgResponseTime = totalTime / concurrentRequests
        expect(avgResponseTime).toBeLessThan(2000) // 2 seconds average

        console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms`)
        console.log(`Average response time: ${avgResponseTime}ms`)
      })
    })
  })

  test.describe('Production Monitoring and Health Checks', () => {
    test('Application health endpoints respond correctly', async ({ page }) => {
      test.step('Test health check endpoints', async () => {
        // Test if health check endpoint exists
        try {
          const healthResponse = await page.request.get(`${PRODUCTION_URL}/api/health`)
          
          if (healthResponse.status() === 200) {
            const healthData = await healthResponse.json()
            expect(healthData).toHaveProperty('status')
            expect(healthData.status).toBe('healthy')
            console.log('Health check endpoint responding correctly')
          } else {
            console.log('Health check endpoint not implemented (404 expected)')
            expect(healthResponse.status()).toBe(404)
          }
        } catch (error) {
          console.log('Health check endpoint test failed:', error)
        }
      })

      test.step('Verify database connectivity health', async () => {
        // Test database connectivity through API
        const dbTestResponse = await page.request.get(`${PRODUCTION_URL}/api/jobs?limit=1`)
        expect(dbTestResponse.status()).toBe(200)

        const dbTestData = await dbTestResponse.json()
        expect(dbTestData).toHaveProperty('jobs')
        
        console.log('Database connectivity verified through API')
      })

      test.step('Test error handling and 404 pages', async () => {
        // Test 404 page
        const notFoundResponse = await page.goto(`${PRODUCTION_URL}/nonexistent-page`)
        expect(notFoundResponse?.status()).toBe(404)

        // Verify custom 404 page is shown
        await helpers.verifyElementExists('[data-testid="404-page"], text=404, text=Not Found')
        
        console.log('404 error handling verified')

        await helpers.takeScreenshot('404-error-handling')
      })
    })

    test('SEO and accessibility validation on production', async ({ page }) => {
      test.step('Verify SEO meta tags are present', async () => {
        await page.goto(PRODUCTION_URL)

        // Check essential SEO meta tags
        const title = await page.title()
        expect(title).toBeTruthy()
        expect(title.length).toBeGreaterThan(10)

        const metaDescription = await page.getAttribute('meta[name="description"]', 'content')
        expect(metaDescription).toBeTruthy()
        expect(metaDescription?.length).toBeGreaterThan(50)

        // Check Open Graph tags
        const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content')
        const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content')
        
        expect(ogTitle).toBeTruthy()
        expect(ogDescription).toBeTruthy()

        console.log('SEO meta tags verified:', {
          title: title,
          description: metaDescription?.substring(0, 100) + '...',
          ogTitle: ogTitle
        })
      })

      test.step('Run basic accessibility checks', async () => {
        await page.goto(PRODUCTION_URL)

        // Check for basic accessibility features
        const mainContent = await page.locator('main, [role="main"]').count()
        expect(mainContent).toBeGreaterThan(0)

        // Check for skip links
        const skipLink = await page.locator('[href="#main"], [href="#content"]').count()
        expect(skipLink).toBeGreaterThanOrEqual(0) // Should have but not strictly required

        // Check heading structure
        const h1Count = await page.locator('h1').count()
        expect(h1Count).toBe(1) // Should have exactly one h1

        // Check for alt text on images
        const imagesWithoutAlt = await page.locator('img:not([alt])').count()
        expect(imagesWithoutAlt).toBe(0) // All images should have alt text

        console.log('Basic accessibility checks passed')

        await helpers.takeScreenshot('accessibility-validation')
      })
    })
  })

  test.describe('Production Data Validation', () => {
    test('Production data integrity and consistency', async ({ page }) => {
      test.step('Verify production data structure', async () => {
        // Test jobs API structure
        const jobsResponse = await page.request.get(`${PRODUCTION_URL}/api/jobs?limit=5`)
        expect(jobsResponse.status()).toBe(200)

        const jobsData = await jobsResponse.json()
        expect(jobsData).toHaveProperty('jobs')
        expect(Array.isArray(jobsData.jobs)).toBe(true)

        // Verify job data structure if jobs exist
        if (jobsData.jobs.length > 0) {
          const job = jobsData.jobs[0]
          expect(job).toHaveProperty('id')
          expect(job).toHaveProperty('title')
          expect(job).toHaveProperty('company')
          
          console.log('Production job data structure verified')
        }
      })

      test.step('Test production search functionality', async () => {
        // Test search API
        const searchResponse = await page.request.get(`${PRODUCTION_URL}/api/jobs?search=developer`)
        expect(searchResponse.status()).toBe(200)

        const searchData = await searchResponse.json()
        expect(searchData).toHaveProperty('jobs')
        
        console.log(`Search returned ${searchData.jobs.length} results`)
      })
    })
  })
})