"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, createOrUpdateUser, deleteUserProfile as deleteUserProfileLib, SupabaseUser } from '@/lib/supabase'
import { trackUserRegistration, trackEvent } from '@/lib/gtag'

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

  // Fetch user profile from our users table
  const fetchUserProfile = async (userId: string): Promise<SupabaseUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
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

  // Handle auth state changes
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
            // Create or update user in our users table
            const { data: userData } = await createOrUpdateUser(session.user)
            // Fetch complete user profile
            const profile = await fetchUserProfile(session.user.id)
            setUserProfile(profile)
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
        try {
          // Create or update user in our users table
          const { isNewUser } = await createOrUpdateUser(session.user)
          
          // Fetch complete user profile
          const profile = await fetchUserProfile(session.user.id)
          setUserProfile(profile)
          
          // Track Google OAuth login/registration for analytics
          if (event === 'SIGNED_IN' && session.user.app_metadata.provider === 'google') {
            const userType = profile?.role === 'EMPLOYER' ? 'employer' : 'contractor'
            
            if (isNewUser) {
              // Track new user registration via Google OAuth
              trackUserRegistration({
                userType,
                registrationMethod: 'google_oauth'
              })
            } else {
              // Track existing user login via Google OAuth
              trackEvent('user_login', 'Authentication', 'google_oauth', 1, {
                user_type: userType,
                login_method: 'google_oauth',
                user_id: session.user.id
              })
            }
          }
        } catch (error) {
          console.error('Error handling auth state change:', error)
          setError(error as AuthError)
        }
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

  // Delete user profile
  const deleteUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await deleteUserProfileLib()
      
      // Clear local state after successful deletion
      setUser(null)
      setUserProfile(null)
      setSession(null)
      
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