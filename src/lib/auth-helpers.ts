'use client'

import { useUser, useSession } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'

/**
 * Client-side authentication helpers to ensure proper auth state before API calls
 */

export interface AuthState {
  isReady: boolean
  isAuthenticated: boolean
  userId: string | null
  sessionId: string | null
  user: any
  error: string | null
}

export interface SessionVerificationResult {
  isValid: boolean
  userId: string | null
  sessionId: string | null
  error: string | null
  verificationTime: number
}

/**
 * Enhanced hook to get comprehensive auth state with debugging and verification
 */
export function useAuthState(): AuthState {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser()
  const { session, isLoaded: sessionLoaded } = useSession()
  
  const authState: AuthState = {
    isReady: userLoaded && sessionLoaded,
    isAuthenticated: isSignedIn && !!user && !!session,
    userId: user?.id || null,
    sessionId: session?.id || null,
    user: user,
    error: null
  }
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH-STATE] Current auth state:', {
      isReady: authState.isReady,
      isAuthenticated: authState.isAuthenticated,
      isSignedIn,
      hasUser: !!user,
      hasSession: !!session,
      hasUserId: !!authState.userId,
      hasSessionId: !!authState.sessionId,
      userLoaded,
      sessionLoaded
    })
  }
  
  return authState
}

/**
 * Hook for comprehensive session verification with retry logic
 */
export function useSessionVerification() {
  const [verificationState, setVerificationState] = useState<SessionVerificationResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const authState = useAuthState()
  
  const verifySession = useCallback(async (maxRetries: number = 3): Promise<SessionVerificationResult> => {
    const verificationId = Math.random().toString(36).substring(7)
    const startTime = Date.now()
    
    console.log(`[SESSION-VERIFY-${verificationId}] Starting session verification...`)
    setIsVerifying(true)
    
    let lastError: string | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SESSION-VERIFY-${verificationId}] Verification attempt ${attempt}/${maxRetries}`)
        
        // Wait for auth state to be ready
        if (!authState.isReady) {
          console.log(`[SESSION-VERIFY-${verificationId}] Auth state not ready, waiting...`)
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        // Check authentication
        if (!authState.isAuthenticated) {
          lastError = 'User is not authenticated'
          console.error(`[SESSION-VERIFY-${verificationId}] Authentication check failed:`, lastError)
          
          // Don't retry authentication failures
          break
        }
        
        // Verify we have required IDs
        if (!authState.userId) {
          lastError = 'User ID not available'
          console.error(`[SESSION-VERIFY-${verificationId}] User ID check failed`)
          continue
        }
        
        if (!authState.sessionId) {
          lastError = 'Session ID not available'
          console.error(`[SESSION-VERIFY-${verificationId}] Session ID check failed`)
          continue
        }
        
        // Additional verification: check if session is still valid by making a test call
        try {
          const testResponse = await fetch('/api/debug/auth', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Session-Verify-Id': verificationId
            }
          })
          
          if (!testResponse.ok) {
            lastError = `Session validation failed: ${testResponse.status}`
            console.error(`[SESSION-VERIFY-${verificationId}] Session test call failed:`, lastError)
            continue
          }
          
          const testData = await testResponse.json()
          
          if (!testData.authResult?.hasUserId) {
            lastError = 'Server-side authentication verification failed'
            console.error(`[SESSION-VERIFY-${verificationId}] Server-side auth failed`)
            continue
          }
          
        } catch (testError) {
          lastError = `Session test error: ${testError instanceof Error ? testError.message : 'Unknown error'}`
          console.error(`[SESSION-VERIFY-${verificationId}] Session test error:`, testError)
          continue
        }
        
        // All checks passed
        const verificationTime = Date.now() - startTime
        console.log(`[SESSION-VERIFY-${verificationId}] Session verification successful in ${verificationTime}ms`)
        
        const result: SessionVerificationResult = {
          isValid: true,
          userId: authState.userId,
          sessionId: authState.sessionId,
          error: null,
          verificationTime
        }
        
        setVerificationState(result)
        setIsVerifying(false)
        return result
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown verification error'
        console.error(`[SESSION-VERIFY-${verificationId}] Verification attempt ${attempt} error:`, error)
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
          console.log(`[SESSION-VERIFY-${verificationId}] Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // All attempts failed
    const verificationTime = Date.now() - startTime
    console.error(`[SESSION-VERIFY-${verificationId}] Session verification failed after ${maxRetries} attempts in ${verificationTime}ms`)
    
    const result: SessionVerificationResult = {
      isValid: false,
      userId: null,
      sessionId: null,
      error: lastError || 'Session verification failed',
      verificationTime
    }
    
    setVerificationState(result)
    setIsVerifying(false)
    return result
    
  }, [authState])
  
  return {
    verifySession,
    verificationState,
    isVerifying,
    authState
  }
}

/**
 * Simple verification helper that doesn't use hooks (for use in effects/handlers)
 */
export function verifyAuthState(user: any, session: any, isLoaded: boolean): SessionVerificationResult {
  const verificationTime = Date.now()
  
  if (!isLoaded) {
    return {
      isValid: false,
      userId: null,
      sessionId: null,
      error: 'Authentication state not loaded',
      verificationTime: 0
    }
  }
  
  if (!user || !session) {
    return {
      isValid: false,
      userId: null,
      sessionId: null,
      error: 'User not authenticated',
      verificationTime: 0
    }
  }
  
  if (!user.id) {
    return {
      isValid: false,
      userId: null,
      sessionId: null,
      error: 'User ID not available',
      verificationTime: 0
    }
  }
  
  return {
    isValid: true,
    userId: user.id,
    sessionId: session.id,
    error: null,
    verificationTime: Date.now() - verificationTime
  }
}

/**
 * Enhanced API call wrapper with authentication verification
 * This version can be used outside of React components
 */
export async function makeAuthenticatedApiCall(
  url: string,
  options: RequestInit = {},
  userId?: string
): Promise<Response> {
  const callId = Math.random().toString(36).substring(7)
  console.log(`[AUTH-API-${callId}] Making authenticated API call to: ${url}`)
  
  // Add debugging headers
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Call-Id': callId,
      'X-Verified-User': userId || '',
      'X-Timestamp': new Date().toISOString(),
      ...options.headers
    }
  }
  
  try {
    const response = await fetch(url, enhancedOptions)
    console.log(`[AUTH-API-${callId}] API call completed:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })
    
    return response
  } catch (error) {
    console.error(`[AUTH-API-${callId}] API call failed:`, error)
    throw error
  }
}