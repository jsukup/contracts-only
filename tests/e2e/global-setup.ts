import { chromium, FullConfig } from '@playwright/test'
import { dbTestHelper } from '../setup/database-setup'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')

  // Setup test database
  try {
    await dbTestHelper.setupDatabase()
    console.log('✅ Test database setup complete')
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    // Continue with tests even if database setup fails (for local development)
  }

  // Create test users and data for E2E tests
  try {
    await setupE2ETestData()
    console.log('✅ E2E test data setup complete')
  } catch (error) {
    console.error('❌ Failed to setup E2E test data:', error)
  }

  // Warm up the application
  try {
    await warmupApplication()
    console.log('✅ Application warmup complete')
  } catch (error) {
    console.error('❌ Failed to warmup application:', error)
  }

  console.log('🎯 E2E test setup complete')
}

async function setupE2ETestData() {
  // Create test users for different scenarios
  const testUsers = [
    {
      id: 'e2e-employer-1',
      email: 'employer@e2e-test.com',
      name: 'E2E Test Employer',
      role: 'EMPLOYER',
    },
    {
      id: 'e2e-user-1',
      email: 'user@e2e-test.com',
      name: 'E2E Test User',
      role: 'USER',
    },
    {
      id: 'e2e-admin-1',
      email: 'admin@e2e-test.com',
      name: 'E2E Test Admin',
      role: 'ADMIN',
    },
  ]

  for (const userData of testUsers) {
    await dbTestHelper.createTestUser(userData)
  }

  // Create test jobs
  const testJobs = [
    {
      title: 'E2E_Senior Frontend Developer',
      company: 'E2E Test Company',
      location: 'Remote',
      is_remote: true,
      job_type: 'FULL_TIME',
      salary_min: 120000,
      salary_max: 150000,
      currency: 'USD',
      description: 'E2E test job for frontend developer position',
      requirements: 'React, TypeScript, 5+ years experience',
      poster_id: 'e2e-employer-1',
      is_active: true,
    },
    {
      title: 'E2E_Backend Engineer',
      company: 'E2E Backend Corp',
      location: 'San Francisco, CA',
      is_remote: false,
      job_type: 'CONTRACT',
      hourly_rate_min: 80,
      hourly_rate_max: 120,
      currency: 'USD',
      description: 'E2E test job for backend engineer position',
      requirements: 'Node.js, PostgreSQL, API development',
      poster_id: 'e2e-employer-1',
      is_active: true,
    },
  ]

  for (const jobData of testJobs) {
    await dbTestHelper.createTestJob(jobData)
  }

  // Create some test applications
  await dbTestHelper.createTestApplication('e2e-job-1', 'e2e-user-1', {
    status: 'PENDING',
    cover_letter: 'E2E test application cover letter',
  })
}

async function warmupApplication() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Visit key pages to warm up the application
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.goto('/jobs')
    await page.waitForLoadState('networkidle')

    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')

    console.log('✅ Application pages warmed up')
  } catch (error) {
    console.warn('⚠️ Application warmup failed:', error)
  } finally {
    await browser.close()
  }
}

export default globalSetup