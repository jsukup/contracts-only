'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase-clerk-simple'

/**
 * Server action for creating user profiles
 * This bypasses API route issues and uses direct server-side auth
 */
export async function createUserProfile(role: 'USER' | 'RECRUITER') {
  const actionId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  console.log(`[ACTION-${actionId}] Profile creation server action started at ${new Date().toISOString()}`)
  
  try {
    console.log(`[ACTION-${actionId}] Getting authenticated user info...`)
    
    // Try both auth() and currentUser() to see which works better
    const authInfo = auth()
    console.log(`[ACTION-${actionId}] auth() result:`, {
      hasUserId: !!authInfo?.userId,
      userId: authInfo?.userId ? `${authInfo.userId.substring(0, 8)}...` : null,
      hasSessionId: !!authInfo?.sessionId
    })
    
    const user = await currentUser()
    console.log(`[ACTION-${actionId}] currentUser() result:`, {
      hasUser: !!user,
      userId: user?.id ? `${user.id.substring(0, 8)}...` : null,
      email: user?.emailAddresses?.[0]?.emailAddress,
      firstName: user?.firstName,
      lastName: user?.lastName
    })
    
    if (!authInfo?.userId && !user?.id) {
      console.error(`[ACTION-${actionId}] No user ID from either auth() or currentUser()`)
      return { 
        error: 'Unauthorized - No user ID found',
        actionId,
        timestamp: new Date().toISOString()
      }
    }
    
    const userId = authInfo?.userId || user?.id
    if (!userId) {
      return { 
        error: 'Unauthorized - Could not determine user ID',
        actionId 
      }
    }
    
    console.log(`[ACTION-${actionId}] Using user ID: ${userId.substring(0, 8)}...`)
    
    // Validate role
    if (!role || !['USER', 'RECRUITER'].includes(role)) {
      console.error(`[ACTION-${actionId}] Invalid role provided:`, { role })
      return { 
        error: 'Invalid role',
        actionId,
        validRoles: ['USER', 'RECRUITER']
      }
    }
    
    // Get user data (prefer currentUser() data if available)
    let userData
    if (user) {
      userData = {
        id: userId,
        email: user.emailAddresses[0]?.emailAddress || '',
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.username || '',
        image: user.imageUrl || null,
        email_verified: user.emailAddresses[0]?.verification?.status === 'complete' 
          ? new Date().toISOString() 
          : null,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        availability: 'AVAILABLE' as const,
        job_alerts_enabled: true
      }
      
      console.log(`[ACTION-${actionId}] Using currentUser() data for profile creation`)
    } else {
      // Fallback: fetch from Clerk API
      console.log(`[ACTION-${actionId}] Fallback: fetching from Clerk API...`)
      const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!clerkResponse.ok) {
        const errorText = await clerkResponse.text()
        console.error(`[ACTION-${actionId}] Clerk API error:`, clerkResponse.status, errorText)
        return { 
          error: 'Failed to fetch user data',
          actionId,
          details: `Clerk API error: ${clerkResponse.status}`
        }
      }

      const clerkUser = await clerkResponse.json()
      
      userData = {
        id: userId,
        email: clerkUser.email_addresses[0]?.email_address || '',
        name: clerkUser.first_name && clerkUser.last_name 
          ? `${clerkUser.first_name} ${clerkUser.last_name}`
          : clerkUser.first_name || clerkUser.username || '',
        image: clerkUser.image_url || null,
        email_verified: clerkUser.email_addresses[0]?.verification?.status === 'verified' 
          ? new Date().toISOString() 
          : null,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        availability: 'AVAILABLE' as const,
        job_alerts_enabled: true
      }
      
      console.log(`[ACTION-${actionId}] Using Clerk API data for profile creation`)
    }
    
    console.log(`[ACTION-${actionId}] Prepared user data:`, {
      id: userData.id.substring(0, 8) + '...',
      email: userData.email,
      name: userData.name,
      role: userData.role,
      hasImage: !!userData.image,
      emailVerified: !!userData.email_verified
    })

    // Create user profile in Supabase
    console.log(`[ACTION-${actionId}] Creating Supabase profile...`)
    const supabase = createServiceSupabaseClient()
    const supabaseStartTime = Date.now()
    
    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    const supabaseDuration = Date.now() - supabaseStartTime
    console.log(`[ACTION-${actionId}] Supabase operation completed in ${supabaseDuration}ms`)

    if (error) {
      console.error(`[ACTION-${actionId}] Supabase error:`, {
        error,
        message: error.message,
        details: error.details,
        code: error.code
      })
      return { 
        error: 'Failed to create profile',
        actionId,
        details: error.message
      }
    }

    const totalDuration = Date.now() - startTime
    console.log(`[ACTION-${actionId}] Profile created successfully:`, { 
      userId: data.id.substring(0, 8) + '...', 
      role: data.role,
      email: data.email,
      totalProcessingTime: `${totalDuration}ms`
    })

    return { 
      success: true,
      user: data,
      actionId,
      processingTime: totalDuration
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`[ACTION-${actionId}] Server action error:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${totalDuration}ms`
    })
    
    return { 
      error: 'Internal server error',
      actionId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}