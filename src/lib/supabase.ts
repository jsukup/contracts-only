import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

// Database schema types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          email_verified: string | null
          name: string | null
          image: string | null
          role: 'USER' | 'ADMIN' | 'RECRUITER'
          created_at: string
          updated_at: string
          title: string | null
          bio: string | null
          location: string | null
          website: string | null
          linkedin_url: string | null
          hourly_rate_min: number | null
          hourly_rate_max: number | null
          availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'
          job_alerts_enabled: boolean
          desired_rate_min: number | null
          desired_rate_max: number | null
        }
        Insert: {
          id?: string
          email: string
          email_verified?: string | null
          name?: string | null
          image?: string | null
          role?: 'USER' | 'ADMIN' | 'RECRUITER'
          created_at?: string
          updated_at?: string
          title?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          linkedin_url?: string | null
          hourly_rate_min?: number | null
          hourly_rate_max?: number | null
          availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'
          job_alerts_enabled?: boolean
          desired_rate_min?: number | null
          desired_rate_max?: number | null
        }
        Update: {
          id?: string
          email?: string
          email_verified?: string | null
          name?: string | null
          image?: string | null
          role?: 'USER' | 'ADMIN' | 'RECRUITER'
          created_at?: string
          updated_at?: string
          title?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          linkedin_url?: string | null
          hourly_rate_min?: number | null
          hourly_rate_max?: number | null
          availability?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'
          job_alerts_enabled?: boolean
          desired_rate_min?: number | null
          desired_rate_max?: number | null
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          description: string
          company: string
          location: string | null
          is_remote: boolean
          job_type: 'CONTRACT' | 'FREELANCE' | 'PART_TIME' | 'FULL_TIME'
          hourly_rate_min: number
          hourly_rate_max: number
          currency: string
          contract_duration: string | null
          hours_per_week: number | null
          start_date: string | null
          requirements: string | null
          is_active: boolean
          is_featured: boolean
          featured_until: string | null
          poster_id: string
          created_at: string
          updated_at: string
          application_deadline: string | null
          view_count: number
          experience_level: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD'
        }
        Insert: {
          id?: string
          title: string
          description: string
          company: string
          location?: string | null
          is_remote?: boolean
          job_type?: 'CONTRACT' | 'FREELANCE' | 'PART_TIME' | 'FULL_TIME'
          hourly_rate_min: number
          hourly_rate_max: number
          currency?: string
          contract_duration?: string | null
          hours_per_week?: number | null
          start_date?: string | null
          requirements?: string | null
          is_active?: boolean
          is_featured?: boolean
          featured_until?: string | null
          poster_id: string
          created_at?: string
          updated_at?: string
          application_deadline?: string | null
          view_count?: number
          experience_level?: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD'
        }
        Update: {
          id?: string
          title?: string
          description?: string
          company?: string
          location?: string | null
          is_remote?: boolean
          job_type?: 'CONTRACT' | 'FREELANCE' | 'PART_TIME' | 'FULL_TIME'
          hourly_rate_min?: number
          hourly_rate_max?: number
          currency?: string
          contract_duration?: string | null
          hours_per_week?: number | null
          start_date?: string | null
          requirements?: string | null
          is_active?: boolean
          is_featured?: boolean
          featured_until?: string | null
          poster_id?: string
          created_at?: string
          updated_at?: string
          application_deadline?: string | null
          view_count?: number
          experience_level?: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD'
        }
      }
      job_applications: {
        Row: {
          id: string
          job_id: string
          applicant_id: string
          status: 'PENDING' | 'REVIEWED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED'
          cover_letter: string | null
          resume_url: string | null
          expected_rate: number | null
          availability_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          applicant_id: string
          status?: 'PENDING' | 'REVIEWED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED'
          cover_letter?: string | null
          resume_url?: string | null
          expected_rate?: number | null
          availability_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          applicant_id?: string
          status?: 'PENDING' | 'REVIEWED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED'
          cover_letter?: string | null
          resume_url?: string | null
          expected_rate?: number | null
          availability_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      skills: {
        Row: {
          id: string
          name: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          created_at?: string
        }
      }
      user_skills: {
        Row: {
          id: string
          user_id: string
          skill_id: string
          proficiency_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
          years_experience: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skill_id: string
          proficiency_level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
          years_experience?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          skill_id?: string
          proficiency_level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
          years_experience?: number | null
          created_at?: string
        }
      }
    }
  }
}

// Environment validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// Client-side Supabase client
export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

// Server-side Supabase client (for API routes)
export const createServerSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

// Service role client (bypasses RLS for admin operations)
export const createServiceSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found, falling back to anon key')
    return createServerSupabaseClient()
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

// Helper functions for common operations
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Error getting current user:', error)
    return null
  }
  
  return user
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export const signInWithGoogle = async (redirectTo?: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/dashboard`,
    },
  })
  
  if (error) {
    console.error('Error signing in with Google:', error)
    throw error
  }
  
  return data
}

export const deleteUserProfile = async (): Promise<void> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('No authenticated user found')
    }
    
    console.log('Starting user deletion process for:', user.id.substring(0, 8) + '...')
    
    // First, delete from public.users table (this will cascade to related data)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)
    
    if (deleteError) {
      console.error('Error deleting user profile:', deleteError)
      throw deleteError
    }
    
    // Then delete from auth.users (this removes the authentication)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      // Continue even if auth deletion fails - user profile is already deleted
      console.warn('User profile deleted but auth user deletion failed')
    }
    
    // Sign out the user
    await supabase.auth.signOut()
    
    console.log('User deletion completed successfully')
  } catch (error) {
    console.error('Error in deleteUserProfile:', error)
    throw error
  }
}

// Database helpers
export const createOrUpdateUser = async (user: User): Promise<{ data: SupabaseUser; isNewUser: boolean }> => {
  try {
    // Use regular supabase client since we now have RLS policies and triggers
    const client = supabase
    
    // First check if user exists
    const { data: existingUser, error: checkError } = await client
      .from('users')
      .select('id, created_at')
      .eq('id', user.id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing user:', checkError)
      throw checkError
    }
    
    const isNewUser = !existingUser
    
    const userData = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      email_verified: user.email_confirmed_at || null,
      role: (user.user_metadata?.role as 'USER' | 'ADMIN' | 'RECRUITER') || 'USER',
      updated_at: new Date().toISOString(),
    }

    // Use upsert to handle both insert and update cases
    const { data, error } = await client
      .from('users')
      .upsert(userData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting user:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        userId: user.id.substring(0, 8) + '...',
        userEmail: user.email
      })
      throw error
    }

    if (!data) {
      throw new Error('User upsert succeeded but returned no data')
    }

    console.log(`User ${isNewUser ? 'created' : 'updated'} successfully:`, {
      userId: user.id.substring(0, 8) + '...',
      email: user.email,
      isNewUser
    })

    return { data, isNewUser }
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error)
    throw error
  }
}

export type SupabaseUser = Database['public']['Tables']['users']['Row']
export type SupabaseJob = Database['public']['Tables']['jobs']['Row']
export type SupabaseJobApplication = Database['public']['Tables']['job_applications']['Row']
export type SupabaseSkill = Database['public']['Tables']['skills']['Row']
export type SupabaseUserSkill = Database['public']['Tables']['user_skills']['Row']