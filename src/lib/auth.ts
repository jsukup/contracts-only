import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { SupabaseUser } from '@/lib/supabase'

// SERVER-SIDE AUTH - READ-ONLY
// This is used by middleware and server components
// It NEVER creates users - that's handled by AuthContext
// It only reads existing auth state

export interface AuthSession {
  user: SupabaseUser & {
    role: 'USER' | 'ADMIN' | 'RECRUITER'
  }
}

export async function getServerSession(request?: NextRequest): Promise<AuthSession | null> {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get the authenticated user from Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }
    
    // READ-ONLY: Only get existing user data, never create
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle() // Use maybeSingle() to prevent 406 errors
    
    if (userError) {
      console.error('Server: Error fetching user profile:', userError)
      return null
    }
    
    if (!userData) {
      // If user doesn't exist in our DB, return null
      // User creation is handled by AuthContext on the client side
      console.log('Server: User profile not found for:', user.id.substring(0, 8) + '...', 'Will be created by AuthContext')
      return null
    }
    
    return {
      user: userData as SupabaseUser & { role: 'USER' | 'ADMIN' | 'RECRUITER' }
    }
  } catch (error) {
    console.error('Error in getServerSession:', error)
    return null
  }
}

// Legacy compatibility - not used in Supabase auth
export const authOptions = {
  // This is a placeholder for compatibility
  // The actual auth is handled by Supabase
}