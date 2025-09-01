import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase-clerk-simple'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)
  
  // Comprehensive request logging
  console.log(`[${requestId}] Profile creation request started at ${new Date().toISOString()}`)
  
  try {
    // Log request details
    console.log(`[${requestId}] Request details:`, {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      contentType: req.headers.get('content-type')
    })

    // Check environment variables
    console.log(`[${requestId}] Environment check:`, {
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      clerkSecretKeyLength: process.env.CLERK_SECRET_KEY?.length,
      hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    })

    // Get the authenticated user from Clerk with detailed logging
    console.log(`[${requestId}] Calling auth() function...`)
    const authStartTime = Date.now()
    
    let authResult
    try {
      authResult = auth()
      console.log(`[${requestId}] auth() completed in ${Date.now() - authStartTime}ms`)
      console.log(`[${requestId}] auth() result:`, {
        hasUserId: !!authResult?.userId,
        userId: authResult?.userId ? `${authResult.userId.substring(0, 8)}...` : null,
        hasSessionId: !!authResult?.sessionId,
        sessionId: authResult?.sessionId ? `${authResult.sessionId.substring(0, 8)}...` : null,
        hasOrgId: !!authResult?.orgId,
        authResultKeys: Object.keys(authResult || {})
      })
    } catch (authError) {
      console.error(`[${requestId}] auth() function failed:`, {
        error: authError,
        message: authError instanceof Error ? authError.message : 'Unknown error',
        stack: authError instanceof Error ? authError.stack : undefined
      })
      throw authError
    }

    const { userId } = authResult
    
    if (!userId) {
      console.error(`[${requestId}] Profile creation failed: No userId from Clerk auth`)
      console.error(`[${requestId}] Full auth result for debugging:`, authResult)
      
      // Additional debugging: try to get user info from cookies/headers
      const cookieHeader = req.headers.get('cookie')
      console.error(`[${requestId}] Cookie debugging:`, {
        hasCookies: !!cookieHeader,
        cookieCount: cookieHeader ? cookieHeader.split(';').length : 0,
        clerkCookies: cookieHeader ? cookieHeader.split(';')
          .filter(c => c.trim().startsWith('__clerk') || c.trim().startsWith('__session'))
          .map(c => c.trim().split('=')[0]) : []
      })
      
      return NextResponse.json({ 
        error: 'Unauthorized - No user ID',
        requestId,
        timestamp: new Date().toISOString(),
        debugInfo: {
          authResultPresent: !!authResult,
          authResultKeys: Object.keys(authResult || {}),
          processingTime: Date.now() - startTime
        }
      }, { status: 401 })
    }

    console.log(`[${requestId}] Successfully authenticated user: ${userId.substring(0, 8)}...`)

    const body = await req.json()
    const { role } = body
    
    console.log(`[${requestId}] Profile creation request:`, { 
      userId: userId.substring(0, 8) + '...', 
      role,
      bodyKeys: Object.keys(body || {}),
      requestBodySize: JSON.stringify(body).length
    })

    if (!role || !['USER', 'RECRUITER', 'CONTRACTOR'].includes(role)) {
      console.error(`[${requestId}] Invalid role provided:`, { role, validRoles: ['USER', 'RECRUITER', 'CONTRACTOR'] })
      return NextResponse.json({ 
        error: 'Invalid role',
        requestId,
        debugInfo: { providedRole: role, validRoles: ['USER', 'RECRUITER', 'CONTRACTOR'] }
      }, { status: 400 })
    }

    // Get user data from Clerk with detailed logging
    console.log(`[${requestId}] Fetching user data from Clerk API...`)
    const clerkApiStartTime = Date.now()
    
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const clerkApiDuration = Date.now() - clerkApiStartTime
    console.log(`[${requestId}] Clerk API call completed in ${clerkApiDuration}ms`)

    if (!clerkResponse.ok) {
      const errorText = await clerkResponse.text()
      console.error(`[${requestId}] Clerk API error:`, {
        status: clerkResponse.status,
        statusText: clerkResponse.statusText,
        errorText,
        headers: Object.fromEntries(clerkResponse.headers.entries())
      })
      throw new Error(`Failed to fetch user from Clerk: ${clerkResponse.status} - ${errorText}`)
    }

    const clerkUser = await clerkResponse.json()
    console.log(`[${requestId}] Clerk user data received:`, { 
      id: clerkUser.id?.substring(0, 8) + '...', 
      email: clerkUser.email_addresses?.[0]?.email_address,
      hasEmailAddresses: !!clerkUser.email_addresses?.length,
      emailVerified: clerkUser.email_addresses?.[0]?.verification?.status,
      firstName: clerkUser.first_name,
      lastName: clerkUser.last_name,
      hasImage: !!clerkUser.image_url,
      dataKeys: Object.keys(clerkUser || {})
    })

    // Create user profile in Supabase
    // Use service role client for user creation (bypasses RLS for initial setup)
    console.log(`[${requestId}] Creating Supabase client...`)
    const supabase = createServiceSupabaseClient()
    
    const userData = {
      id: userId,
      email: clerkUser.email_addresses[0]?.email_address || '',
      name: clerkUser.first_name && clerkUser.last_name 
        ? `${clerkUser.first_name} ${clerkUser.last_name}`
        : clerkUser.first_name || clerkUser.username || '',
      image: clerkUser.image_url || null,
      email_verified: clerkUser.email_addresses[0]?.verification?.status === 'verified' 
        ? new Date().toISOString() 
        : null,
      role: role as 'USER' | 'RECRUITER' | 'CONTRACTOR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      availability: 'AVAILABLE' as const,
      job_alerts_enabled: true
    }

    console.log(`[${requestId}] Prepared user data:`, {
      id: userData.id.substring(0, 8) + '...',
      email: userData.email,
      name: userData.name,
      role: userData.role,
      hasImage: !!userData.image,
      emailVerified: !!userData.email_verified,
      availability: userData.availability,
      jobAlerts: userData.job_alerts_enabled
    })

    console.log(`[${requestId}] Executing Supabase upsert...`)
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
    console.log(`[${requestId}] Supabase operation completed in ${supabaseDuration}ms`)

    if (error) {
      console.error(`[${requestId}] Supabase error creating user profile:`, {
        error: error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: error.message,
        requestId,
        debugInfo: {
          supabaseError: {
            message: error.message,
            code: error.code,
            details: error.details
          }
        }
      }, { status: 500 })
    }

    const totalDuration = Date.now() - startTime
    console.log(`[${requestId}] Profile created successfully:`, { 
      userId: data.id.substring(0, 8) + '...', 
      role: data.role,
      email: data.email,
      totalProcessingTime: `${totalDuration}ms`
    })

    return NextResponse.json({ 
      user: data,
      requestId,
      processingTime: totalDuration,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error(`[${requestId}] Profile creation error:`, {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${totalDuration}ms`
    })
    
    return NextResponse.json({ 
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString(),
      debugInfo: {
        processingTime: totalDuration,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
    }, { status: 500 })
  }
}