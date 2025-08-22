import { test, expect } from '@playwright/test'
import { E2EHelpers, createE2EJobData } from '../e2e-helpers'
import { dbTestHelper } from '../../setup/database-setup'

test.describe('Comprehensive Job Posting & URL Linking', () => {
  let helpers: E2EHelpers

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page)
  })

  test.describe('Complete Job Posting Workflow', () => {
    test('Full job posting with external URL validation', async ({ page }) => {
      test.step('Employer authentication and navigation', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToJobPosting()
        
        // Verify job posting form is accessible
        await helpers.verifyElementExists('[data-testid="job-post-form"]')
        await helpers.verifyElementExists('input[name="title"]')
        await helpers.verifyElementExists('input[name="applicationUrl"]')
      })

      test.step('Complete job information collection', async () => {
        const jobData = createE2EJobData({
          title: 'Senior Full-Stack Developer - Remote',
          company: 'TechCorp Innovation Labs',
          location: 'Remote (US Eastern Time)',
          jobType: 'FULL_TIME',
          salaryMin: '120000',
          salaryMax: '160000',
          description: 'Join our dynamic team building cutting-edge web applications. We are looking for a senior developer with expertise in React, Node.js, and cloud technologies.',
          requirements: 'React, Node.js, TypeScript, AWS, 5+ years experience, strong communication skills',
          applicationUrl: 'https://techcorp.com/careers/senior-fullstack-remote-2024',
          benefits: 'Health insurance, 401k matching, unlimited PTO, remote work stipend',
          hoursPerWeek: '40',
          contractDuration: 'Permanent',
          startDate: '2024-03-01'
        })

        // Fill all required fields
        await helpers.fillForm({
          title: jobData.title,
          company: jobData.company, 
          location: jobData.location,
          description: jobData.description,
          requirements: jobData.requirements,
          applicationUrl: jobData.applicationUrl,
          benefits: jobData.benefits,
          hoursPerWeek: jobData.hoursPerWeek,
          salaryMin: jobData.salaryMin,
          salaryMax: jobData.salaryMax
        })

        // Select job type from dropdown
        await page.click('[data-testid="job-type-select"]')
        await page.click(`text=${jobData.jobType}`)

        // Set start date
        await page.fill('input[name="startDate"]', jobData.startDate)

        // Add skills/tags
        await page.fill('input[name="skills"]', 'React')
        await page.press('input[name="skills"]', 'Enter')
        await page.fill('input[name="skills"]', 'Node.js')
        await page.press('input[name="skills"]', 'Enter')
        await page.fill('input[name="skills"]', 'TypeScript')
        await page.press('input[name="skills"]', 'Enter')

        await helpers.takeScreenshot('job-posting-form-filled')
      })

      test.step('URL validation and accessibility testing', async () => {
        // Test URL validation in real-time
        const urlInput = page.locator('input[name="applicationUrl"]')
        
        // Test invalid URLs
        await urlInput.fill('invalid-url')
        await helpers.verifyElementExists('[data-testid="url-validation-error"]')
        await helpers.verifyTextContent('[data-testid="url-validation-error"]', /invalid url format/i)

        // Test valid but unreachable URL
        await urlInput.fill('https://nonexistent-domain-12345.com/careers')
        await page.blur('input[name="applicationUrl"]') // Trigger validation
        await helpers.waitForElement('[data-testid="url-accessibility-warning"]')

        // Test valid and accessible URL
        await urlInput.fill('https://techcorp.com/careers/senior-fullstack-remote-2024')
        await page.blur('input[name="applicationUrl"]')
        await helpers.waitForElement('[data-testid="url-validation-success"]')
        
        await helpers.takeScreenshot('url-validation-complete')
      })

      test.step('Preview functionality testing', async () => {
        // Click preview button
        await page.click('[data-testid="preview-job-button"]')
        
        // Verify preview modal/page opens
        await helpers.waitForElement('[data-testid="job-preview-modal"]')
        
        // Verify all information is displayed correctly
        await helpers.verifyTextContent('[data-testid="preview-title"]', 'Senior Full-Stack Developer - Remote')
        await helpers.verifyTextContent('[data-testid="preview-company"]', 'TechCorp Innovation Labs')
        await helpers.verifyTextContent('[data-testid="preview-location"]', 'Remote (US Eastern Time)')
        await helpers.verifyTextContent('[data-testid="preview-salary"]', '$120,000 - $160,000')
        
        // Verify external URL is correctly linked
        const externalLink = page.locator('[data-testid="preview-application-link"]')
        await expect(externalLink).toHaveAttribute('href', 'https://techcorp.com/careers/senior-fullstack-remote-2024')
        await expect(externalLink).toHaveAttribute('target', '_blank')
        await expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer')
        
        // Verify skills are displayed
        await helpers.verifyElementExists('text=React')
        await helpers.verifyElementExists('text=Node.js')
        await helpers.verifyElementExists('text=TypeScript')
        
        await helpers.takeScreenshot('job-preview-complete')
        
        // Close preview
        await page.click('[data-testid="close-preview-button"]')
      })

      test.step('Job submission and publication', async () => {
        // Submit the job posting
        await page.click('[data-testid="submit-job-button"]')
        
        // Verify submission success
        await helpers.waitForElement('[data-testid="job-submission-success"]')
        await helpers.verifyTextContent('[data-testid="success-message"]', /job posted successfully/i)
        
        // Verify redirect to job listing or employer dashboard
        await helpers.waitForNetworkIdle()
        await helpers.verifyURL('**/jobs/**')
        
        await helpers.takeScreenshot('job-submission-success')
      })

      test.step('Verify job appears in public listings', async () => {
        // Navigate to public job listings
        await helpers.navigateToJobs()
        
        // Search for the posted job
        await helpers.searchJobs('Senior Full-Stack Developer')
        
        // Verify job appears in results
        await helpers.verifyElementExists('text=Senior Full-Stack Developer - Remote')
        await helpers.verifyElementExists('text=TechCorp Innovation Labs')
        
        // Click on job to view details
        await page.click('[data-testid="job-card"]:has-text("Senior Full-Stack Developer - Remote")')
        
        // Verify all details are correctly displayed
        await helpers.waitForNetworkIdle()
        await helpers.verifyTextContent('[data-testid="job-title"]', 'Senior Full-Stack Developer - Remote')
        await helpers.verifyTextContent('[data-testid="job-company"]', 'TechCorp Innovation Labs')
        
        // Verify external application URL works
        const applyButton = page.locator('[data-testid="external-apply-button"]')
        await expect(applyButton).toHaveAttribute('href', 'https://techcorp.com/careers/senior-fullstack-remote-2024')
        
        await helpers.takeScreenshot('public-job-listing-verified')
      })
    })

    test('Job posting with missing required information', async ({ page }) => {
      test.step('Test form validation with missing fields', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToJobPosting()
        
        // Try to submit with minimal information
        await helpers.fillForm({
          title: 'Incomplete Job Posting',
        })
        
        await page.click('[data-testid="submit-job-button"]')
        
        // Verify validation errors
        await helpers.verifyElementExists('[data-testid="validation-error-company"]')
        await helpers.verifyElementExists('[data-testid="validation-error-location"]')
        await helpers.verifyElementExists('[data-testid="validation-error-description"]')
        
        await helpers.takeScreenshot('validation-errors-displayed')
      })

      test.step('Progressive form completion', async () => {
        // Fill required fields progressively and verify validation updates
        await helpers.fillForm({
          company: 'Test Company'
        })
        
        // Verify company validation error disappears
        await helpers.verifyElementNotExists('[data-testid="validation-error-company"]')
        
        await helpers.fillForm({
          location: 'Remote',
          description: 'This is a test job description that meets minimum requirements.'
        })
        
        // Verify remaining validations clear
        await helpers.verifyElementNotExists('[data-testid="validation-error-location"]')
        await helpers.verifyElementNotExists('[data-testid="validation-error-description"]')
        
        // Now form should be submittable
        await page.click('[data-testid="submit-job-button"]')
        await helpers.waitForElement('[data-testid="job-submission-success"]')
      })
    })

    test('External URL linking edge cases', async ({ page }) => {
      test.step('Test various URL formats and validation', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToJobPosting()
        
        const urlTestCases = [
          {
            url: 'https://company.com/jobs/123',
            expected: 'valid',
            description: 'Standard HTTPS URL'
          },
          {
            url: 'http://company.com/jobs/123',
            expected: 'warning',
            description: 'HTTP URL (should warn about security)'
          },
          {
            url: 'https://sub.domain.com/very/long/path/to/job?id=123&source=job-board',
            expected: 'valid',
            description: 'Complex URL with query parameters'
          },
          {
            url: 'invalid-url-format',
            expected: 'error',
            description: 'Invalid URL format'
          },
          {
            url: 'ftp://company.com/jobs',
            expected: 'error', 
            description: 'Non-HTTP protocol'
          },
          {
            url: 'javascript:alert("xss")',
            expected: 'error',
            description: 'JavaScript URL (security risk)'
          }
        ]

        for (const testCase of urlTestCases) {
          console.log(`Testing URL: ${testCase.description}`)
          
          await page.fill('input[name="applicationUrl"]', testCase.url)
          await page.blur('input[name="applicationUrl"]')
          
          if (testCase.expected === 'valid') {
            await helpers.verifyElementExists('[data-testid="url-validation-success"]')
          } else if (testCase.expected === 'warning') {
            await helpers.verifyElementExists('[data-testid="url-validation-warning"]')
          } else if (testCase.expected === 'error') {
            await helpers.verifyElementExists('[data-testid="url-validation-error"]')
          }
          
          await helpers.takeScreenshot(`url-validation-${testCase.expected}-${testCase.url.replace(/[^a-zA-Z0-9]/g, '-')}`)
        }
      })
    })
  })

  test.describe('Information Collection Completeness', () => {
    test('Verify all necessary job information is collected', async ({ page }) => {
      test.step('Test comprehensive information collection', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToJobPosting()
        
        // Verify all expected form fields are present
        const requiredFields = [
          'input[name="title"]',
          'input[name="company"]', 
          'input[name="location"]',
          'textarea[name="description"]',
          'textarea[name="requirements"]',
          'input[name="applicationUrl"]',
          'select[name="jobType"]',
          'input[name="salaryMin"]',
          'input[name="salaryMax"]',
          'input[name="startDate"]'
        ]

        for (const field of requiredFields) {
          await helpers.verifyElementExists(field)
        }

        // Verify optional but important fields
        const optionalFields = [
          'textarea[name="benefits"]',
          'input[name="hoursPerWeek"]',
          'input[name="contractDuration"]',
          'input[name="skills"]',
          'input[name="applicationEmail"]'
        ]

        for (const field of optionalFields) {
          await helpers.verifyElementExists(field)
        }

        await helpers.takeScreenshot('complete-form-fields-verified')
      })

      test.step('Test data persistence and retrieval', async () => {
        // Fill out comprehensive job information
        const completeJobData = {
          title: 'Data Persistence Test Job',
          company: 'Test Data Corp',
          location: 'San Francisco, CA',
          description: 'This job tests data persistence functionality.',
          requirements: 'Testing experience, attention to detail',
          applicationUrl: 'https://testdata.com/apply',
          benefits: 'Health, dental, vision insurance',
          hoursPerWeek: '40',
          salaryMin: '80000',
          salaryMax: '120000',
          startDate: '2024-04-01'
        }

        await helpers.fillForm(completeJobData)
        
        // Select job type
        await page.click('[data-testid="job-type-select"]')
        await page.click('text=FULL_TIME')

        // Submit job
        await page.click('[data-testid="submit-job-button"]')
        await helpers.waitForElement('[data-testid="job-submission-success"]')

        // Navigate away and back to verify data persistence
        await helpers.navigateToJobs()
        await helpers.searchJobs('Data Persistence Test Job')
        
        await page.click('[data-testid="job-card"]:has-text("Data Persistence Test Job")')
        
        // Verify all data was correctly saved and displayed
        await helpers.verifyTextContent('[data-testid="job-title"]', completeJobData.title)
        await helpers.verifyTextContent('[data-testid="job-company"]', completeJobData.company)
        await helpers.verifyTextContent('[data-testid="job-location"]', completeJobData.location)
        await helpers.verifyTextContent('[data-testid="job-description"]', completeJobData.description)
        await helpers.verifyTextContent('[data-testid="job-requirements"]', completeJobData.requirements)
        await helpers.verifyTextContent('[data-testid="job-salary"]', '$80,000 - $120,000')
        
        // Verify external URL is correctly linked
        const applicationLink = page.locator('[data-testid="external-apply-button"]')
        await expect(applicationLink).toHaveAttribute('href', completeJobData.applicationUrl)
      })
    })
  })

  test.describe('Performance and Accessibility', () => {
    test('Job posting performance validation', async ({ page }) => {
      test.step('Measure form interaction performance', async () => {
        await helpers.loginAsEmployer()
        
        const loadTime = await helpers.measurePageLoadTime()
        expect(loadTime).toBeLessThan(3000) // Page should load within 3 seconds
        
        await helpers.navigateToJobPosting()
        
        // Measure form interaction responsiveness
        const formFillTime = await helpers.measureInteractionTime(async () => {
          await helpers.fillForm({
            title: 'Performance Test Job',
            company: 'Speed Corp',
            location: 'Remote',
            description: 'Testing form performance with reasonable amount of text content.'
          })
        })
        
        expect(formFillTime).toBeLessThan(1000) // Form interactions should be under 1 second
      })

      test.step('Test form with large content', async () => {
        // Test with realistic large job descriptions
        const largeDescription = 'A'.repeat(5000) // 5KB description
        const largeRequirements = 'B'.repeat(3000) // 3KB requirements

        await helpers.fillForm({
          title: 'Large Content Test Job',
          company: 'Big Content Corp',
          location: 'Remote',
          description: largeDescription,
          requirements: largeRequirements
        })

        // Verify form handles large content gracefully
        await page.click('[data-testid="submit-job-button"]')
        await helpers.waitForElement('[data-testid="job-submission-success"]')
        
        // Verify performance is still acceptable
        const submitTime = await helpers.measureInteractionTime(async () => {
          await page.reload()
          await helpers.waitForNetworkIdle()
        })
        
        expect(submitTime).toBeLessThan(5000) // Large content should still load within 5 seconds
      })
    })

    test('Job posting accessibility validation', async ({ page }) => {
      test.step('Test form accessibility compliance', async () => {
        await helpers.loginAsEmployer()
        await helpers.navigateToJobPosting()
        
        // Run comprehensive accessibility check
        await helpers.checkAccessibility()
        
        // Test keyboard navigation
        await page.keyboard.press('Tab')
        await expect(page.locator('input[name="title"]')).toBeFocused()
        
        await page.keyboard.press('Tab')
        await expect(page.locator('input[name="company"]')).toBeFocused()
        
        // Test screen reader compatibility
        const titleInput = page.locator('input[name="title"]')
        await expect(titleInput).toHaveAttribute('aria-label')
        
        const submitButton = page.locator('[data-testid="submit-job-button"]')
        await expect(submitButton).toHaveAttribute('aria-describedby')
      })

      test.step('Test error message accessibility', async () => {
        // Trigger validation errors
        await page.click('[data-testid="submit-job-button"]')
        
        // Verify error messages are accessible
        const errorMessages = page.locator('[data-testid^="validation-error-"]')
        const errorCount = await errorMessages.count()
        
        for (let i = 0; i < errorCount; i++) {
          const errorElement = errorMessages.nth(i)
          await expect(errorElement).toHaveAttribute('role', 'alert')
          await expect(errorElement).toHaveAttribute('aria-live', 'polite')
        }
      })
    })
  })
})