#!/usr/bin/env node

/**
 * Test script for Clerk-Supabase authentication integration
 * 
 * This script tests:
 * 1. Webhook endpoint accessibility
 * 2. Profile creation API endpoint
 * 3. Authentication debug endpoint
 * 4. Environment configuration
 */

const https = require('https')
const http = require('http')
const { URL } = require('url')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env')
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key.trim()] = value.trim()
        }
      })
      console.log('✅ Loaded environment variables from .env file')
    } else {
      console.log('⚠️  No .env file found')
    }
  } catch (error) {
    console.log('❌ Error loading .env file:', error.message)
  }
}

// Load environment
loadEnvFile()

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

console.log('🔍 Testing Clerk-Supabase Authentication Integration')
console.log('=' * 60)
console.log(`Base URL: ${BASE_URL}`)
console.log(`Has Webhook Secret: ${!!WEBHOOK_SECRET}`)
console.log('')

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Clerk-Supabase-Test/1.0',
        ...options.headers
      }
    }

    const req = client.request(requestOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, headers: res.headers, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: data })
        }
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }

    req.end()
  })
}

// Test functions
async function testWebhookHealth() {
  console.log('🔗 Testing webhook endpoint health...')
  try {
    const response = await makeRequest(`${BASE_URL}/api/webhooks/clerk/test`)
    console.log(`   Status: ${response.status}`)
    if (response.status === 200) {
      console.log(`   ✅ Webhook endpoint is accessible`)
      console.log(`   Environment: ${JSON.stringify(response.data.environment, null, 2)}`)
    } else {
      console.log(`   ❌ Webhook endpoint returned ${response.status}`)
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`)
    }
  } catch (error) {
    console.log(`   ❌ Failed to connect to webhook endpoint: ${error.message}`)
  }
  console.log('')
}

async function testAuthDebug() {
  console.log('🔐 Testing authentication debug endpoint...')
  try {
    const response = await makeRequest(`${BASE_URL}/api/debug/auth`)
    console.log(`   Status: ${response.status}`)
    if (response.status === 200) {
      console.log(`   ✅ Auth debug endpoint is accessible`)
      console.log(`   Has User ID: ${response.data.authResult.hasUserId}`)
      console.log(`   Has Session ID: ${response.data.authResult.hasSessionId}`)
      console.log(`   Environment valid: ${response.data.environment.hasClerkSecretKey}`)
      console.log(`   Cookie count: ${response.data.cookies.cookieCount}`)
      console.log(`   Clerk cookies: ${response.data.cookies.clerkCookies.length}`)
    } else {
      console.log(`   ❌ Auth debug endpoint returned ${response.status}`)
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`)
    }
  } catch (error) {
    console.log(`   ❌ Failed to connect to auth debug endpoint: ${error.message}`)
  }
  console.log('')
}

async function testProfileCreation() {
  console.log('👤 Testing profile creation endpoint (without auth)...')
  try {
    const response = await makeRequest(`${BASE_URL}/api/profile/create`, {
      method: 'POST',
      body: { role: 'USER' }
    })
    console.log(`   Status: ${response.status}`)
    if (response.status === 401) {
      console.log(`   ✅ Profile creation properly requires authentication`)
      console.log(`   Error: ${response.data.error}`)
      if (response.data.requestId) {
        console.log(`   Request ID: ${response.data.requestId} (check server logs)`)
      }
    } else {
      console.log(`   ⚠️  Unexpected response from profile creation`)
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`)
    }
  } catch (error) {
    console.log(`   ❌ Failed to connect to profile creation endpoint: ${error.message}`)
  }
  console.log('')
}

async function testWebhookDelivery() {
  console.log('📧 Testing webhook delivery simulation...')
  
  if (!WEBHOOK_SECRET) {
    console.log('   ⚠️  No CLERK_WEBHOOK_SECRET found, skipping webhook delivery test')
    console.log('')
    return
  }
  
  // This would require implementing webhook signature generation
  // For now, just indicate what should be tested manually
  console.log('   ℹ️  Manual testing required:')
  console.log('   1. Go to Clerk Dashboard > Webhooks')
  console.log(`   2. Add webhook endpoint: ${BASE_URL}/api/webhooks/clerk`)
  console.log('   3. Subscribe to user.created, user.updated, user.deleted events')
  console.log('   4. Test webhook delivery using Clerk\'s testing tool')
  console.log('')
}

async function runTests() {
  console.log('Starting integration tests...\n')
  
  await testWebhookHealth()
  await testAuthDebug()  
  await testProfileCreation()
  await testWebhookDelivery()
  
  console.log('🎯 Integration test summary:')
  console.log('   - Check server logs for detailed debugging information')
  console.log('   - Look for request IDs in the logs to trace specific requests')
  console.log('   - Webhook logs will have [WEBHOOK-xxxxx] prefixes')
  console.log('   - Profile creation logs will have [xxxxxxx] prefixes')
  console.log('')
  console.log('📝 Next steps:')
  console.log('   1. Start your development server: npm run dev')
  console.log('   2. Run this test: node scripts/test-auth-integration.js')
  console.log('   3. Check the server console for detailed logging')
  console.log('   4. Configure webhook in Clerk Dashboard if needed')
}

// Run tests
runTests().catch(console.error)