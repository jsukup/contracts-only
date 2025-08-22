import { test, expect } from '@playwright/test'
import { E2EHelpers, LoginPage, JobsPage, JobPostingPage, createE2EJobData } from '../e2e-helpers'
import { dbTestHelper } from '../../setup/database-setup'

test.describe('Complete Job Application Journey', () => {
  let helpers: E2EHelpers
  let loginPage: LoginPage
  let jobsPage: JobsPage
  let jobPostingPage: JobPostingPage

  test.beforeEach(async ({ page }) => {
    helpers = new E2EHelpers(page)
    loginPage = new LoginPage(page)
    jobsPage = new JobsPage(page)
    jobPostingPage = new JobPostingPage(page)
  })

  test('Complete employer-to-job-seeker flow', async ({ page }) => {
    // Test the complete flow from job posting to application

    test.step('Employer logs in and posts a job', async () => {
      // Login as employer
      await helpers.loginAsEmployer()
      
      // Verify employer dashboard
      await helpers.verifyElementExists('[data-testid="employer-dashboard"]')
      
      // Navigate to job posting
      await helpers.navigateToJobPosting()
      
      // Create a new job
      const jobData = createE2EJobData({
        title: 'E2E Senior React Developer',
        company: 'E2E Testing Corp',
        location: 'San Francisco, CA',
        description: 'We are looking for a senior React developer to join our innovative team.',
        requirements: 'React, TypeScript, Redux, 5+ years experience',
      })
      
      await helpers.postJob(jobData)
      
      // Verify job was created
      await helpers.navigateToJobs()
      await helpers.verifyElementExists(`text=${jobData.title}`)
      
      // Take screenshot of posted job
      await helpers.takeScreenshot('job-posted-by-employer')
      
      // Logout employer
      await helpers.logout()
    })

    test.step('Job seeker searches and views job', async () => {
      // Visit jobs page as anonymous user
      await helpers.navigateToJobs()
      
      // Search for the posted job
      await helpers.searchJobs('React Developer')
      
      // Verify job appears in search results
      await helpers.verifyElementExists('text=E2E Senior React Developer')
      
      // Click on job to view details
      await page.click('[data-testid="job-card"]:has-text("E2E Senior React Developer")')
      
      // Wait for job details page
      await page.waitForLoadState('networkidle')
      
      // Verify job details are displayed
      await helpers.verifyTextContent('[data-testid="job-title"]', 'E2E Senior React Developer')
      await helpers.verifyTextContent('[data-testid="job-company"]', 'E2E Testing Corp')
      await helpers.verifyElementExists('text=React, TypeScript, Redux')
      
      // Take screenshot of job details
      await helpers.takeScreenshot('job-details-view')
    })

    test.step('Anonymous user attempts to apply (should redirect to login)', async () => {
      // Try to apply without being logged in
      await page.click('[data-testid="apply-button"]')
      
      // Should redirect to login page
      await helpers.verifyURL('**/auth/signin')
      
      // Verify login prompt
      await helpers.verifyElementExists('text=Please sign in to apply for jobs')
    })

    test.step('User registers and completes application', async () => {
      // Register new user
      await page.click('text=Sign up')
      
      // Fill registration form
      await helpers.fillForm({
        name: 'Jane Applicant',
        email: 'jane.applicant@e2e-test.com',
        password: 'password123',
        confirmPassword: 'password123'
      })
      
      await helpers.submitForm()
      
      // Verify successful registration and automatic login
      await helpers.verifyURL('**/dashboard')
      await helpers.verifyElementExists('[data-testid="welcome-message"]')
      
      // Navigate back to the job
      await helpers.navigateToJobs()
      await helpers.searchJobs('React Developer')
      await page.click('[data-testid="job-card"]:has-text("E2E Senior React Developer")')
      
      // Now apply for the job
      await page.click('[data-testid="apply-button"]')
      
      // Fill application form
      await page.waitForSelector('[data-testid="application-form"]')
      
      await helpers.fillForm({
        coverLetter: 'I am very excited about this React developer position. I have 6 years of experience with React and TypeScript, and I am passionate about building user-friendly interfaces.',
      })
      
      // Upload resume (mock file upload)
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Mock resume content')
      })
      
      // Submit application
      await helpers.submitForm('[data-testid="submit-application"]')
      
      // Verify successful application
      await helpers.verifyElementExists('[data-testid="application-success"]')
      await helpers.verifyTextContent('[data-testid="success-message"]', 'Application submitted successfully!')
      
      // Take screenshot of success state
      await helpers.takeScreenshot('application-submitted')
      
      // Verify apply button is now disabled
      await helpers.verifyElementExists('[data-testid="application-status"]:has-text("Application Pending")')
    })

    test.step('User views application status in dashboard', async () => {
      // Navigate to user dashboard
      await page.click('[data-testid="dashboard-link"]')
      
      // Verify application appears in user's applications list
      await helpers.verifyElementExists('[data-testid="user-applications"]')
      await helpers.verifyElementExists('text=E2E Senior React Developer')
      await helpers.verifyElementExists('text=Pending')
      
      // Take screenshot of user dashboard
      await helpers.takeScreenshot('user-dashboard-with-application')
    })

    test.step('Employer reviews application', async () => {
      // Logout current user and login as employer
      await helpers.logout()
      await helpers.loginAsEmployer()
      
      // Navigate to employer dashboard
      await page.click('[data-testid="employer-dashboard-link"]')
      
      // Verify application appears in employer's applications list
      await helpers.verifyElementExists('[data-testid="job-applications"]')
      await helpers.verifyElementExists('text=Jane Applicant')
      await helpers.verifyElementExists('text=E2E Senior React Developer')
      
      // Click to view application details
      await page.click('[data-testid="application-card"]:has-text("Jane Applicant")')
      
      // Verify application details
      await helpers.verifyElementExists('[data-testid="application-details"]')
      await helpers.verifyTextContent('[data-testid="applicant-name"]', 'Jane Applicant')
      await helpers.verifyElementExists('text=I am very excited about this React developer position')
      
      // Take screenshot of application review
      await helpers.takeScreenshot('employer-reviewing-application')
    })

    test.step('Performance and accessibility validation', async () => {
      // Measure page load performance
      const loadTime = await helpers.measurePageLoadTime()
      expect(loadTime).toBeLessThan(3000) // Page should load within 3 seconds
      
      // Test on mobile viewport
      await helpers.setMobileViewport()
      await page.reload()
      await helpers.waitForNetworkIdle()
      
      // Verify mobile layout works
      await helpers.verifyElementExists('[data-testid="mobile-menu"]')
      
      // Check basic accessibility
      await helpers.checkAccessibility()
      
      // Reset to desktop view
      await helpers.setDesktopViewport()
    })
  })

  test('Job search and filtering flow', async ({ page }) => {
    test.step('Create multiple test jobs for filtering', async () => {
      // Login as employer and create multiple jobs
      await helpers.loginAsEmployer()
      
      const jobs = [
        createE2EJobData({
          title: 'E2E Frontend Developer',
          location: 'Remote',
          jobType: 'FULL_TIME',
        }),
        createE2EJobData({
          title: 'E2E Backend Engineer',
          location: 'New York, NY',
          jobType: 'CONTRACT',
        }),
        createE2EJobData({
          title: 'E2E Full Stack Developer',
          location: 'Remote',
          jobType: 'PART_TIME',
        }),
      ]
      
      for (const job of jobs) {
        await helpers.postJob(job)
      }
      
      await helpers.logout()
    })

    test.step('Test job search functionality', async () => {
      await helpers.navigateToJobs()
      
      // Search for frontend jobs
      await helpers.searchJobs('Frontend')
      
      // Verify only frontend job appears
      await helpers.verifyElementExists('text=E2E Frontend Developer')
      await helpers.verifyElementNotExists('text=E2E Backend Engineer')
      
      // Clear search and test location filter
      await page.fill('input[name="search"]', '')
      await page.press('input[name="search"]', 'Enter')
      
      // Filter by remote jobs
      await page.click('[data-testid="location-filter"]')
      await page.click('text=Remote')
      
      // Verify only remote jobs appear
      await helpers.verifyElementExists('text=E2E Frontend Developer')
      await helpers.verifyElementExists('text=E2E Full Stack Developer')
      await helpers.verifyElementNotExists('text=E2E Backend Engineer')
      
      // Test job type filter
      await page.click('[data-testid="job-type-filter"]')
      await page.click('text=Full-time')
      
      // Should only show full-time remote jobs
      await helpers.verifyElementExists('text=E2E Frontend Developer')
      await helpers.verifyElementNotExists('text=E2E Full Stack Developer')
    })

    test.step('Test pagination', async () => {
      // Clear all filters
      await page.click('[data-testid="clear-filters"]')
      
      // If there are many jobs, test pagination
      const jobCards = page.locator('[data-testid="job-card"]')
      const jobCount = await jobCards.count()
      
      if (jobCount >= 10) {
        // Verify pagination controls exist
        await helpers.verifyElementExists('[data-testid="pagination"]')
        
        // Click next page
        await page.click('[data-testid="next-page"]')
        
        // Verify page 2 loads
        await helpers.waitForNetworkIdle()
        await helpers.verifyElementExists('text=Page 2')
      }
    })
  })

  test('Error handling and edge cases', async ({ page }) => {
    test.step('Test network failure during job application', async () => {
      await helpers.loginAsUser()
      await helpers.navigateToJobs()
      
      // Find a job to apply to
      await page.click('[data-testid="job-card"]')
      await page.click('[data-testid="apply-button"]')
      
      // Fill application form
      await helpers.fillForm({
        coverLetter: 'Test application with network failure'
      })
      
      // Simulate network failure
      await page.route('**/api/applications', route => route.abort())
      
      // Submit application
      await helpers.submitForm('[data-testid="submit-application"]')
      
      // Verify error handling
      await helpers.verifyElementExists('[data-testid="error-message"]')
      await helpers.verifyTextContent('[data-testid="error-message"]', /network error|failed to submit/i)
    })

    test.step('Test duplicate application prevention', async () => {
      // Restore network
      await page.unroute('**/api/applications')
      
      // Mock API to return success
      await page.route('**/api/applications', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ application: { id: 'test-app-1', status: 'PENDING' } })
        })
      })
      
      // Submit application successfully
      await helpers.submitForm('[data-testid="submit-application"]')
      await helpers.verifyElementExists('[data-testid="application-success"]')
      
      // Try to apply again
      await page.reload()
      await page.click('[data-testid="apply-button"]')
      
      // Should show already applied status
      await helpers.verifyElementExists('text=You have already applied to this job')
    })
  })
})