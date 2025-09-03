/**
 * Email Notification Test Script
 * 
 * This script allows you to test each type of email notification
 * with the test data created by seed-test-notifications.js
 */

require('dotenv').config()
// Using built-in fetch (Node.js 18+)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'Cn6JBJE+XRwsJCCKayQid7SylKlA+N2riKkyqmKNm1M='
const CRON_SECRET = process.env.CRON_SECRET || 'Ec74zlwojcbO9xpZGI5iIpQXTA+3GlOExF5LOYuizYU='

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testEndpoint(name, url, options = {}) {
  log(`\n📧 Testing: ${name}`, 'bright')
  log(`   URL: ${url}`, 'cyan')
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })
    
    const data = await response.json()
    
    if (response.ok) {
      log(`   ✅ Success: ${response.status}`, 'green')
      if (data.message) log(`   Message: ${data.message}`, 'green')
      if (data.processed !== undefined) log(`   Processed: ${data.processed} users`, 'green')
      if (data.emailsSent !== undefined) log(`   Emails sent: ${data.emailsSent}`, 'green')
      if (data.results) {
        log(`   Results:`, 'yellow')
        data.results.slice(0, 3).forEach(r => {
          log(`     - ${JSON.stringify(r)}`, 'yellow')
        })
        if (data.results.length > 3) {
          log(`     ... and ${data.results.length - 3} more`, 'yellow')
        }
      }
    } else {
      log(`   ❌ Error: ${response.status}`, 'red')
      log(`   ${JSON.stringify(data)}`, 'red')
    }
    
    return data
  } catch (error) {
    log(`   ❌ Failed: ${error.message}`, 'red')
    return null
  }
}

async function runTests() {
  log('\n🚀 ContractsOnly Email Notification Test Suite', 'bright')
  log('=' .repeat(50), 'blue')
  
  const tests = [
    {
      name: '1. Health Check - CRON System',
      run: async () => {
        await testEndpoint(
          'CRON Health Check',
          `${BASE_URL}/api/cron/notifications?health=true`,
          {
            headers: {
              'Authorization': `Bearer ${CRON_SECRET}`
            }
          }
        )
      }
    },
    
    {
      name: '2. Weekly Contractor Digest',
      run: async () => {
        log('\n📝 This will send personalized job recommendations to contractors', 'yellow')
        log('   Matching jobs from the past 7 days based on their skills', 'yellow')
        
        await testEndpoint(
          'Trigger Weekly Digest',
          `${BASE_URL}/api/notifications/weekly-digest`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ADMIN_SECRET}`
            },
            body: {
              testMode: true // Can be set to false to actually send emails
            }
          }
        )
      }
    },
    
    {
      name: '3. Recruiter Performance Reports',
      run: async () => {
        log('\n📊 This will send performance analytics to recruiters', 'yellow')
        log('   Including views, clicks, and application metrics', 'yellow')
        
        await testEndpoint(
          'Trigger Recruiter Reports',
          `${BASE_URL}/api/notifications/weekly-reports`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ADMIN_SECRET}`
            },
            body: {
              testMode: true
            }
          }
        )
      }
    },
    
    {
      name: '4. Application Status Update',
      run: async () => {
        log('\n🔔 This simulates updating an application status', 'yellow')
        log('   The applicant will receive an email notification', 'yellow')
        
        // You'll need to get an actual application ID from your database
        // This is just an example
        const applicationId = 'YOUR_APPLICATION_ID_HERE'
        
        if (applicationId === 'YOUR_APPLICATION_ID_HERE') {
          log('   ⚠️  Skipped: Replace YOUR_APPLICATION_ID_HERE with actual ID', 'yellow')
          return
        }
        
        await testEndpoint(
          'Update Application Status',
          `${BASE_URL}/api/applications/${applicationId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${ADMIN_SECRET}`
            },
            body: {
              status: 'INTERVIEW' // Can be: PENDING, REVIEWED, INTERVIEW, ACCEPTED, REJECTED
            }
          }
        )
      }
    },
    
    {
      name: '5. Manual CRON Trigger',
      run: async () => {
        log('\n⏰ This simulates the weekly CRON job', 'yellow')
        log('   Will process all scheduled notifications', 'yellow')
        
        await testEndpoint(
          'Manual CRON Trigger',
          `${BASE_URL}/api/cron/notifications`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CRON_SECRET}`
            }
          }
        )
      }
    },
    
    {
      name: '6. Marketing Campaign',
      run: async () => {
        log('\n📣 This will send a marketing campaign', 'yellow')
        log('   To users who have opted in for marketing emails', 'yellow')
        
        await testEndpoint(
          'Send Marketing Campaign',
          `${BASE_URL}/api/marketing/campaigns`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ADMIN_SECRET}`
            },
            body: {
              subject: 'New Features in ContractsOnly!',
              content: 'Check out our latest platform updates...',
              targetAudience: 'all', // or 'contractors', 'recruiters'
              testMode: true
            }
          }
        )
      }
    },
    
    {
      name: '7. System Monitoring',
      run: async () => {
        log('\n📈 Checking notification system health and metrics', 'yellow')
        
        await testEndpoint(
          'System Monitoring',
          `${BASE_URL}/api/notifications/monitoring`,
          {
            headers: {
              'Authorization': `Bearer ${ADMIN_SECRET}`
            }
          }
        )
      }
    },
    
    {
      name: '8. Test Specific User Match',
      run: async () => {
        log('\n🎯 Testing job matching for specific user', 'yellow')
        
        // Replace with actual user ID from your test data
        const userId = 'YOUR_TEST_USER_ID'
        
        if (userId === 'YOUR_TEST_USER_ID') {
          log('   ⚠️  Skipped: Replace YOUR_TEST_USER_ID with actual ID', 'yellow')
          return
        }
        
        await testEndpoint(
          'User Job Matches',
          `${BASE_URL}/api/matching/user/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${ADMIN_SECRET}`
            }
          }
        )
      }
    }
  ]
  
  // Interactive menu
  log('\n📋 Available Tests:', 'bright')
  tests.forEach((test, index) => {
    log(`   ${index + 1}. ${test.name}`, 'cyan')
  })
  log(`   9. Run All Tests`, 'cyan')
  log(`   0. Exit`, 'cyan')
  
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const runTest = async (choice) => {
    const index = parseInt(choice) - 1
    
    if (choice === '9') {
      log('\n🔄 Running all tests...', 'bright')
      for (const test of tests) {
        await test.run()
        await new Promise(resolve => setTimeout(resolve, 1000)) // Delay between tests
      }
    } else if (index >= 0 && index < tests.length) {
      await tests[index].run()
    } else if (choice === '0') {
      log('\n👋 Goodbye!', 'bright')
      rl.close()
      process.exit(0)
    } else {
      log('\n❌ Invalid choice', 'red')
    }
    
    // Show menu again
    rl.question('\n🔸 Choose test to run (1-9, 0 to exit): ', runTest)
  }
  
  rl.question('\n🔸 Choose test to run (1-9, 0 to exit): ', runTest)
}

// Check if running locally or on server
async function checkEnvironment() {
  log('\n🔍 Checking environment...', 'yellow')
  log(`   Base URL: ${BASE_URL}`, 'cyan')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth-check`)
    if (response.ok) {
      log('   ✅ Server is reachable', 'green')
      return true
    }
  } catch (error) {
    log(`   ⚠️  Server not reachable, make sure it's running`, 'yellow')
    log(`   Run: npm run dev`, 'yellow')
    return false
  }
}

async function main() {
  const isReady = await checkEnvironment()
  if (!isReady) {
    log('\n❌ Please start the development server first', 'red')
    process.exit(1)
  }
  
  await runTests()
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red')
  process.exit(1)
})

// Run the test suite
main()