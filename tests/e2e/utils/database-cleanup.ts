import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Clean up test users from the database
 * This function removes all users with test email patterns
 */
export async function cleanupTestUsers(): Promise<void> {
  try {
    console.log('🧹 Starting test user cleanup...')

    // Delete users with test email patterns
    const testEmailPatterns = [
      'test_%@%',
      'contractor_test_%@%',
      'recruiter_test_%@%',
      '%@example.com',
      '%@test.com',
      'playwright_%@%'
    ]

    let totalDeleted = 0

    for (const pattern of testEmailPatterns) {
      // First get the test users
      const { data: testUsers, error: fetchError } = await supabaseAdmin
        .from('auth.users')
        .select('id, email')
        .ilike('email', pattern)

      if (fetchError) {
        console.warn(`⚠️  Error fetching users for pattern ${pattern}:`, fetchError.message)
        continue
      }

      if (!testUsers || testUsers.length === 0) {
        console.log(`✅ No users found for pattern: ${pattern}`)
        continue
      }

      console.log(`🔍 Found ${testUsers.length} users matching pattern: ${pattern}`)

      // Delete each user using admin API
      for (const user of testUsers) {
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
          
          if (deleteError) {
            console.error(`❌ Failed to delete user ${user.email}:`, deleteError.message)
          } else {
            console.log(`✅ Deleted user: ${user.email}`)
            totalDeleted++
          }
        } catch (error) {
          console.error(`❌ Error deleting user ${user.email}:`, error)
        }
      }
    }

    console.log(`🎉 Cleanup completed. Deleted ${totalDeleted} test users.`)

  } catch (error) {
    console.error('❌ Database cleanup failed:', error)
    throw error
  }
}

/**
 * Clean up specific test user by email
 */
export async function cleanupTestUserByEmail(email: string): Promise<boolean> {
  try {
    // Get user by email
    const { data: user, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    if (fetchError || !user) {
      console.log(`ℹ️  No user found with email: ${email}`)
      return false
    }

    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error(`❌ Failed to delete user ${email}:`, deleteError.message)
      return false
    }

    console.log(`✅ Deleted test user: ${email}`)
    return true

  } catch (error) {
    console.error(`❌ Error cleaning up user ${email}:`, error)
    return false
  }
}

/**
 * Create a test user for testing purposes
 */
export async function createTestUser(
  email: string, 
  password: string, 
  userData?: { name?: string; role?: string }
): Promise<{ userId: string; email: string } | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        full_name: userData?.name || 'Test User',
        role: userData?.role || 'USER'
      }
    })

    if (error || !data.user) {
      console.error('❌ Failed to create test user:', error?.message)
      return null
    }

    console.log(`✅ Created test user: ${email}`)
    return {
      userId: data.user.id,
      email: data.user.email!
    }

  } catch (error) {
    console.error('❌ Error creating test user:', error)
    return null
  }
}

/**
 * Verify database is clean (no test users exist)
 */
export async function verifyDatabaseClean(): Promise<boolean> {
  try {
    const testEmailPatterns = [
      'test_%@%',
      '%@example.com',
      '%@test.com',
      'playwright_%@%'
    ]

    for (const pattern of testEmailPatterns) {
      const { count, error } = await supabaseAdmin
        .from('auth.users')
        .select('*', { count: 'exact', head: true })
        .ilike('email', pattern)

      if (error) {
        console.warn(`⚠️  Error checking pattern ${pattern}:`, error.message)
        continue
      }

      if (count && count > 0) {
        console.log(`❌ Database not clean: ${count} users found matching ${pattern}`)
        return false
      }
    }

    console.log('✅ Database is clean - no test users found')
    return true

  } catch (error) {
    console.error('❌ Error verifying database cleanliness:', error)
    return false
  }
}

/**
 * Generate unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${prefix}_${timestamp}_${random}@example.com`
}