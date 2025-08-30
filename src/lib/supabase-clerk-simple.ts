import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import { useUser } from '@clerk/nextjs'
import type { Database } from './supabase'

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

/**
 * Creates a Supabase client for server-side use with Clerk user ID
 * This bypasses JWT complexity by using service role + manual user ID filtering
 */
export const createClerkSupabaseServerClient = async (): Promise<{
  supabase: SupabaseClient<Database>
  userId: string | null
}> => {
  if (typeof window !== 'undefined') {
    throw new Error('This function should only be used on server-side.')
  }

  try {
    // Get the authenticated user from Clerk
    const authResult = auth()
    const userId = authResult?.userId || null
    
    if (!userId) {
      console.error('No authenticated user found in Clerk auth()')
      // Return anon client with no user
      return {
        supabase: createClient<Database>(supabaseUrl, supabaseAnonKey),
        userId: null
      }
    }
    
    // For authenticated requests, we use the service role key
    // and manually filter by user ID in our queries
    const supabase = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    )
    
    return { supabase, userId }
  } catch (error) {
    console.error('Error creating Clerk-Supabase client:', error)
    // Return anon client on error
    return {
      supabase: createClient<Database>(supabaseUrl, supabaseAnonKey),
      userId: null
    }
  }
}

/**
 * Hook for client-side components
 * Returns Supabase client and current user ID from Clerk
 */
export function useSupabaseWithClerk() {
  const { user } = useUser()
  
  // Create a standard Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
  
  return {
    supabase,
    userId: user?.id || null,
    userEmail: user?.primaryEmailAddress?.emailAddress || null
  }
}

/**
 * Service role client for admin operations
 * Only use this for operations that need to bypass all security
 */
export const createServiceSupabaseClient = () => {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service operations')
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}