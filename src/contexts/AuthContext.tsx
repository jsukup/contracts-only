"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, SupabaseUser } from '@/lib/supabase'
import { trackUserRegistration, trackEvent } from '@/lib/gtag'
import { useToast } from '@/components/ui/Toast'

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
  showRoleSelection: boolean
  setShowRoleSelection: (show: boolean) => void
  updateUserRole: (role: 'USER' | 'RECRUITER') => Promise<void>
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
  showRoleSelection: false,
  setShowRoleSelection: () => {},
  updateUserRole: async () => {},
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
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  
  // Track component mount status to prevent memory leaks
  const mountedRef = useRef(true)

  // Safe setState functions to prevent memory leaks
  const safeSetUser = (user: User | null) => {
    if (mountedRef.current) setUser(user)
  }
  
  const safeSetUserProfile = (profile: SupabaseUser | null) => {
    if (mountedRef.current) setUserProfile(profile)
  }
  
  const safeSetSession = (session: Session | null) => {
    if (mountedRef.current) setSession(session)
  }
  
  const safeSetLoading = (loading: boolean) => {
    if (mountedRef.current) setLoading(loading)
  }
  
  const safeSetError = (error: AuthError | null) => {
    if (mountedRef.current) setError(error)
  }

  // UNIFIED USER PROFILE MANAGEMENT
  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<SupabaseUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle() instead of single() to avoid PGRST116 errors

      if (error) {
        console.error('Error fetching user profile:', {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: userId.substring(0, 8) + '...'
        })
        return null
      }

      // data will be null if no user found, which is expected for new users
      if (!data) {
        console.log('No user profile found for:', userId.substring(0, 8) + '...')
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

      // Use upsert to handle conflicts gracefully - this prevents 409 errors
      const { data, error } = await supabase
        .from('users')
        .upsert(userData, {
          onConflict: 'id', // Handle conflicts on the id field
          ignoreDuplicates: false // Update if user already exists
        })
        .select()
        .single()

      if (error) {
        // If upsert still fails, try to fetch the existing user
        if (error.code === '23505') { // Unique constraint violation
          console.log('User already exists, fetching existing profile')
          return await fetchUserProfile(authUser.id)
        }
        
        console.error('Error creating user profile:', {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: authUser.id.substring(0, 8) + '...'
        })
        
        // Don't throw error, try to return existing user instead
        return await fetchUserProfile(authUser.id)
      }

      console.log('User profile created/updated successfully:', {
        userId: authUser.id.substring(0, 8) + '...',
        email: authUser.email
      })

      return data
    } catch (error) {
      console.error('Error in createUserProfile:', error)
      // As a last resort, try to fetch existing user profile
      try {
        return await fetchUserProfile(authUser.id)
      } catch {
        return null
      }
    }
  }

  // Refresh user profile data
  const refreshUserProfile = async () => {
    if (!user) return
    
    try {
      const profile = await fetchUserProfile(user.id)
      safeSetUserProfile(profile)
    } catch (error) {
      console.error('Error refreshing user profile:', error)
    }
  }

  // Update user role - used for OAuth role selection
  const updateUserRole = async (role: 'USER' | 'RECRUITER') => {
    try {
      if (!user) {
        throw new Error('No authenticated user found')
      }

      console.log('Updating user role to:', role, 'for user:', user.id.substring(0, 8) + '...')

      // Update the user profile in the database
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update({ 
          role,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user role:', error)
        throw error
      }

      // Update local state
      safeSetUserProfile(updatedUser)
      setShowRoleSelection(false)

      console.log('User role updated successfully to:', role)
      
      // Navigate to dashboard
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard?welcome=true'
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      safeSetError(error as AuthError)
      throw error
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
          safeSetError(error)
        } else {
          safeSetSession(session)
          safeSetUser(session?.user ?? null)
          
          if (session?.user) {
            await handleUserAuth(session.user, 'INITIAL_SESSION')
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        safeSetError(error as AuthError)
      } finally {
        safeSetLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email, 'Email confirmed:', !!session?.user?.email_confirmed_at)
      
      try {
        safeSetSession(session)
        safeSetUser(session?.user ?? null)
        safeSetError(null)
        
        if (session?.user) {
          // Set loading to true while handling user auth
          safeSetLoading(true)
          await handleUserAuth(session.user, event)
        } else {
          safeSetUserProfile(null)
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error)
        safeSetError(error as AuthError)
      } finally {
        // Always set loading to false after handling auth state change
        safeSetLoading(false)
        
        // For OAuth redirects, refresh the page to ensure proper navigation
        if (event === 'SIGNED_IN' && typeof window !== 'undefined') {
          // Check if we're on an auth callback page
          if (window.location.pathname.includes('/auth/') || window.location.search.includes('code=')) {
            // Small delay to ensure auth state is fully processed
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 100)
          }
        }
      }
    })

    return () => {
      mountedRef.current = false // Mark component as unmounted
      subscription.unsubscribe()
    }
  }, [])

  // UNIFIED USER AUTHENTICATION HANDLER
  // This handles all user authentication events in one place
  const handleUserAuth = async (authUser: User, event: string) => {
    try {
      console.log(`Handling auth for user ${authUser.id.substring(0, 8)}... Event: ${event}`)
      
      // First, try to fetch existing user profile
      let profile = await fetchUserProfile(authUser.id)
      let isNewUser = false
      
      // If no profile exists, create one
      if (!profile) {
        console.log('No profile found, creating new user profile')
        profile = await createUserProfile(authUser)
        isNewUser = true
        
        // For OAuth users, show role selection if they're new and don't have a role
        const isOAuthUser = authUser.app_metadata?.provider !== 'email'
        if (isNewUser && isOAuthUser && (!profile?.role || profile.role === 'USER')) {
          console.log('New OAuth user detected, showing role selection')
          setShowRoleSelection(true)
          safeSetUserProfile(profile)
          return // Don't proceed with navigation until role is selected
        }
      } else {
        console.log('Existing profile found, updating if needed')
        
        // Update profile with latest auth data if email was just verified
        if (authUser.email_confirmed_at && !profile.email_verified) {
          console.log('Email verification detected, updating profile')
          
          const { error } = await supabase
            .from('users')
            .update({ 
              email_verified: authUser.email_confirmed_at,
              updated_at: new Date().toISOString() 
            })
            .eq('id', authUser.id)
          
          if (!error) {
            // Refresh the profile with updated data
            profile = await fetchUserProfile(authUser.id)
          }
        }
      }
      
      safeSetUserProfile(profile)
      
      // Track analytics for auth events
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        const userType = profile?.role === 'RECRUITER' ? 'recruiter' : 'contractor'
        const provider = authUser.app_metadata?.provider || 'email'
        
        if (isNewUser) {
          console.log('Tracking new user registration')
          // Track new user registration
          trackUserRegistration({
            userType,
            registrationMethod: provider === 'google' ? 'google_oauth' : 'email_password'
          })
        } else if (event === 'SIGNED_IN') {
          console.log('Tracking user login')
          // Track existing user login
          trackEvent('user_login', 'Authentication', provider, 1, {
            user_type: userType,
            login_method: provider,
            user_id: authUser.id
          })
        }
      }
      
      console.log(`Auth handling completed for user ${authUser.id.substring(0, 8)}...`)
      
    } catch (error) {
      console.error('Error handling user auth:', error)
      safeSetError(error as AuthError)
      // Don't throw error to prevent breaking the auth flow
      // The auth state change handler will catch this and continue
      return
    }
  }

  // Sign in with Google
  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      safeSetLoading(true)
      safeSetError(null)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo || `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        safeSetError(error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error signing in with Google:', error)
      safeSetError(error as AuthError)
      throw error
    } finally {
      safeSetLoading(false)
    }
  }

  // Sign in with email/password
  const signInWithEmail = async (email: string, password: string) => {
    try {
      safeSetLoading(true)
      safeSetError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        safeSetError(error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error signing in with email:', error)
      safeSetError(error as AuthError)
      throw error
    } finally {
      safeSetLoading(false)
    }
  }

  // Sign up with email/password
  const signUpWithEmail = async (email: string, password: string, name: string, role: string) => {
    try {
      safeSetLoading(true)
      safeSetError(null)
      
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
        safeSetError(error)
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
      safeSetError(error as AuthError)
      throw error
    } finally {
      safeSetLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      safeSetLoading(true)
      safeSetError(null)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        safeSetError(error)
        throw error
      }
    } catch (error) {
      console.error('Error signing out:', error)
      safeSetError(error as AuthError)
      throw error
    } finally {
      safeSetLoading(false)
    }
  }

  // UNIFIED DELETE USER PROFILE
  const deleteUserProfile = async () => {
    try {
      safeSetLoading(true)
      safeSetError(null)
      
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
      safeSetUser(null)
      safeSetUserProfile(null)
      safeSetSession(null)
      
      console.log('User deletion completed successfully')
    } catch (error) {
      console.error('Error deleting user profile:', error)
      safeSetError(error as AuthError)
      throw error
    } finally {
      safeSetLoading(false)
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
    showRoleSelection,
    setShowRoleSelection,
    updateUserRole,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}