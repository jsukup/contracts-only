// Performance tests for job posting form and submission workflow
// Measures form interaction responsiveness and submission performance

import { chromium, Browser, Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

const PERFORMANCE_THRESHOLDS = {
  FORM_LOAD_TIME: 2000, // 2 seconds
  FIELD_INTERACTION_TIME: 300, // 300ms
  FORM_VALIDATION_TIME: 500, // 500ms
  FORM_SUBMISSION_TIME: 5000, // 5 seconds
  PREVIEW_GENERATION_TIME: 1500, // 1.5 seconds
  SKILL_SELECTION_TIME: 200, // 200ms per skill
  FILE_UPLOAD_TIME: 3000 // 3 seconds
}

const TEST_JOB_DATA = {
  title: 'Performance Test Job',
  description: 'This is a test job for performance testing purposes. It includes a detailed description to test form handling with larger text content.',
  company: 'Test Corp',
  location: 'San Francisco, CA',
  hourlyRateMin: '80',
  hourlyRateMax: '120',
  contractDuration: '6 months',
  hoursPerWeek: '40',
  applicationUrl: 'https://example.com/apply',
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS']
}

describe('Job Posting Form Performance Tests', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await browser.newPage()
    
    // Set up performance monitoring
    await page.addInitScript(() => {
      window.__performanceMetrics = {
        formLoadTime: 0,
        fieldInteractionTimes: [],
        validationTimes: [],
        submissionTime: 0
      }
    })
  })

  afterAll(async () => {
    await browser.close()
  })

  beforeEach(async () => {
    // Navigate to job posting form
    await page.goto('http://localhost:3000/post-job')
    await page.waitForLoadState('networkidle')
  })

  describe('Form Loading Performance', () => {
    test(`job posting form loads within ${PERFORMANCE_THRESHOLDS.FORM_LOAD_TIME}ms`, async () => {
      const startTime = Date.now()
      
      await page.goto('http://localhost:3000/post-job')
      await page.waitForSelector('[data-testid="job-post-form"]')
      await page.waitForLoadState('networkidle')
      
      const endTime = Date.now()
      const loadTime = endTime - startTime
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_LOAD_TIME)
      
      // Verify all essential form elements are loaded
      await expect(page.locator('[data-testid="job-title-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="job-description-textarea"]')).toBeVisible()
      await expect(page.locator('[data-testid="company-input"]')).toBeVisible()
      
      console.log(`Form load time: ${loadTime}ms`)
    })
  })

  describe('Field Interaction Performance', () => {
    const fieldTests = [
      { field: 'job-title-input', testId: 'job-title-input', value: TEST_JOB_DATA.title },
      { field: 'company-input', testId: 'company-input', value: TEST_JOB_DATA.company },
      { field: 'location-input', testId: 'location-input', value: TEST_JOB_DATA.location },
      { field: 'hourly-rate-min-input', testId: 'hourly-rate-min-input', value: TEST_JOB_DATA.hourlyRateMin },
      { field: 'hourly-rate-max-input', testId: 'hourly-rate-max-input', value: TEST_JOB_DATA.hourlyRateMax }
    ]

    fieldTests.forEach(({ field, testId, value }) => {
      test(`${field} responds within ${PERFORMANCE_THRESHOLDS.FIELD_INTERACTION_TIME}ms`, async () => {
        const input = page.locator(`[data-testid="${testId}"]`)
        
        const startTime = Date.now()
        await input.click()
        await input.fill(value)
        const endTime = Date.now()
        
        const interactionTime = endTime - startTime
        expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FIELD_INTERACTION_TIME)
        
        // Verify value was set correctly
        await expect(input).toHaveValue(value)
        
        console.log(`${field} interaction: ${interactionTime}ms`)
      })
    })

    test(`job description textarea handles large text efficiently`, async () => {
      const largeDescription = TEST_JOB_DATA.description.repeat(10) // ~1000+ characters
      const textarea = page.locator('[data-testid="job-description-textarea"]')
      
      const startTime = Date.now()
      await textarea.click()
      await textarea.fill(largeDescription)
      const endTime = Date.now()
      
      const interactionTime = endTime - startTime
      expect(interactionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FIELD_INTERACTION_TIME * 3) // Allow more time for large text
      
      await expect(textarea).toHaveValue(largeDescription)
      
      console.log(`Large text input: ${interactionTime}ms, ${largeDescription.length} characters`)
    })
  })

  describe('Form Validation Performance', () => {
    test(`required field validation responds within ${PERFORMANCE_THRESHOLDS.FORM_VALIDATION_TIME}ms`, async () => {
      // Leave required field empty and try to submit
      await page.fill('[data-testid="job-title-input"]', '')
      
      const startTime = Date.now()
      await page.click('[data-testid="submit-job-button"]')
      
      // Wait for validation message to appear
      await page.waitForSelector('[data-testid="validation-error"]')
      const endTime = Date.now()
      
      const validationTime = endTime - startTime
      expect(validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_VALIDATION_TIME)
      
      // Verify validation message is displayed
      const errorMessage = page.locator('[data-testid="validation-error"]')
      await expect(errorMessage).toBeVisible()
      
      console.log(`Validation response: ${validationTime}ms`)
    })

    test(`URL validation responds quickly`, async () => {
      const invalidUrl = 'not-a-valid-url'
      const urlInput = page.locator('[data-testid="application-url-input"]')
      
      const startTime = Date.now()
      await urlInput.fill(invalidUrl)
      await urlInput.blur() // Trigger validation
      
      await page.waitForSelector('[data-testid="url-validation-error"]')
      const endTime = Date.now()
      
      const validationTime = endTime - startTime
      expect(validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_VALIDATION_TIME)
      
      console.log(`URL validation: ${validationTime}ms`)
    })

    test(`hourly rate validation responds quickly`, async () => {
      // Set min rate higher than max rate
      await page.fill('[data-testid="hourly-rate-min-input"]', '100')
      await page.fill('[data-testid="hourly-rate-max-input"]', '50')
      
      const startTime = Date.now()
      await page.locator('[data-testid="hourly-rate-max-input"]').blur()
      
      await page.waitForSelector('[data-testid="rate-validation-error"]')
      const endTime = Date.now()
      
      const validationTime = endTime - startTime
      expect(validationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_VALIDATION_TIME)
      
      console.log(`Rate validation: ${validationTime}ms`)
    })
  })

  describe('Skill Selection Performance', () => {
    test(`skill selection responds within ${PERFORMANCE_THRESHOLDS.SKILL_SELECTION_TIME}ms per skill`, async () => {
      const skillsContainer = page.locator('[data-testid="skills-selector"]')
      await skillsContainer.click()
      
      for (const skill of TEST_JOB_DATA.skills) {
        const startTime = Date.now()
        
        await page.click(`[data-testid="skill-option-${skill.toLowerCase()}"]`)
        await page.waitForSelector(`[data-testid="selected-skill-${skill.toLowerCase()}"]`)
        
        const endTime = Date.now()
        const selectionTime = endTime - startTime
        
        expect(selectionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SKILL_SELECTION_TIME)
        
        console.log(`Skill "${skill}" selection: ${selectionTime}ms`)
      }
      
      // Verify all skills were selected
      for (const skill of TEST_JOB_DATA.skills) {
        await expect(page.locator(`[data-testid="selected-skill-${skill.toLowerCase()}"]`)).toBeVisible()
      }
    })

    test(`skill search filtering performs efficiently`, async () => {
      const skillSearch = page.locator('[data-testid="skill-search-input"]')
      
      const startTime = Date.now()
      await skillSearch.fill('React')
      
      await page.waitForSelector('[data-testid="skill-option-react"]')
      const endTime = Date.now()
      
      const searchTime = endTime - startTime
      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SKILL_SELECTION_TIME)
      
      // Verify search results are filtered
      const visibleSkills = page.locator('[data-testid^="skill-option-"]:visible')
      const skillCount = await visibleSkills.count()
      expect(skillCount).toBeLessThan(10) // Should be filtered down
      
      console.log(`Skill search: ${searchTime}ms, ${skillCount} results`)
    })
  })

  describe('Form Submission Performance', () => {
    async function fillCompleteForm() {
      await page.fill('[data-testid="job-title-input"]', TEST_JOB_DATA.title)
      await page.fill('[data-testid="job-description-textarea"]', TEST_JOB_DATA.description)
      await page.fill('[data-testid="company-input"]', TEST_JOB_DATA.company)
      await page.fill('[data-testid="location-input"]', TEST_JOB_DATA.location)
      await page.fill('[data-testid="hourly-rate-min-input"]', TEST_JOB_DATA.hourlyRateMin)
      await page.fill('[data-testid="hourly-rate-max-input"]', TEST_JOB_DATA.hourlyRateMax)
      await page.fill('[data-testid="contract-duration-input"]', TEST_JOB_DATA.contractDuration)
      await page.fill('[data-testid="hours-per-week-input"]', TEST_JOB_DATA.hoursPerWeek)
      await page.fill('[data-testid="application-url-input"]', TEST_JOB_DATA.applicationUrl)
      
      // Add skills
      const skillsContainer = page.locator('[data-testid="skills-selector"]')
      await skillsContainer.click()
      for (const skill of TEST_JOB_DATA.skills) {
        await page.click(`[data-testid="skill-option-${skill.toLowerCase()}"]`)
      }
    }

    test(`form submission completes within ${PERFORMANCE_THRESHOLDS.FORM_SUBMISSION_TIME}ms`, async () => {
      await fillCompleteForm()
      
      const startTime = Date.now()
      await page.click('[data-testid="submit-job-button"]')
      
      // Wait for success message or redirect
      await page.waitForSelector('[data-testid="submission-success"]')
      const endTime = Date.now()
      
      const submissionTime = endTime - startTime
      expect(submissionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FORM_SUBMISSION_TIME)
      
      console.log(`Form submission: ${submissionTime}ms`)
    })

    test(`preview generation responds within ${PERFORMANCE_THRESHOLDS.PREVIEW_GENERATION_TIME}ms`, async () => {
      await fillCompleteForm()
      
      const startTime = Date.now()
      await page.click('[data-testid="preview-job-button"]')
      
      await page.waitForSelector('[data-testid="job-preview-modal"]')
      const endTime = Date.now()
      
      const previewTime = endTime - startTime
      expect(previewTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PREVIEW_GENERATION_TIME)
      
      // Verify preview content is populated
      await expect(page.locator('[data-testid="preview-job-title"]')).toHaveText(TEST_JOB_DATA.title)
      await expect(page.locator('[data-testid="preview-company"]')).toHaveText(TEST_JOB_DATA.company)
      
      console.log(`Preview generation: ${previewTime}ms`)
    })
  })

  describe('Form Responsiveness on Different Devices', () => {
    const devices = [
      { name: 'Mobile', viewport: { width: 375, height: 667 } },
      { name: 'Tablet', viewport: { width: 768, height: 1024 } },
      { name: 'Desktop', viewport: { width: 1920, height: 1080 } }
    ]

    devices.forEach(({ name, viewport }) => {
      test(`form performs well on ${name} viewport`, async () => {
        await page.setViewportSize(viewport)
        await page.goto('http://localhost:3000/post-job')
        
        const startTime = Date.now()
        await page.waitForSelector('[data-testid="job-post-form"]')
        await page.waitForLoadState('networkidle')
        
        // Test basic interactions
        await page.fill('[data-testid="job-title-input"]', 'Test Job')
        await page.fill('[data-testid="company-input"]', 'Test Company')
        
        const endTime = Date.now()
        const interactionTime = endTime - startTime
        
        // Mobile gets slightly more tolerance
        const threshold = name === 'Mobile' 
          ? PERFORMANCE_THRESHOLDS.FORM_LOAD_TIME * 1.5 
          : PERFORMANCE_THRESHOLDS.FORM_LOAD_TIME
          
        expect(interactionTime).toBeLessThan(threshold)
        
        console.log(`${name} form performance: ${interactionTime}ms`)
      })
    })
  })

  describe('Memory and Resource Management', () => {
    test('form does not cause memory leaks during repeated interactions', async () => {
      const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
      
      // Perform multiple form interactions
      for (let i = 0; i < 5; i++) {
        await fillCompleteForm()
        await page.click('[data-testid="clear-form-button"]')
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc()
        }
      })
      
      const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0)
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory should not increase by more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      
      console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })

    test('form handles rapid user input without performance degradation', async () => {
      const textarea = page.locator('[data-testid="job-description-textarea"]')
      
      const startTime = Date.now()
      
      // Simulate rapid typing
      for (let i = 0; i < 50; i++) {
        await textarea.type('Test content ', { delay: 10 })
      }
      
      const endTime = Date.now()
      const typingTime = endTime - startTime
      
      // Should handle rapid input efficiently
      expect(typingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FIELD_INTERACTION_TIME * 10)
      
      console.log(`Rapid typing performance: ${typingTime}ms`)
    })
  })
})

export { PERFORMANCE_THRESHOLDS }