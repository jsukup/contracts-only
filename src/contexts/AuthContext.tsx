"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, SupabaseUser } from '@/lib/supabase'
import { trackUserRegistration, trackEvent } from '@/lib/gtag'

// UNIFIED AUTHENTICATION CONTEXT - SINGLE SOURCE OF TRUTH
// This is the ONLY place where user creation and management happens
// No triggers, no server-side user creation, no conflicts

interface AuthContextType {
  user: User | null
  userProfile: SupabaseUser | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name: string, role: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  deleteUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  session: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  refreshUserProfile: async () => {},
  deleteUserProfile: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  // UNIFIED USER PROFILE MANAGEMENT
  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<SupabaseUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No user profile found - this is expected for new users
          console.log('No user profile found for:', userId.substring(0, 8) + '...')
          return null
        }
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
    }
  }

  // UNIFIED USER CREATION - SINGLE SOURCE OF TRUTH
  // This is the ONLY place where user profiles are created
  const createUserProfile = async (authUser: User): Promise<SupabaseUser | null> => {
    try {
      console.log('Creating user profile for:', authUser.id.substring(0, 8) + '...', authUser.email)
      
      const userData = {
        id: authUser.id,
        email: authUser.email!,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
        image: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        email_verified: authUser.email_confirmed_at || null,
        role: (authUser.user_metadata?.role as 'USER' | 'ADMIN' | 'RECRUITER') || 'USER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: authUser.id.substring(0, 8) + '...'
        })
        throw error
      }

      console.log('User profile created successfully:', {
        userId: authUser.id.substring(0, 8) + '...',
        email: authUser.email
      })

      return data
    } catch (error) {
      console.error('Error in createUserProfile:', error)
      throw error
    }
  }

  // Refresh user profile data
  const refreshUserProfile = async () => {
    if (!user) return
    
    try {
      const profile = await fetchUserProfile(user.id)
      setUserProfile(profile)
    } catch (error) {
      console.error('Error refreshing user profile:', error)
    }
  }

  // UNIFIED AUTH STATE MANAGEMENT
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setError(error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await handleUserAuth(session.user, 'INITIAL_SESSION')
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setError(error as AuthError)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)
      
      setSession(session)
      setUser(session?.user ?? null)
      setError(null)
      
      if (session?.user) {
        await handleUserAuth(session.user, event)
      } else {
        setUserProfile(null)
      }
      
      // Set loading to false for all auth events to ensure UI updates
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // UNIFIED USER AUTHENTICATION HANDLER
  // This handles all user authentication events in one place
  const handleUserAuth = async (authUser: User, event: string) => {
    try {
      // First, try to fetch existing user profile
      let profile = await fetchUserProfile(authUser.id)
      let isNewUser = false
      
      // If no profile exists, create one
      if (!profile) {
        console.log('No profile found, creating new user profile')
        profile = await createUserProfile(authUser)
        isNewUser = true
      }
      
      setUserProfile(profile)
      
      // Track analytics for auth events
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const userType = profile?.role === 'RECRUITER' ? 'recruiter' : 'contractor'
        const provider = authUser.app_metadata?.provider || 'email'
        
        if (isNewUser) {
          // Track new user registration
          trackUserRegistration({
            userType,
            registrationMethod: provider === 'google' ? 'google_oauth' : 'email_password'
          })
        } else if (event === 'SIGNED_IN') {
          // Track existing user login
          trackEvent('user_login', 'Authentication', provider, 1, {
            user_type: userType,
            login_method: provider,
            user_id: authUser.id
          })
        }
      }
    } catch (error) {
      console.error('Error handling user auth:', error)
      setError(error as AuthError)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error signing in with Google:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign in with email/password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error signing in with email:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email/password
  const signUpWithEmail = async (email: string, password: string, name: string, role: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard?welcome=true`,
          data: {
            full_name: name,
            role: role,
          }
        }
      })

      if (error) {
        setError(error)
        throw error
      }

      // Track user registration
      if (data.user) {
        trackUserRegistration(data.user.id)
        trackEvent('sign_up', {
          method: 'email',
          user_role: role
        })
      }

      return data
    } catch (error) {
      console.error('Error signing up with email:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        setError(error)
        throw error
      }
    } catch (error) {
      console.error('Error signing out:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // UNIFIED DELETE USER PROFILE
  const deleteUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user) {
        throw new Error('No authenticated user found')
      }
      
      console.log('Starting user deletion process for:', user.id.substring(0, 8) + '...')
      
      // Delete from public.users table (cascade will handle related data)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)
      
      if (deleteError) {
        console.error('Error deleting user profile:', deleteError)
        throw deleteError
      }
      
      // Sign out the user (this will also clear the auth.users entry if needed)
      await supabase.auth.signOut()
      
      // Clear local state
      setUser(null)
      setUserProfile(null)
      setSession(null)
      
      console.log('User deletion completed successfully')
    } catch (error) {
      console.error('Error deleting user profile:', error)
      setError(error as AuthError)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshUserProfile,
    deleteUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}