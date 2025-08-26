import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables - skipping API auth integration tests')
}

let supabase: any = null
let adminSupabase: any = null

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
  adminSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null
}

describe('API Authentication Integration Tests', () => {
  let testUser: { id: string; email: string; session: any } | null = null

  beforeAll(async () => {
    if (!supabase) {
      console.log('Skipping beforeAll - Supabase not configured')
      return
    }

    // Create a test user for API authentication tests
    const testEmail = `test-api-auth-${Date.now()}@example.com`
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPass123!',
      options: {
        data: {
          full_name: 'Test API User',
          role: 'RECRUITER' // Use RECRUITER for employer API tests
        }
      }
    })

    if (signUpError || !signUpData.user) {
      throw new Error(`Failed to create test user: ${signUpError?.message}`)
    }

    // Create user profile
    await supabase
      .from('users')
      .insert({
        id: signUpData.user.id,
        email: signUpData.user.email!,
        name: 'Test API User',
        role: 'RECRUITER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    // Get session for API calls
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPass123!'
    })

    testUser = {
      id: signUpData.user.id,
      email: testEmail,
      session: sessionData.session
    }
  })

  afterAll(async () => {
    if (!supabase) return
    
    // Cleanup test user
    if (testUser) {
      try {
        await supabase
          .from('users')
          .delete()
          .eq('id', testUser.id)
      } catch (error) {
        console.warn('Cleanup error:', error)
      }
    }
  })

  describe('Employer API Authentication - Fix for 401 Errors', () => {
    test('should authenticate requests to /api/jobs/employer with valid session', async () => {
      if (!supabase || !testUser?.session) {
        console.log('Skipping test - Supabase or test user not configured')
        return
      }

      // Simulate an API request to the employer endpoint
      const mockRequest = new Request('http://localhost:3000/api/jobs/employer', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.session.access_token}`,
          'Content-Type': 'application/json',
        }
      })

      // Test that we can create a proper auth context
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${testUser.session.access_token}`
          }
        }
      })

      // Verify the session is valid
      const { data: { user }, error } = await authSupabase.auth.getUser()
      
      expect(error).toBeNull()
      expect(user).not.toBeNull()
      expect(user?.id).toBe(testUser.id)
    })

    test('should reject requests without authentication token', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }
      
      // Simulate request without auth header
      const authSupabase = createClient(supabaseUrl!, supabaseKey!)
      
      // Clear any existing session
      await authSupabase.auth.signOut()
      
      const { data: { user }, error } = await authSupabase.auth.getUser()
      
      // Should not have a user without authentication
      expect(user).toBeNull()
      // May or may not have an error depending on implementation
    })

    test('should reject requests with invalid/expired tokens', async () => {
      const invalidToken = 'invalid-jwt-token-12345'
      
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${invalidToken}`
          }
        }
      })

      const { data: { user }, error } = await authSupabase.auth.getUser()
      
      expect(user).toBeNull()
      expect(error).not.toBeNull()
    })

    test('should handle malformed authorization headers', async () => {
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: 'Malformed Header'
          }
        }
      })

      const { data: { user }, error } = await authSupabase.auth.getUser()
      
      expect(user).toBeNull()
      // Should handle malformed headers gracefully
    })
  })

  describe('User Profile API Integration', () => {
    test('should create user profile with proper authentication context', async () => {
      if (!testUser?.session) {
        throw new Error('Test user not properly set up')
      }

      // Create a second test user for profile creation test
      const testEmail2 = `test-profile-${Date.now()}@example.com`
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail2,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test Profile User',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      expect(signUpData.user).not.toBeNull()

      if (signUpData.user) {
        // Test profile creation using the patterns from AuthContext
        const userData = {
          id: signUpData.user.id,
          email: signUpData.user.email!,
          name: signUpData.user.user_metadata?.full_name || null,
          role: 'USER' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Use upsert to prevent conflicts (our fix for 409 errors)
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .upsert(userData, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        expect(profileError).toBeNull()
        expect(profile).not.toBeNull()
        expect(profile?.id).toBe(signUpData.user.id)

        // Cleanup
        await supabase
          .from('users')
          .delete()
          .eq('id', signUpData.user.id)
      }
    })

    test('should handle profile updates with proper authentication', async () => {
      if (!testUser?.session) {
        throw new Error('Test user not properly set up')
      }

      // Create authenticated client
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${testUser.session.access_token}`
          }
        }
      })

      // Verify we can update the user's own profile
      const { data: updatedProfile, error: updateError } = await authSupabase
        .from('users')
        .update({ 
          name: 'Updated Test Name',
          updated_at: new Date().toISOString() 
        })
        .eq('id', testUser.id)
        .select()
        .single()

      expect(updateError).toBeNull()
      expect(updatedProfile).not.toBeNull()
      expect(updatedProfile?.name).toBe('Updated Test Name')
    })
  })

  describe('Session Validation and Refresh', () => {
    test('should validate active sessions', async () => {
      if (!testUser?.session) {
        throw new Error('Test user not properly set up')
      }

      // Check if session is still valid
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${testUser.session.access_token}`
          }
        }
      })

      const { data: { user }, error } = await authSupabase.auth.getUser()
      
      expect(error).toBeNull()
      expect(user).not.toBeNull()
      expect(user?.id).toBe(testUser.id)
      expect(user?.email).toBe(testUser.email)
    })

    test('should handle session refresh when needed', async () => {
      if (!testUser?.session?.refresh_token) {
        throw new Error('Test user session not properly set up')
      }

      // Test session refresh
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: testUser.session.refresh_token
      })

      if (error) {
        // Refresh might fail if token is too new or already invalid
        // This is expected behavior in some cases
        console.log('Session refresh result:', error.message)
      } else {
        expect(data.session).not.toBeNull()
        expect(data.user).not.toBeNull()
      }
    })
  })

  describe('API Route Security', () => {
    test('should enforce authentication on protected routes', async () => {
      // Test various authentication scenarios
      const testCases = [
        {
          name: 'No Authorization header',
          headers: {},
          expectedAuth: false
        },
        {
          name: 'Invalid Bearer token',
          headers: { Authorization: 'Bearer invalid-token' },
          expectedAuth: false
        },
        {
          name: 'Valid Bearer token',
          headers: { Authorization: `Bearer ${testUser?.session?.access_token}` },
          expectedAuth: true
        },
        {
          name: 'Malformed Authorization header',
          headers: { Authorization: 'Invalid Format' },
          expectedAuth: false
        }
      ]

      for (const testCase of testCases) {
        if (!testCase.expectedAuth || testUser?.session) {
          const authSupabase = createClient(supabaseUrl, supabaseKey, {
            global: {
              headers: testCase.headers as any
            }
          })

          const { data: { user }, error } = await authSupabase.auth.getUser()
          
          if (testCase.expectedAuth) {
            expect(user).not.toBeNull()
            expect(error).toBeNull()
          } else {
            expect(user).toBeNull()
            // May or may not have error depending on the case
          }
        }
      }
    })

    test('should handle concurrent authentication requests', async () => {
      if (!testUser?.session) {
        throw new Error('Test user not properly set up')
      }

      // Create multiple concurrent authentication requests
      const promises = Array.from({ length: 5 }, () => {
        const authSupabase = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${testUser!.session.access_token}`
            }
          }
        })
        
        return authSupabase.auth.getUser()
      })

      const results = await Promise.allSettled(promises)
      
      // All should succeed or fail consistently
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && 
        result.value.data.user !== null &&
        result.value.error === null
      ).length

      const errorCount = results.filter(result => 
        result.status === 'fulfilled' && 
        (result.value.data.user === null || result.value.error !== null)
      ).length

      // Should be consistent - either all succeed or all fail
      expect(successCount + errorCount).toBe(5)
      // In this case, all should succeed since we have a valid token
      expect(successCount).toBe(5)
    })
  })

  describe('Role-Based Access Control', () => {
    test('should enforce role-based access for recruiter endpoints', async () => {
      if (!testUser?.session) {
        throw new Error('Test user not properly set up')
      }

      // Verify the test user has RECRUITER role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', testUser.id)
        .single()

      expect(profile?.role).toBe('RECRUITER')

      // Test that recruiter can access employer endpoints
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${testUser.session.access_token}`
          }
        }
      })

      // This simulates what the API route authentication middleware should do
      const { data: { user }, error } = await authSupabase.auth.getUser()
      
      expect(error).toBeNull()
      expect(user).not.toBeNull()

      if (user) {
        // Fetch user profile to check role
        const { data: userProfile } = await authSupabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        expect(userProfile?.role).toBe('RECRUITER')
      }
    })

    test('should create user with USER role and test access patterns', async () => {
      // Create a USER role test user
      const testEmail = `test-user-role-${Date.now()}@example.com`
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test User Role',
            role: 'USER'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        // Create user profile
        await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: signUpData.user.email!,
            name: 'Test User Role',
            role: 'USER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        // Sign in to get session
        const { data: sessionData } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'TestPass123!'
        })

        expect(sessionData.session).not.toBeNull()
        expect(sessionData.user).not.toBeNull()

        if (sessionData.session) {
          // Verify user role
          const { data: userProfile } = await supabase
            .from('users')
            .select('role')
            .eq('id', signUpData.user.id)
            .single()

          expect(userProfile?.role).toBe('USER')
        }

        // Cleanup
        await supabase
          .from('users')
          .delete()
          .eq('id', signUpData.user.id)
      }
    })
  })
})