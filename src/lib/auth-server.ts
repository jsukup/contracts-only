import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import type { Database, SupabaseUser } from '@/lib/supabase'
import { cookies } from 'next/headers'

export interface AuthResult {
  user: User
  userProfile: SupabaseUser
  supabase: ReturnType<typeof createServerClient<Database>>
}

// Create authenticated Supabase client for API routes using SSR
export function createAuthenticatedSupabaseClient(req?: NextRequest) {
  if (req) {
    // For API routes with request context
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options) {
            // Can't set cookies in API routes during request processing
            // This is handled by the client-side auth
          },
          remove(name: string, options) {
            // Can't remove cookies in API routes during request processing
          },
        },
      }
    )
  } else {
    // For server components and middleware
    const cookieStore = cookies()
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
  }
}

// Authenticate API route and get user data
export async function authenticateApiRoute(req: NextRequest): Promise<AuthResult> {
  const requestId = Math.random().toString(36).substring(7)
  const url = new URL(req.url).pathname
  
  console.log(`[${requestId}] Auth request for ${req.method} ${url}`)
  
  const supabase = createAuthenticatedSupabaseClient(req)
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error(`[${requestId}] Auth error:`, {
      error: authError.message,
      code: authError.name,
      url
    })
    throw new Error(`Authentication failed: ${authError.message}`)
  }
  
  if (!user) {
    console.log(`[${requestId}] No authenticated user found for ${url}`)
    throw new Error('No authenticated user found')
  }
  
  console.log(`[${requestId}] User authenticated:`, {
    userId: user.id.substring(0, 8) + '...',
    email: user.email,
    url
  })
  
  // Get user profile from database
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  
  if (profileError || !userProfile) {
    console.error(`[${requestId}] Profile error:`, {
      error: profileError?.message,
      code: profileError?.code,
      userId: user.id.substring(0, 8) + '...',
      url
    })
    throw new Error('User profile not found')
  }
  
  console.log(`[${requestId}] User profile loaded:`, {
    userId: user.id.substring(0, 8) + '...',
    name: userProfile.name,
    role: userProfile.role,
    url
  })
  
  return {
    user,
    userProfile,
    supabase
  }
}

// Middleware to check authentication and return proper error responses
export function withAuth<T = any>(
  handler: (req: NextRequest, auth: AuthResult, context?: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: T) => {
    try {
      const auth = await authenticateApiRoute(req)
      return await handler(req, auth, context)
    } catch (error) {
      console.error('Authentication middleware error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed') || 
            error.message.includes('No authenticated user') ||
            error.message.includes('User profile not found')) {
          return NextResponse.json(
            { error: 'Unauthorized', message: error.message },
            { status: 401 }
          )
        }
      }
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Alternative version that doesn't require authentication (for public routes)
export function createPublicSupabaseClient(req?: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // For public routes, we can still try to get cookies for RLS context
          return req ? req.cookies.get(name)?.value : undefined
        },
        set() {
          // No-op for public routes
        },
        remove() {
          // No-op for public routes  
        },
      },
    }
  )
}