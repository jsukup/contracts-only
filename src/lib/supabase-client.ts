import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'

// Database schema types (keeping existing schema)
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

// Client-side Supabase client that integrates with Clerk authentication
export function createClerkSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      // Custom fetch that includes Clerk session token
      fetch: async (url, options = {}) => {
        // Try to get Clerk session token
        const clerkToken = await getClerkToken()
        
        const clerkSupabaseToken = await generateSupabaseToken(clerkToken)
        
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: clerkSupabaseToken ? `Bearer ${clerkSupabaseToken}` : '',
          },
        })
      },
    },
  })
}

// Hook to use Clerk-authenticated Supabase client
export function useSupabaseClient(): SupabaseClient<Database> {
  const { getToken } = useAuth()
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await getToken({ template: 'supabase' })
        
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: clerkToken ? `Bearer ${clerkToken}` : '',
          },
        })
      },
    },
  })
}

// Server-side Supabase client (for API routes)
export const createServerSupabaseClient = (clerkUserId?: string) => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        // Add Clerk user ID for RLS policies
        ...(clerkUserId && { 'sb-clerk-user-id': clerkUserId }),
      },
    },
  })
}

// Service role client (bypasses RLS for admin operations)
export const createServiceSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

// Helper function to get Clerk token on client side
async function getClerkToken(): Promise<string | null> {
  try {
    // This will only work on the client side
    if (typeof window !== 'undefined' && (window as any).__clerk_session) {
      return await (window as any).__clerk_session.getToken({ template: 'supabase' })
    }
  } catch (error) {
    console.error('Error getting Clerk token:', error)
  }
  return null
}

// Generate Supabase-compatible token from Clerk token
async function generateSupabaseToken(clerkToken: string | null): Promise<string | null> {
  if (!clerkToken) return null
  
  try {
    // For now, we'll use the Clerk token directly
    // In a production setup, you might want to verify and transform the token
    return clerkToken
  } catch (error) {
    console.error('Error generating Supabase token:', error)
    return null
  }
}

export type SupabaseUser = Database['public']['Tables']['users']['Row']
export type SupabaseJob = Database['public']['Tables']['jobs']['Row']
export type SupabaseJobApplication = Database['public']['Tables']['job_applications']['Row']
export type SupabaseSkill = Database['public']['Tables']['skills']['Row']
export type SupabaseUserSkill = Database['public']['Tables']['user_skills']['Row']