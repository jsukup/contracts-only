/**
 * Utility functions for robust profile creation with multiple fallback methods
 */

import { createUserProfile } from './actions/profile-actions'

export interface ProfileCreationResult {
  success: boolean
  error?: string
  method?: 'server_action' | 'api_call' | 'webhook'
  requestId?: string
  processingTime?: number
}

/**
 * Comprehensive profile creation with multiple fallback methods
 */
export async function createProfileWithFallbacks(
  role: 'USER' | 'RECRUITER',
  source: string = 'unknown'
): Promise<ProfileCreationResult> {
  const operationId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  console.log(`[PROFILE-CREATION-${operationId}] Starting comprehensive profile creation`)
  console.log(`[PROFILE-CREATION-${operationId}] Source: ${source}, Role: ${role}`)
  
  let lastError: Error | null = null
  
  // Method 1: Server Action (most reliable - bypasses API route issues)
  try {
    console.log(`[PROFILE-CREATION-${operationId}] Attempting server action...`)
    const result = await createUserProfile(role)
    
    if (result.success) {
      const totalTime = Date.now() - startTime
      console.log(`[PROFILE-CREATION-${operationId}] Server action successful in ${totalTime}ms`)
      return {
        success: true,
        method: 'server_action',
        requestId: result.actionId,
        processingTime: totalTime
      }
    } else {
      console.error(`[PROFILE-CREATION-${operationId}] Server action failed:`, result.error)
      lastError = new Error(`Server action failed: ${result.error}`)
    }
  } catch (error) {
    console.error(`[PROFILE-CREATION-${operationId}] Server action error:`, error)
    lastError = error instanceof Error ? error : new Error('Server action unknown error')
  }
  
  // Method 2: API Call with exponential backoff retry
  console.log(`[PROFILE-CREATION-${operationId}] Falling back to API call with retry logic...`)
  
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[PROFILE-CREATION-${operationId}] API attempt ${attempt}/${maxRetries}`)
      
      const response = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': `${operationId}-api-${attempt}`,
          'X-Auth-Source': source,
          'X-Retry-Attempt': (attempt - 1).toString(),
          'X-Fallback-Method': 'true'
        },
        body: JSON.stringify({ role })
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        const totalTime = Date.now() - startTime
        console.log(`[PROFILE-CREATION-${operationId}] API call successful on attempt ${attempt} in ${totalTime}ms`)
        return {
          success: true,
          method: 'api_call',
          requestId: responseData.requestId || operationId,
          processingTime: totalTime
        }
      } else {
        console.error(`[PROFILE-CREATION-${operationId}] API attempt ${attempt} failed:`, {
          status: response.status,
          error: responseData.error,
          requestId: responseData.requestId
        })
        
        // Check for profile already exists (success case)
        if (response.status === 409 || responseData.error?.includes('already exists')) {
          const totalTime = Date.now() - startTime
          console.log(`[PROFILE-CREATION-${operationId}] Profile already exists - treating as success`)
          return {
            success: true,
            method: 'api_call',
            requestId: responseData.requestId || operationId,
            processingTime: totalTime
          }
        }
        
        lastError = new Error(`API call failed: ${responseData.error}`)
        
        // Don't retry on certain errors
        if (response.status === 400 || response.status === 403) {
          console.log(`[PROFILE-CREATION-${operationId}] Non-retryable error, stopping retries`)
          break
        }
      }
    } catch (error) {
      console.error(`[PROFILE-CREATION-${operationId}] API attempt ${attempt} error:`, error)
      lastError = error instanceof Error ? error : new Error('API call unknown error')
    }
    
    // Wait before next retry (exponential backoff with jitter)
    if (attempt < maxRetries) {
      const baseDelay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
      const jitter = Math.random() * 1000 // 0-1s jitter
      const delay = baseDelay + jitter
      
      console.log(`[PROFILE-CREATION-${operationId}] Waiting ${Math.round(delay)}ms before retry ${attempt + 1}...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // All methods failed
  const totalTime = Date.now() - startTime
  console.error(`[PROFILE-CREATION-${operationId}] All profile creation methods failed after ${totalTime}ms`)
  
  return {
    success: false,
    error: lastError?.message || 'All profile creation methods failed',
    processingTime: totalTime
  }
}

/**
 * Verify profile exists in database
 */
export async function verifyProfileExists(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    return response.ok
  } catch (error) {
    console.error('Error verifying profile exists:', error)
    return false
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUserProfile(): Promise<any> {
  try {
    const response = await fetch('/api/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      return await response.json()
    } else {
      throw new Error(`Failed to fetch profile: ${response.status}`)
    }
  } catch (error) {
    console.error('Error fetching current user profile:', error)
    throw error
  }
}