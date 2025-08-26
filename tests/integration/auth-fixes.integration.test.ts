/**
 * Authentication Fixes Integration Tests
 * 
 * This test validates the specific authentication fixes we implemented:
 * - maybeSingle() vs single() to prevent 406 errors
 * - upsert() vs insert() to prevent 409 conflicts
 * - OAuth role selection updates
 * - Proper error handling
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.test.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const canRunTests = supabaseUrl && supabaseKey
const hasAdminAccess = canRunTests && serviceRoleKey

console.log(`Test environment: URL=${!!supabaseUrl}, Key=${!!supabaseKey}, Admin=${hasAdminAccess}`)

// Only run tests if environment is properly configured
const describeOrSkip = canRunTests ? describe : describe.skip

describeOrSkip('Authentication Fixes Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let adminSupabase: ReturnType<typeof createClient> | null = null
  const testUsers: Array<{ email: string; id?: string }> = []

  beforeAll(() => {
    if (canRunTests) {
      supabase = createClient(supabaseUrl!, supabaseKey!)
      if (hasAdminAccess) {
        adminSupabase = createClient(supabaseUrl!, serviceRoleKey!)
      }
      console.log('✅ Supabase clients initialized')
    }
  }, 30000)

  afterAll(async () => {
    if (!hasAdminAccess || !adminSupabase) return
    
    // Cleanup test users using admin client
    for (const user of testUsers) {
      if (user.id) {
        try {
          // Delete from users table
          await adminSupabase
            .from('users')
            .delete()
            .eq('id', user.id)
          
          // Delete auth user if it exists
          try {
            await adminSupabase.auth.admin.deleteUser(user.id)
          } catch (error) {
            // Ignore if user doesn't exist in auth
          }
        } catch (error) {
          console.warn(`Cleanup warning for ${user.email}:`, error)
        }
      }
    }
    console.log('🧹 Test cleanup completed')
  }, 30000)

  describe('Fix for 406 HTTP Errors (maybeSingle vs single)', () => {
    test('should return null without error when querying non-existent records', async () => {
      const nonExistentId = 'non-existent-uuid-12345'

      // This would previously cause 406 errors with single()
      // Now using maybeSingle() should return null gracefully
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', nonExistentId)
        .maybeSingle()

      expect(error).toBeNull()
      expect(data).toBeNull()
    })

    test('should return data when record exists', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping test - admin access required')
        return
      }

      const testEmail = `test-maybe-single-${Date.now()}@example.com`
      const testId = `test-user-${Date.now()}`
      testUsers.push({ email: testEmail, id: testId })

      // Create a test record using admin client
      const { data: created, error: createError } = await adminSupabase!
        .from('users')
        .insert({
          id: testId,
          email: testEmail,
          name: 'Maybe Single Test User',
          role: 'USER',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(created).not.toBeNull()

      // Query the created record with maybeSingle
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', testId)
        .maybeSingle()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data?.id).toBe(testId)
    })
  })

  describe('Fix for 409 HTTP Conflicts (upsert vs insert)', () => {
    test('should handle multiple upsert operations without conflicts', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping test - admin access required')
        return
      }

      const testEmail = `test-upsert-${Date.now()}@example.com`
      const testId = `test-upsert-user-${Date.now()}`
      testUsers.push({ email: testEmail, id: testId })

      const userData = {
        id: testId,
        email: testEmail,
        name: 'Upsert Test User',
        role: 'USER' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // First upsert - should create the record
      const { data: firstResult, error: firstError } = await adminSupabase!
        .from('users')
        .upsert(userData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      expect(firstError).toBeNull()
      expect(firstResult).not.toBeNull()

      // Second upsert - should update the existing record (no 409 conflict)
      const { data: secondResult, error: secondError } = await adminSupabase!
        .from('users')
        .upsert({
          ...userData,
          name: 'Updated Upsert Test User',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      expect(secondError).toBeNull()
      expect(secondResult).not.toBeNull()
      expect(secondResult.id).toBe(firstResult.id)
      expect(secondResult.name).toBe('Updated Upsert Test User')
    })
  })

  describe('OAuth Role Selection Updates', () => {
    test('should allow role updates without conflicts', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping test - admin access required')
        return
      }

      const testEmail = `test-role-update-${Date.now()}@example.com`
      const testId = `test-role-user-${Date.now()}`
      testUsers.push({ email: testEmail, id: testId })

      // Create user with initial role
      const { data: user, error: createError } = await adminSupabase!
        .from('users')
        .insert({
          id: testId,
          email: testEmail,
          name: 'Role Update Test User',
          role: 'USER',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(user?.role).toBe('USER')

      // Update role to RECRUITER (simulating OAuth role selection)
      const { data: updatedUser, error: updateError } = await adminSupabase!
        .from('users')
        .update({ 
          role: 'RECRUITER',
          updated_at: new Date().toISOString() 
        })
        .eq('id', testId)
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updatedUser?.role).toBe('RECRUITER')

      // Verify the change persisted
      const { data: verifiedUser } = await adminSupabase!
        .from('users')
        .select('role')
        .eq('id', testId)
        .single()
      
      expect(verifiedUser?.role).toBe('RECRUITER')
    })
  })

  describe('Error Handling Improvements', () => {
    test('should handle invalid login attempts gracefully', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'invalid-password'
      })

      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/invalid.*credentials/i)
    })

    test('should enforce database constraints properly', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping test - admin access required')
        return
      }

      const testId = `test-invalid-role-${Date.now()}`
      
      // Try to create user with invalid role
      const { error } = await adminSupabase!
        .from('users')
        .insert({
          id: testId,
          email: `invalid-role-${Date.now()}@example.com`,
          name: 'Invalid Role Test',
          role: 'INVALID_ROLE' as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      // Should fail due to enum constraint
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/invalid|constraint|enum/i)
    })
  })

  describe('Session and Authentication State', () => {
    test('should retrieve session state safely', async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      expect(error).toBeNull()
      // Session should be null for anonymous access
      expect(session).toBeNull()
    })

    test('should handle sign out operations', async () => {
      // Sign out should not error even if no user is signed in
      const { error } = await supabase.auth.signOut()
      
      expect(error).toBeNull()
    })
  })

  describe('Memory Leak Prevention', () => {
    test('should handle concurrent operations safely', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping test - admin access required')
        return
      }

      const testEmail = `test-concurrent-${Date.now()}@example.com`
      const testId = `test-concurrent-user-${Date.now()}`
      testUsers.push({ email: testEmail, id: testId })

      const baseData = {
        id: testId,
        email: testEmail,
        name: 'Concurrent Test User',
        role: 'USER' as const,
        created_at: new Date().toISOString(),
      }

      // Run multiple upsert operations concurrently
      const operations = Array.from({ length: 3 }, (_, i) =>
        adminSupabase!
          .from('users')
          .upsert({
            ...baseData,
            updated_at: new Date(Date.now() + i * 100).toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()
      )

      const results = await Promise.allSettled(operations)
      
      // At least one should succeed without errors
      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.error === null
      )
      
      expect(successful.length).toBeGreaterThan(0)
    })
  })
})

// Show configuration status
if (!canRunTests) {
  describe('Authentication Fixes Tests (Configuration Required)', () => {
    test('should have Supabase configuration', () => {
      console.warn('⚠️  Cannot run authentication integration tests')
      console.warn('   Missing required environment variables:')
      if (!supabaseUrl) console.warn('   - NEXT_PUBLIC_SUPABASE_URL')
      if (!supabaseKey) console.warn('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
      console.warn('   To fix: update .env.test.local with your test Supabase credentials')
      
      expect(supabaseUrl).toBeDefined()
      expect(supabaseKey).toBeDefined()
    })
  })
} else if (!hasAdminAccess) {
  describe('Authentication Fixes Tests (Limited)', () => {
    test('should show admin access status', () => {
      console.warn('⚠️  Running with limited functionality')
      console.warn('   Some tests will be skipped without SUPABASE_SERVICE_ROLE_KEY')
      console.warn('   Add service role key to .env.test.local for full test coverage')
      
      expect(supabaseUrl).toBeDefined()
      expect(supabaseKey).toBeDefined()
    })
  })
}