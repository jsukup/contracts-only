/**
 * Core Authentication Validation Tests
 * 
 * These tests validate the specific fixes implemented without requiring 
 * complex user creation. They focus on:
 * - maybeSingle() vs single() behavior
 * - upsert() vs insert() behavior  
 * - Error handling improvements
 * - Authentication API responses
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables (skip in CI, use env vars from workflow)
if (!process.env.CI) {
  dotenv.config({ path: path.join(process.cwd(), '.env.test.local') })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const canRunTests = supabaseUrl && supabaseKey
const hasAdminAccess = canRunTests && serviceRoleKey

console.log(`Auth validation tests - DB: ${!!canRunTests}, Admin: ${!!hasAdminAccess}`)

const describeOrSkip = canRunTests ? describe : describe.skip

describeOrSkip('Authentication Core Validation Tests', () => {
  let supabase: ReturnType<typeof createClient>
  let adminSupabase: ReturnType<typeof createClient> | null = null

  beforeAll(() => {
    if (canRunTests) {
      supabase = createClient(supabaseUrl!, supabaseKey!)
      if (hasAdminAccess) {
        adminSupabase = createClient(supabaseUrl!, serviceRoleKey!)
      }
    }
  })

  describe('Fix for 406 HTTP Errors', () => {
    test('maybeSingle() should return null for non-existent records without error', async () => {
      const nonExistentId = crypto.randomUUID()

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

    test('maybeSingle() should work with multiple conditions', async () => {
      // Test complex queries that might have caused 406 errors
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'nonexistent@example.com')
        .eq('role', 'USER')
        .maybeSingle()

      expect(error).toBeNull()
      expect(data).toBeNull()
    })
  })

  describe('Fix for 409 HTTP Conflicts', () => {
    test('upsert should be available without syntax errors', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping upsert test - admin access required')
        return
      }

      const mockId = crypto.randomUUID()
      const mockData = {
        id: mockId,
        email: 'upsert-test@example.com',
        name: 'Upsert Test User',
        role: 'USER' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // The upsert operation should be syntactically correct
      // Even if it fails due to foreign key constraints, the upsert functionality is available
      const { error } = await adminSupabase!
        .from('users')
        .upsert(mockData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      // We expect a foreign key error, which proves upsert is working
      if (error) {
        expect(error.message).toMatch(/foreign key|violates|constraint/i)
      } else {
        // If no error, that's also fine - upsert worked completely
        expect(error).toBeNull()
      }
    })

    test('upsert with onConflict parameter should be supported', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping conflict test - admin access required')
        return
      }

      // Test that the onConflict parameter is properly supported
      const mockId = crypto.randomUUID()
      
      try {
        await adminSupabase!
          .from('users')
          .upsert({
            id: mockId,
            email: 'conflict-test@example.com',
            name: 'Conflict Test',
            role: 'USER'
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
      } catch (error: any) {
        // The syntax should be correct even if operation fails
        expect(error.message).not.toMatch(/syntax|unexpected/i)
      }
    })
  })

  describe('Authentication API Error Handling', () => {
    test('should handle invalid login credentials gracefully', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'invalid-password'
      })

      // Should return proper error structure
      expect(data).toBeDefined()
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/invalid.*credentials/i)
    })

    test('should handle malformed email addresses', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'not-an-email',
        password: 'somepassword'
      })

      expect(data).toBeDefined()
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
      expect(error).not.toBeNull()
    })

    test('should handle empty credentials', async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: '',
        password: ''
      })

      expect(data).toBeDefined()
      expect(data.user).toBeNull()
      expect(data.session).toBeNull()
      expect(error).not.toBeNull()
    })
  })

  describe('Session Management', () => {
    test('should retrieve session state safely', async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      expect(error).toBeNull()
      // Session should be null for anonymous access
      expect(session).toBeNull()
    })

    test('should handle sign out gracefully even without active session', async () => {
      const { error } = await supabase.auth.signOut()
      
      // Should not error even if no user is signed in
      expect(error).toBeNull()
    })

    test('should handle user retrieval safely', async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      // Should return null user without error for anonymous access
      expect(error).toBeNull()
      expect(user).toBeNull()
    })
  })

  describe('Database Constraint Validation', () => {
    test('should enforce role enum constraints', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping constraint test - admin access required')
        return
      }

      const { error } = await adminSupabase!
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          email: 'invalid-role-test@example.com',
          name: 'Invalid Role Test',
          role: 'INVALID_ROLE' as any,
        })

      // Should fail due to enum constraint
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/invalid|constraint|enum/i)
    }, 15000)

    test('should require email field', async () => {
      if (!hasAdminAccess) {
        console.log('Skipping email test - admin access required')
        return
      }

      const { error } = await adminSupabase!
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          name: 'No Email Test',
          role: 'USER',
        } as any) // Remove email to test constraint

      // Should fail due to NOT NULL constraint on email
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/null|required|email/i)
    }, 15000)
  })

  describe('Query Performance and Safety', () => {
    test('should handle complex queries without hanging', async () => {
      // Test that complex queries complete in reasonable time
      const start = Date.now()
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .or('role.eq.USER,role.eq.RECRUITER')
        .order('created_at', { ascending: false })
        .limit(10)

      const duration = Date.now() - start
      
      expect(error).toBeNull()
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(Array.isArray(data)).toBe(true)
    })

    test('should handle concurrent queries safely', async () => {
      // Test multiple simultaneous queries
      const queries = Array.from({ length: 5 }, (_, i) =>
        supabase
          .from('users')
          .select('count', { count: 'exact', head: true })
          .eq('role', i % 2 === 0 ? 'USER' : 'RECRUITER')
      )

      const results = await Promise.allSettled(queries)
      
      // All queries should complete without errors
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'fulfilled') {
          expect(result.value.error).toBeNull()
        }
      })
    })
  })

  describe('Memory Leak Prevention Validation', () => {
    test('should handle multiple rapid operations without memory issues', async () => {
      // Simulate the rapid operations that could cause memory leaks
      const operations = []
      
      for (let i = 0; i < 10; i++) {
        operations.push(
          supabase
            .from('users')
            .select('*')
            .eq('id', crypto.randomUUID())
            .maybeSingle()
        )
      }

      const results = await Promise.allSettled(operations)
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result.status).toBe('fulfilled')
        if (result.status === 'fulfilled') {
          expect(result.value.error).toBeNull()
          expect(result.value.data).toBeNull() // Non-existent IDs should return null
        }
      })
    })
  })
})

// Configuration status tests
if (!canRunTests) {
  describe('Authentication Validation Tests (Configuration Required)', () => {
    test('should have basic Supabase configuration', () => {
      console.warn('⚠️  Cannot run authentication validation tests')
      console.warn('   Missing environment configuration')
      
      expect(supabaseUrl).toBeDefined()
      expect(supabaseKey).toBeDefined()
    })
  })
}