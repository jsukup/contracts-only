#!/usr/bin/env tsx

/**
 * Manual script to clean up test users from Supabase
 * 
 * Usage:
 *   npm run cleanup-test-users
 *   
 * Or with specific patterns:
 *   npm run cleanup-test-users -- --pattern "test_%@%"
 */

import { cleanupTestUsers, verifyDatabaseClean } from '../tests/e2e/utils/database-cleanup'

async function main() {
  const args = process.argv.slice(2)
  const shouldVerify = !args.includes('--skip-verify')
  
  try {
    console.log('🚀 Starting manual test user cleanup...')
    
    if (shouldVerify) {
      console.log('📋 Checking current database state...')
      const isClean = await verifyDatabaseClean()
      
      if (isClean) {
        console.log('✅ Database is already clean. No cleanup needed.')
        process.exit(0)
      }
    }
    
    // Perform cleanup
    await cleanupTestUsers()
    
    // Verify cleanup was successful
    if (shouldVerify) {
      console.log('🔍 Verifying cleanup was successful...')
      const isNowClean = await verifyDatabaseClean()
      
      if (isNowClean) {
        console.log('🎉 Database cleanup successful!')
      } else {
        console.log('⚠️  Some test users may still remain. Check logs above.')
        process.exit(1)
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup script failed:', error)
    process.exit(1)
  }
}

// Handle script arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Manual Test User Cleanup Script

Usage:
  npm run cleanup-test-users              # Clean up and verify
  npm run cleanup-test-users -- --skip-verify    # Clean up without verification
  npm run cleanup-test-users -- --help           # Show this help

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL       # Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY      # Service role key for admin operations

This script will remove all users matching these patterns:
  - test_%@%
  - contractor_test_%@%  
  - recruiter_test_%@%
  - %@example.com
  - %@test.com
  - playwright_%@%
`)
  process.exit(0)
}

main()