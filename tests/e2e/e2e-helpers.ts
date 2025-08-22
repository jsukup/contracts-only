import { Page, expect, Locator } from '@playwright/test'
import { dbTestHelper } from '../setup/database-setup'

// E2E Test Helpers
export class E2EHelpers {
  constructor(private page: Page) {}

  // Authentication helpers
  async loginAsUser(email = 'user@e2e-test.com', password = 'password123') {
    await this.page.goto('/auth/signin')
    
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    
    // Wait for successful login (redirect to dashboard)
    await this.page.waitForURL('**/dashboard')
    
    // Verify login was successful
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible()
  }

  async loginAsEmployer(email = 'employer@e2e-test.com', password = 'password123') {
    await this.page.goto('/auth/signin')
    
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    
    // Wait for successful login
    await this.page.waitForURL('**/employer/dashboard')
    
    // Verify employer dashboard is loaded
    await expect(this.page.locator('[data-testid="employer-dashboard"]')).toBeVisible()
  }

  async loginAsAdmin(email = 'admin@e2e-test.com', password = 'password123') {
    await this.page.goto('/auth/signin')
    
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    await this.page.click('button[type="submit"]')
    
    // Wait for successful login
    await this.page.waitForURL('**/admin')
    
    // Verify admin panel is loaded
    await expect(this.page.locator('[data-testid="admin-panel"]')).toBeVisible()
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    
    // Wait for redirect to home page
    await this.page.waitForURL('/')
  }

  // Navigation helpers
  async navigateToJobs() {
    await this.page.goto('/jobs')
    await this.page.waitForLoadState('networkidle')
    
    // Verify jobs page loaded
    await expect(this.page.locator('[data-testid="jobs-list"]')).toBeVisible()
  }

  async navigateToJobPosting() {
    await this.page.goto('/jobs/post')
    await this.page.waitForLoadState('networkidle')
    
    // Verify job posting form is loaded
    await expect(this.page.locator('[data-testid="job-post-form"]')).toBeVisible()
  }

  async navigateToProfile() {
    await this.page.goto('/profile')
    await this.page.waitForLoadState('networkidle')
    
    // Verify profile page loaded
    await expect(this.page.locator('[data-testid="user-profile"]')).toBeVisible()
  }

  // Job-related helpers
  async postJob(jobData: {
    title: string
    company: string
    location: string
    jobType?: string
    salaryMin?: string
    salaryMax?: string
    description?: string
    requirements?: string
  }) {
    await this.navigateToJobPosting()
    
    // Fill job posting form
    await this.page.fill('input[name="title"]', jobData.title)
    await this.page.fill('input[name="company"]', jobData.company)
    await this.page.fill('input[name="location"]', jobData.location)
    
    if (jobData.jobType) {
      await this.page.selectOption('select[name="jobType"]', jobData.jobType)
    }
    
    if (jobData.salaryMin) {
      await this.page.fill('input[name="salaryMin"]', jobData.salaryMin)
    }
    
    if (jobData.salaryMax) {
      await this.page.fill('input[name="salaryMax"]', jobData.salaryMax)
    }
    
    if (jobData.description) {
      await this.page.fill('textarea[name="description"]', jobData.description)
    }
    
    if (jobData.requirements) {
      await this.page.fill('textarea[name="requirements"]', jobData.requirements)
    }
    
    // Submit the form
    await this.page.click('button[type="submit"]')
    
    // Wait for success message
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
    
    // Return to jobs list to verify job was created
    await this.navigateToJobs()
    await expect(this.page.locator(`text=${jobData.title}`)).toBeVisible()
  }

  async searchJobs(searchTerm: string) {
    await this.navigateToJobs()
    
    // Use the search functionality
    await this.page.fill('input[name="search"]', searchTerm)
    await this.page.press('input[name="search"]', 'Enter')
    
    // Wait for search results
    await this.page.waitForLoadState('networkidle')
  }

  async applyToJob(jobTitle: string, coverLetter?: string) {
    await this.navigateToJobs()
    
    // Find and click on the specific job
    await this.page.click(`[data-testid="job-card"]:has-text("${jobTitle}")`)
    
    // Wait for job details page
    await this.page.waitForLoadState('networkidle')
    
    // Click apply button
    await this.page.click('[data-testid="apply-button"]')
    
    // Fill application form
    if (coverLetter) {
      await this.page.fill('textarea[name="coverLetter"]', coverLetter)
    }
    
    // Submit application
    await this.page.click('button[type="submit"]')
    
    // Wait for success confirmation
    await expect(this.page.locator('[data-testid="application-success"]')).toBeVisible()
  }

  // Form helpers
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`[name="${field}"]`)
      const tagName = await input.evaluate(el => el.tagName.toLowerCase())
      
      if (tagName === 'select') {
        await input.selectOption(value)
      } else if (tagName === 'textarea') {
        await input.fill(value)
      } else {
        await input.fill(value)
      }
    }
  }

  async submitForm(submitButtonSelector = 'button[type="submit"]') {
    await this.page.click(submitButtonSelector)
  }

  // Verification helpers
  async verifyPageTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(expectedTitle)
  }

  async verifyURL(expectedURL: string) {
    await this.page.waitForURL(expectedURL)
  }

  async verifyElementExists(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible()
  }

  async verifyElementNotExists(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible()
  }

  async verifyTextContent(selector: string, expectedText: string) {
    await expect(this.page.locator(selector)).toHaveText(expectedText)
  }

  async verifyElementCount(selector: string, expectedCount: number) {
    await expect(this.page.locator(selector)).toHaveCount(expectedCount)
  }

  // Wait helpers
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout })
  }

  async waitForElementToDisappear(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'hidden', timeout })
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle')
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` })
  }

  async takeFullPageScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-fullpage.png`,
      fullPage: true 
    })
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const start = Date.now()
    await this.page.waitForLoadState('networkidle')
    return Date.now() - start
  }

  async measureInteractionTime(action: () => Promise<void>): Promise<number> {
    const start = Date.now()
    await action()
    return Date.now() - start
  }

  // Accessibility helpers
  async checkAccessibility() {
    // This would integrate with axe-core or similar
    // For now, we'll do basic accessibility checks
    
    // Check for missing alt text
    const images = this.page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      expect(alt).not.toBeNull()
    }
    
    // Check for proper heading structure
    const h1Count = await this.page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
    expect(h1Count).toBeLessThanOrEqual(1)
  }

  // Mobile helpers
  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 })
  }

  async setTabletViewport() {
    await this.page.setViewportSize({ width: 768, height: 1024 })
  }

  async setDesktopViewport() {
    await this.page.setViewportSize({ width: 1920, height: 1080 })
  }
}

// Page Object Models
export class LoginPage {
  constructor(private page: Page) {}

  get emailInput() { return this.page.locator('input[name="email"]') }
  get passwordInput() { return this.page.locator('input[name="password"]') }
  get submitButton() { return this.page.locator('button[type="submit"]') }
  get errorMessage() { return this.page.locator('[data-testid="error-message"]') }

  async goto() {
    await this.page.goto('/auth/signin')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}

export class JobsPage {
  constructor(private page: Page) {}

  get jobsList() { return this.page.locator('[data-testid="jobs-list"]') }
  get searchInput() { return this.page.locator('input[name="search"]') }
  get filterButtons() { return this.page.locator('[data-testid="filter-button"]') }
  get jobCards() { return this.page.locator('[data-testid="job-card"]') }

  async goto() {
    await this.page.goto('/jobs')
  }

  async search(term: string) {
    await this.searchInput.fill(term)
    await this.searchInput.press('Enter')
    await this.page.waitForLoadState('networkidle')
  }

  async getJobCard(title: string) {
    return this.page.locator(`[data-testid="job-card"]:has-text("${title}")`)
  }
}

export class JobPostingPage {
  constructor(private page: Page) {}

  get titleInput() { return this.page.locator('input[name="title"]') }
  get companyInput() { return this.page.locator('input[name="company"]') }
  get locationInput() { return this.page.locator('input[name="location"]') }
  get descriptionTextarea() { return this.page.locator('textarea[name="description"]') }
  get submitButton() { return this.page.locator('button[type="submit"]') }

  async goto() {
    await this.page.goto('/jobs/post')
  }

  async createJob(jobData: any) {
    await this.titleInput.fill(jobData.title)
    await this.companyInput.fill(jobData.company)
    await this.locationInput.fill(jobData.location)
    
    if (jobData.description) {
      await this.descriptionTextarea.fill(jobData.description)
    }
    
    await this.submitButton.click()
  }
}

// Test data factories for E2E tests
export const createE2EJobData = (overrides: any = {}) => ({
  title: 'E2E Test Job',
  company: 'E2E Test Company',
  location: 'Remote',
  jobType: 'FULL_TIME',
  salaryMin: '80000',
  salaryMax: '120000',
  description: 'This is a test job created during E2E testing',
  requirements: 'React, TypeScript, Jest',
  ...overrides,
})

export const createE2EUserData = (overrides: any = {}) => ({
  name: 'E2E Test User',
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'password123',
  role: 'USER',
  ...overrides,
})