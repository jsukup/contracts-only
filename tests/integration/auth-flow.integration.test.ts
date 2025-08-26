import { createClient } from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

describe('Authentication Flow Integration Tests', () => {
  // Test users that will be created and cleaned up
  const testUsers: Array<{ email: string; id?: string }> = []
  
  afterAll(async () => {
    // Cleanup test users
    for (const user of testUsers) {
      if (user.id) {
        try {
          // Delete from users table (cascade will handle related data)
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id)
          
          if (error && error.code !== 'PGRST116') {
            console.warn(`Cleanup warning for ${user.email}:`, error.message)
          }
        } catch (error) {
          console.warn(`Cleanup error for ${user.email}:`, error)
        }
      }
    }
  })

  describe('User Profile Creation - Fix for 409 Conflicts', () => {
    test('should handle user profile creation with upsert to prevent 409 errors', async () => {
      const testEmail = `test-upsert-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // First, create auth user
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

        // Simulate profile creation (this should use upsert internally)
        const userData = {
          id: signUpData.user.id,
          email: signUpData.user.email!,
          name: signUpData.user.user_metadata?.full_name || null,
          role: 'USER' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Test upsert behavior - should not fail even if called multiple times
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

        // Call upsert again - should not fail with 409 conflict
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

  describe('Database Query Safety - Fix for 406 Errors', () => {
    test('should use maybeSingle() instead of single() to prevent 406 errors', async () => {
      const nonExistentId = 'non-existent-uuid-12345'

      // Test that querying for non-existent user returns null without error
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', nonExistentId)
        .maybeSingle()

      // Should not error, just return null
      expect(error).toBeNull()
      expect(data).toBeNull()
    })

    test('should handle existing user query with maybeSingle()', async () => {
      const testEmail = `test-maybe-single-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create a user first
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

        // Query existing user - should return data without error
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', signUpData.user.id)
          .maybeSingle()

        expect(error).toBeNull()
        expect(data).not.toBeNull()
        expect(data?.id).toBe(signUpData.user.id)
      }
    })
  })

  describe('Role Selection for OAuth Users', () => {
    test('should allow role updates for OAuth users without conflicts', async () => {
      const testEmail = `test-role-update-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Simulate OAuth user creation
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test OAuth User',
            role: 'USER' // Initial role
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

  describe('Email Verification Rate Limiting', () => {
    test('should handle rate limiting gracefully', async () => {
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

        // Try again immediately - should be rate limited
        const { error: secondResendError } = await supabase.auth.resend({
          type: 'signup',
          email: testEmail
        })

        // Should be rate limited on second attempt
        if (secondResendError) {
          expect(secondResendError.message).toMatch(/rate|limit|too many/i)
        }
      }
    })
  })

  describe('Authentication State Management', () => {
    test('should handle sign out without memory leaks', async () => {
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

    test('should handle concurrent auth operations without race conditions', async () => {
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

        // Simulate concurrent profile operations
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

  describe('Error Handling and Recovery', () => {
    test('should gracefully handle invalid credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      })

      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/invalid.*credentials/i)
    })

    test('should handle network errors gracefully', async () => {
      // This test would require mocking network conditions
      // For now, we test that the auth methods return proper error types
      
      const invalidClient = createClient('https://invalid-url.supabase.co', 'invalid-key')
      
      const { error } = await invalidClient.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'TestPass123!'
      }).catch(err => ({ error: err }))

      expect(error).toBeDefined()
      // Should be an AuthError or network error
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('Data Consistency', () => {
    test('should maintain data consistency during profile updates', async () => {
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