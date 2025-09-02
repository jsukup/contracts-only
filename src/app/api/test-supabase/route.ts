import { NextRequest, NextResponse } from 'next/server'
import { createPublicSupabaseClient, createAuthenticatedSupabaseClient } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createPublicSupabaseClient(request)
    
    interface TestResult {
      test: string
      status: 'PASS' | 'FAIL' | 'ERROR'
      error?: string
      count?: number
      message?: string
    }

    // Test multiple database operations
    const results = {
      connection: 'OK',
      tests: [] as TestResult[]
    }

    // Test 1: Fetch skills (should work publicly)
    try {
      const { data: skills, error } = await supabase
        .from('skills')
        .select('*')
        .limit(5)
      
      results.tests.push({
        test: 'fetch_skills',
        status: error ? 'FAIL' : 'PASS',
        error: error?.message,
        count: skills?.length || 0
      })
    } catch (e) {
      results.tests.push({
        test: 'fetch_skills',
        status: 'ERROR',
        error: e instanceof Error ? e.message : 'Unknown error'
      })
    }

    // Test 2: Fetch jobs (should work publicly)
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, title, company, is_active')
        .eq('is_active', true)
        .limit(5)
      
      results.tests.push({
        test: 'fetch_jobs',
        status: error ? 'FAIL' : 'PASS',
        error: error?.message,
        count: jobs?.length || 0
      })
    } catch (e) {
      results.tests.push({
        test: 'fetch_jobs',
        status: 'ERROR',
        error: e instanceof Error ? e.message : 'Unknown error'
      })
    }

    // Test 3: Try to fetch users (should fail due to RLS)
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name')
        .limit(1)
      
      results.tests.push({
        test: 'fetch_users_rls',
        status: 'INFO',
        message: error ? 'RLS working (good)' : 'RLS might be disabled (check)',
        error: error?.message,
        count: users?.length || 0
      })
    } catch (e) {
      results.tests.push({
        test: 'fetch_users_rls',
        status: 'INFO',
        message: 'RLS working (good)',
        error: e instanceof Error ? e.message : 'Unknown error'
      })
    }

    // Test 4: Check auth status
    try {
      const authSupabase = createAuthenticatedSupabaseClient(request)
      const { data: { user }, error } = await authSupabase.auth.getUser()
      
      results.tests.push({
        test: 'auth_check',
        status: 'INFO',
        authenticated: !!user,
        user_id: user?.id?.substring(0, 8) + '...',
        error: error?.message
      })
    } catch (e) {
      results.tests.push({
        test: 'auth_check',
        status: 'INFO',
        authenticated: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}