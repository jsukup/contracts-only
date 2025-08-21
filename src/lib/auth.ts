import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { SupabaseUser } from '@/lib/supabase'

export interface AuthSession {
  user: SupabaseUser & {
    role: 'USER' | 'ADMIN' | 'RECRUITER'
  }
}

export async function getServerSession(request?: NextRequest): Promise<AuthSession | null> {
  const supabase = createServerSupabaseClient()
  
  // Get the authenticated user from Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return null
  }
  
  // Get the full user data from the users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (userError || !userData) {
    // If user doesn't exist in our DB, create them
    const newUser = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      email_verified: user.email_confirmed_at || null,
      role: 'USER' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single()
    
    if (createError || !createdUser) {
      console.error('Error creating user:', createError)
      return null
    }
    
    return {
      user: createdUser as SupabaseUser & { role: 'USER' | 'ADMIN' | 'RECRUITER' }
    }
  }
  
  return {
    user: userData as SupabaseUser & { role: 'USER' | 'ADMIN' | 'RECRUITER' }
  }
}

// For compatibility with existing code that might expect authOptions
export const authOptions = {
  // This is a placeholder for compatibility
  // The actual auth is handled by Supabase
}