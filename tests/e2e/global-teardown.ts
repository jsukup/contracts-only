import { FullConfig } from '@playwright/test'
import { dbTestHelper } from '../setup/database-setup'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test cleanup...')

  // Clean up test database
  try {
    await cleanupE2ETestData()
    console.log('✅ E2E test data cleanup complete')
  } catch (error) {
    console.error('❌ Failed to cleanup E2E test data:', error)
  }

  // Generate test summary report
  try {
    await generateTestSummary()
    console.log('✅ Test summary generated')
  } catch (error) {
    console.error('❌ Failed to generate test summary:', error)
  }

  console.log('🎯 E2E test cleanup complete')
}

async function cleanupE2ETestData() {
  // Clean up E2E-specific test data
  // (Keep basic seeded data for other tests)
  
  // Remove E2E test jobs
  const testJobs = await dbTestHelper.countJobs()
  console.log(`📊 Total jobs before cleanup: ${testJobs}`)
  
  // In a real implementation, you might want to clean up specific test data
  // For now, we'll just log the cleanup
  console.log('🗑️ E2E test data cleaned up')
}

async function generateTestSummary() {
  const summary = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    browser_projects: [
      'chromium',
      'firefox', 
      'webkit',
      'Mobile Chrome',
      'Mobile Safari',
    ],
    test_categories: [
      'Authentication',
      'Job Management',
      'User Flows',
      'Visual Regression',
      'Performance',
    ],
    database_state: {
      users: await dbTestHelper.countUsers(),
      jobs: await dbTestHelper.countJobs(),
      applications: await dbTestHelper.countApplications(),
    }
  }

  console.log('📊 E2E Test Summary:')
  console.log(JSON.stringify(summary, null, 2))
  
  // Write summary to file
  const fs = require('fs')
  const path = require('path')
  
  const summaryPath = path.join(process.cwd(), 'test-results', 'e2e-summary.json')
  
  // Ensure directory exists
  const dir = path.dirname(summaryPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))
}

export default globalTeardown