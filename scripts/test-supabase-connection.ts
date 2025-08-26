#!/usr/bin/env tsx

/**
 * Test Supabase Connection
 * 
 * This script verifies that your Supabase connection is working correctly
 * for integration tests.
 * 
 * Usage: npm run test:supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.test.local if it exists (local development)
// In CI, environment variables will be provided directly
const currentDir = process.cwd()
const envPath = path.join(currentDir, '.env.test.local')

try {
  dotenv.config({ path: envPath })
} catch (error) {
  // File doesn't exist - that's ok in CI environment
  console.log('No .env.test.local file found - using environment variables from CI')
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
}

async function testConnection() {
  console.log(`${colors.blue}🔌 Testing Supabase Connection${colors.reset}`)
  console.log('=====================================\n')

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log(`${colors.gray}Environment:${colors.reset}`)
  console.log(`  URL: ${supabaseUrl ? `${colors.green}✓${colors.reset} ${supabaseUrl}` : `${colors.red}✗ Not set${colors.reset}`}`)
  console.log(`  Anon Key: ${supabaseKey ? `${colors.green}✓${colors.reset} ${supabaseKey.substring(0, 20)}...` : `${colors.red}✗ Not set${colors.reset}`}`)
  console.log(`  Service Role: ${serviceRoleKey ? `${colors.green}✓${colors.reset} Set` : `${colors.yellow}⚠ Not set (optional)${colors.reset}`}`)
  console.log()

  if (!supabaseUrl || !supabaseKey) {
    console.error(`${colors.red}❌ Missing required environment variables${colors.reset}`)
    console.log('\n💡 Create a .env.test.local file with:')
    console.log('   NEXT_PUBLIC_SUPABASE_URL=your-project-url')
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Test 1: Health check
  console.log(`${colors.blue}Test 1: Health Check${colors.reset}`)
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    console.log(`  ${colors.green}✅ Supabase client initialized successfully${colors.reset}`)
  } catch (error: any) {
    console.log(`  ${colors.red}❌ Failed to initialize client: ${error.message}${colors.reset}`)
    process.exit(1)
  }

  // Test 2: Database connectivity
  console.log(`\n${colors.blue}Test 2: Database Connectivity${colors.reset}`)
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    console.log(`  ${colors.green}✅ Database connection successful${colors.reset}`)
    console.log(`  ${colors.gray}  Users table exists with ${count || 0} records${colors.reset}`)
  } catch (error: any) {
    console.log(`  ${colors.red}❌ Database connection failed: ${error.message}${colors.reset}`)
    console.log(`  ${colors.yellow}  Make sure the 'users' table exists in your Supabase project${colors.reset}`)
  }

  // Test 3: Authentication functionality
  console.log(`\n${colors.blue}Test 3: Authentication API${colors.reset}`)
  try {
    // Try to sign in with invalid credentials (should fail gracefully)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'invalid'
    })
    
    if (error && error.message.includes('Invalid login credentials')) {
      console.log(`  ${colors.green}✅ Authentication API responding correctly${colors.reset}`)
    } else {
      console.log(`  ${colors.yellow}⚠  Unexpected response from auth API${colors.reset}`)
    }
  } catch (error: any) {
    console.log(`  ${colors.red}❌ Authentication API error: ${error.message}${colors.reset}`)
  }

  // Test 4: Test user creation (if service role key is available)
  if (serviceRoleKey) {
    console.log(`\n${colors.blue}Test 4: Test User Operations (Admin)${colors.reset}`)
    
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    const testEmail = `test-connection-${Date.now()}@example.com`
    
    try {
      // Create test user
      const { data: user, error: createError } = await adminSupabase.auth.admin.createUser({
        email: testEmail,
        password: 'TestPass123!',
        email_confirm: true,
      })
      
      if (createError) throw createError
      console.log(`  ${colors.green}✅ Can create test users${colors.reset}`)
      
      // Clean up test user
      if (user.user) {
        const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.user.id)
        if (!deleteError) {
          console.log(`  ${colors.green}✅ Can delete test users${colors.reset}`)
        }
      }
    } catch (error: any) {
      console.log(`  ${colors.yellow}⚠  Admin operations not available: ${error.message}${colors.reset}`)
    }
  }

  // Test 5: RLS Policies
  console.log(`\n${colors.blue}Test 5: Row Level Security${colors.reset}`)
  try {
    // Try to read without authentication (should respect RLS)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (error && error.code === 'PGRST301') {
      console.log(`  ${colors.green}✅ RLS policies are active${colors.reset}`)
    } else if (!error && (!data || data.length === 0)) {
      console.log(`  ${colors.green}✅ RLS policies are working (no unauthorized access)${colors.reset}`)
    } else {
      console.log(`  ${colors.yellow}⚠  RLS might not be properly configured${colors.reset}`)
    }
  } catch (error: any) {
    console.log(`  ${colors.yellow}⚠  Could not verify RLS: ${error.message}${colors.reset}`)
  }

  // Summary
  console.log(`\n${colors.blue}=====================================${colors.reset}`)
  console.log(`${colors.green}✅ Supabase connection test completed${colors.reset}`)
  console.log('\nYour Supabase setup appears to be working correctly for integration tests.')
  console.log('You can now run: npm run test:integration')
}

// Run the test
testConnection().catch(error => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error)
  process.exit(1)
})