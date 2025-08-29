import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { auth } from '@clerk/nextjs/server'
import { useAuth, useSession } from '@clerk/nextjs'
import type { Database } from './supabase'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// Note: This function is not recommended - use useSupabaseClient hook instead
// Client-side Supabase client with Clerk session token integration
export const createClerkSupabaseClient = (): SupabaseClient<Database> => {
  if (typeof window === 'undefined') {
    // Server-side: This should not be used on server-side
    throw new Error('createClerkSupabaseClient should only be used on client-side. Use createClerkSupabaseServerClient instead.')
  }

  // Return a basic client - token will be handled by the hook version
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client with Clerk session token integration
export const createClerkSupabaseServerClient = async (): Promise<SupabaseClient<Database>> => {
  if (typeof window !== 'undefined') {
    throw new Error('createClerkSupabaseServerClient should only be used on server-side.')
  }

  // Get the authenticated user from Clerk
  const { getToken } = auth()
  
  const token = await getToken({ template: 'supabase' })
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

// Hook for client-side components to get authenticated Supabase client
export function useSupabaseClient(): SupabaseClient<Database> {
  const { session } = useSession()
  
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      if (!session) return null
      
      try {
        const token = await session.getToken({ template: 'supabase' })
        return token
      } catch (error) {
        console.error('Failed to get Clerk session token:', error)
        return null
      }
    },
  })
}

// Service role client (for admin operations only - bypasses RLS)
export const createServiceSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service operations')
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}