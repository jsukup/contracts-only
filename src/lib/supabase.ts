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

// Database helpers
export const createOrUpdateUser = async (user: User): Promise<{ data: SupabaseUser; isNewUser: boolean }> => {
  // Use service client for user creation to handle initial INSERT
  const serviceClient = createServiceSupabaseClient()
  
  // First check if user exists
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id, created_at')
    .eq('id', user.id)
    .single()
  
  const isNewUser = !existingUser
  
  const userData = {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    image: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    email_verified: user.email_confirmed_at || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await serviceClient
    .from('users')
    .upsert(userData, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating/updating user:', {
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      userData: { ...userData, id: userData.id.substring(0, 8) + '...' }
    })
    throw error
  }

  return { data, isNewUser }
}

export type SupabaseUser = Database['public']['Tables']['users']['Row']
export type SupabaseJob = Database['public']['Tables']['jobs']['Row']
export type SupabaseJobApplication = Database['public']['Tables']['job_applications']['Row']
export type SupabaseSkill = Database['public']['Tables']['skills']['Row']
export type SupabaseUserSkill = Database['public']['Tables']['user_skills']['Row']