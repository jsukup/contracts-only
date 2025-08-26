import { createClient } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables - skipping OAuth integration tests')
}

describe('OAuth Role Selection Integration Tests', () => {
  const testUsers: Array<{ email: string; id?: string }> = []
  let supabase: any

  beforeAll(() => {
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey)
    }
  })
  
  afterAll(async () => {
    if (!supabase) return
    
    // Cleanup test users
    for (const user of testUsers) {
      if (user.id) {
        try {
          await supabase
            .from('users')
            .delete()
            .eq('id', user.id)
        } catch (error) {
          console.warn(`Cleanup error for ${user.email}:`, error)
        }
      }
    }
  })

  describe('OAuth User Profile Creation', () => {
    test('should create OAuth user profile with default role', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testEmail = `test-oauth-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Simulate OAuth user signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test OAuth User',
            avatar_url: 'https://example.com/avatar.jpg',
            provider: 'google' // Simulate OAuth provider
          }
        }
      })

      expect(signUpError).toBeNull()
      expect(signUpData.user).not.toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Create user profile with OAuth metadata
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .upsert({
            id: signUpData.user.id,
            email: signUpData.user.email!,
            name: signUpData.user.user_metadata?.full_name || null,
            image: signUpData.user.user_metadata?.avatar_url || null,
            role: 'USER', // Default role for OAuth users
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        expect(profileError).toBeNull()
        expect(profile).not.toBeNull()
        expect(profile?.role).toBe('USER')
        expect(profile?.image).toBe('https://example.com/avatar.jpg')
      }
    })

    test('should handle OAuth role selection update', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testEmail = `test-role-selection-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create OAuth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Test Role Selection User',
            provider: 'google'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Create initial profile with USER role
        const { data: initialProfile, error: initialError } = await supabase
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

        expect(initialError).toBeNull()
        expect(initialProfile?.role).toBe('USER')

        // Simulate role selection - update to RECRUITER
        const { data: updatedProfile, error: updateError } = await supabase
          .from('users')
          .update({ 
            role: 'RECRUITER',
            updated_at: new Date().toISOString() 
          })
          .eq('id', signUpData.user.id)
          .select()
          .single()

        expect(updateError).toBeNull()
        expect(updatedProfile).not.toBeNull()
        expect(updatedProfile?.role).toBe('RECRUITER')

        // Verify the change persisted
        const { data: verifyProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', signUpData.user.id)
          .single()
        
        expect(verifyProfile?.role).toBe('RECRUITER')
      }
    })
  })

  describe('OAuth Authentication State Management', () => {
    test('should detect OAuth users vs email users', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      // Test OAuth user detection based on app_metadata.provider
      const oauthUserMetadata = {
        app_metadata: {
          provider: 'google',
          providers: ['google']
        },
        user_metadata: {
          full_name: 'OAuth User',
          avatar_url: 'https://example.com/avatar.jpg',
          email_verified: true
        }
      }

      const emailUserMetadata = {
        app_metadata: {
          provider: 'email',
          providers: ['email']
        },
        user_metadata: {
          full_name: 'Email User'
        }
      }

      // OAuth users should be identified by provider !== 'email'
      const isOAuthUser1 = oauthUserMetadata.app_metadata?.provider !== 'email'
      const isOAuthUser2 = emailUserMetadata.app_metadata?.provider !== 'email'

      expect(isOAuthUser1).toBe(true)
      expect(isOAuthUser2).toBe(false)
    })

    test('should handle OAuth redirect and role selection flow', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      // This test simulates the complete OAuth flow:
      // 1. User signs in with OAuth provider
      // 2. System detects it's a new OAuth user
      // 3. System shows role selection
      // 4. User selects role
      // 5. System updates profile and redirects to dashboard

      const testEmail = `test-oauth-flow-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Step 1: OAuth signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'OAuth Flow User',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Step 2: Check if user profile exists (it shouldn't for new users)
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', signUpData.user.id)
          .maybeSingle()

        expect(existingProfile).toBeNull() // New user, no profile yet

        // Step 3: Create profile with upsert (simulating AuthContext behavior)
        const { data: newProfile, error: profileError } = await supabase
          .from('users')
          .upsert({
            id: signUpData.user.id,
            email: signUpData.user.email!,
            name: signUpData.user.user_metadata?.full_name || null,
            image: signUpData.user.user_metadata?.avatar_url || null,
            role: 'USER', // Default role
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        expect(profileError).toBeNull()
        expect(newProfile?.role).toBe('USER')

        // Step 4: Simulate role selection (user chooses RECRUITER)
        const { data: finalProfile, error: roleError } = await supabase
          .from('users')
          .update({ 
            role: 'RECRUITER',
            updated_at: new Date().toISOString() 
          })
          .eq('id', signUpData.user.id)
          .select()
          .single()

        expect(roleError).toBeNull()
        expect(finalProfile?.role).toBe('RECRUITER')

        // Step 5: Verify final state
        const { data: verifyProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', signUpData.user.id)
          .single()
        
        expect(verifyProfile?.role).toBe('RECRUITER')
        expect(verifyProfile?.name).toBe('OAuth Flow User')
        expect(verifyProfile?.image).toBe('https://example.com/avatar.jpg')
      }
    })
  })

  describe('Error Handling for OAuth Flow', () => {
    test('should handle OAuth profile creation conflicts gracefully', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testEmail = `test-conflict-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create user first
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Conflict Test User',
            provider: 'google'
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

        // First upsert - should succeed
        const { data: firstProfile, error: firstError } = await supabase
          .from('users')
          .upsert(profileData, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        expect(firstError).toBeNull()
        expect(firstProfile).not.toBeNull()

        // Second upsert with updated data - should also succeed (no conflict)
        const { data: secondProfile, error: secondError } = await supabase
          .from('users')
          .upsert({
            ...profileData,
            role: 'RECRUITER',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        expect(secondError).toBeNull()
        expect(secondProfile).not.toBeNull()
        expect(secondProfile?.role).toBe('RECRUITER')
      }
    })

    test('should handle invalid role updates', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testEmail = `test-invalid-role-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Invalid Role Test User'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Create profile first
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

        // Try to update with invalid role (should be rejected by database constraints)
        const { error: invalidRoleError } = await supabase
          .from('users')
          .update({ 
            role: 'INVALID_ROLE' as any,
            updated_at: new Date().toISOString() 
          })
          .eq('id', signUpData.user.id)

        // Should fail due to database constraints
        expect(invalidRoleError).not.toBeNull()
        if (invalidRoleError) {
          expect(invalidRoleError.message).toMatch(/invalid|constraint|enum/i)
        }

        // Verify original role is preserved
        const { data: preservedProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', signUpData.user.id)
          .single()
        
        expect(preservedProfile?.role).toBe('USER')
      }
    })
  })

  describe('OAuth Session Management', () => {
    test('should maintain session state for OAuth users', async () => {
      if (!supabase) {
        console.log('Skipping test - Supabase not configured')
        return
      }

      const testEmail = `test-session-${Date.now()}@example.com`
      testUsers.push({ email: testEmail })

      // Create and sign in OAuth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPass123!',
        options: {
          data: {
            full_name: 'Session Test User',
            provider: 'google'
          }
        }
      })

      expect(signUpError).toBeNull()
      
      if (signUpData.user) {
        testUsers[testUsers.length - 1].id = signUpData.user.id

        // Create profile
        await supabase
          .from('users')
          .insert({
            id: signUpData.user.id,
            email: signUpData.user.email!,
            name: signUpData.user.user_metadata?.full_name || null,
            role: 'RECRUITER',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        // Sign in to get session
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'TestPass123!'
        })

        expect(sessionError).toBeNull()
        expect(sessionData.session).not.toBeNull()
        expect(sessionData.user).not.toBeNull()

        if (sessionData.session) {
          // Test session persistence
          const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
          
          expect(getSessionError).toBeNull()
          expect(session).not.toBeNull()
          expect(session?.user?.id).toBe(signUpData.user.id)
        }
      }
    })
  })
})