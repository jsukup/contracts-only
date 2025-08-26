import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.test.local') })

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Skip tests if environment variables are not configured
const skipTests = !supabaseUrl || !supabaseKey

if (skipTests) {
  console.warn('⚠️  Supabase environment variables not configured - skipping core auth integration tests')
  console.warn('   Create .env.test.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

describe('Core Authentication Integration Tests', () => {
  let supabase: any = null
  const testUsers: Array<{ email: string; id?: string }> = []

  beforeAll(() => {
    if (!skipTests) {
      supabase = createClient(supabaseUrl!, supabaseKey!)
    }
  })

  afterAll(async () => {
    if (skipTests || !supabase) return
    
    // Cleanup all test users
    for (const user of testUsers) {
      if (user.id) {
        try {
          await supabase
            .from('users')
            .delete()
            .eq('id', user.id)
        } catch (error) {
          console.warn(`Cleanup warning for ${user.email}:`, error)
        }
      }
    }
  })

  describe('Fix for 406/409 HTTP Errors', () => {
    test('should use maybeSingle() instead of single() to prevent 406 errors', async () => {
      if (skipTests) {
        console.log('Skipping test - environment not configured')
        return
      }

      const nonExistentId = 'non-existent-uuid-12345'

      // Test that querying for non-existent user returns null without error
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', nonExistentId)
        .maybeSingle()

      expect(error).toBeNull()
      expect(data).toBeNull()
    })

    test('should handle profile creation with upsert to prevent 409 conflicts', async () => {
      if (skipTests) return

      const testEmail = `test-upsert-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test User',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      expect(signUpData.user).not.toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        const userData = {
          id: signUpData.user.id,
          email: signUpData.user.email!,
          name: signUpData.user.user_metadata?.full_name || null,
          role: 'USER' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // First upsert - should succeed
        const { data: firstInsert, error: firstError } = await supabase
          .from('users')
          .upsert(userData, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        expect(firstError).toBeNull()
        expect(firstInsert).not.toBeNull()

        // Second upsert - should not fail with 409 conflict
        const { data: secondInsert, error: secondError } = await supabase
          .from('users')
          .upsert({
            ...userData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        expect(secondError).toBeNull()
        expect(secondInsert).not.toBeNull()
        expect(secondInsert.id).toBe(firstInsert.id)
      }
    })
  })

  describe('OAuth Role Selection Flow', () => {
    test('should allow role updates for OAuth users', async () => {
      if (skipTests) return

      const testEmail = `test-role-update-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create OAuth-style user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test OAuth User',
            avatar_url: 'https://example.com/avatar.jpg',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Create user profile with default role
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: signUpData.user.email!,
            name: signUpData.user.user_metadata?.full_name || null,
            image: signUpData.user.user_metadata?.avatar_url || null,
            role: 'USER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        expect(profileError).toBeNull()
        expect(profileData?.role).toBe('USER')

        // Update role to RECRUITER (simulating role selection)
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            role: 'RECRUITER',
            updated_at: new Date().toISOString() 
          })
          .eq('id', signUpData.user.id)
          .select()
          .single()

        expect(updateError).toBeNull()
        expect(updatedUser).not.toBeNull()
        expect(updatedUser?.role).toBe('RECRUITER')
      }
    })
  })

  describe('Authentication State Management', () => {
    test('should handle sign out without errors', async () => {
      if (skipTests) return

      const testEmail = `test-signout-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create and sign in user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test User',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Create user profile
        await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: signUpData.user.email!,
            name: signUpData.user.user_metadata?.full_name || null,
            role: 'USER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        // Sign out
        const { error: signOutError } = await supabase.auth.signOut()
        
        expect(signOutError).toBeNull()

        // Verify session is cleared
        const { data: { session } } = await supabase.auth.getSession()
        expect(session).toBeNull()
      }
    })

    test('should handle concurrent profile operations without race conditions', async () => {
      if (skipTests) return

      const testEmail = `test-concurrent-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test User',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        const profileData = {
          id: signUpData.user.id,
          email: signUpData.user.email!,
          name: signUpData.user.user_metadata?.full_name || null,
          role: 'USER' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Run multiple upsert operations concurrently
        const promises = Array.from({ length: 3 }, (_, i) => 
          supabase
            .from('users')
            .upsert({
              ...profileData,
              updated_at: new Date(Date.now() + i).toISOString()
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select()
            .single()
        )

        const results = await Promise.allSettled(promises)
        
        // At least one should succeed
        const successfulResults = results.filter(result => 
          result.status === 'fulfilled' && result.value.error === null
        )
        
        expect(successfulResults.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Rate Limiting and Error Handling', () => {
    test('should handle invalid credentials gracefully', async () => {
      if (skipTests) return

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      })

      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/invalid.*credentials/i)
    })

    test('should handle rate limiting for email verification', async () => {
      if (skipTests) return

      const testEmail = `test-rate-limit-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test User',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Try to resend verification email
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: testEmail
        })

        // Should either succeed or fail with rate limit error
        if (resendError) {
          expect(resendError.message).toMatch(/rate|limit|too many/i)
        }
      }
    })
  })

  describe('Data Consistency', () => {
    test('should maintain data consistency during profile updates', async () => {
      if (skipTests) return

      const testEmail = `test-consistency-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test User',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Create initial profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: signUpData.user.email!,
            name: signUpData.user.user_metadata?.full_name || null,
            role: 'USER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        expect(profileError).toBeNull()
        expect(profile?.email).toBe(testEmail)

        // Update profile multiple times to test consistency
        const updates = ['RECRUITER', 'USER', 'RECRUITER'] as const
        
        for (const role of updates) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('users')
            .update({ 
              role,
              updated_at: new Date().toISOString() 
            })
            .eq('id', signUpData.user.id)
            .select()
            .single()

          expect(updateError).toBeNull()
          expect(updatedProfile?.role).toBe(role)
          
          // Verify the change persisted
          const { data: verifyProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', signUpData.user.id)
            .single()
          
          expect(verifyProfile?.role).toBe(role)
        }
      }
    })
  })
})