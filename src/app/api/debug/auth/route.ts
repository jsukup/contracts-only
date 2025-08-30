import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Debug endpoint to test auth() function behavior
export async function GET(req: NextRequest) {
  const debugId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  
  console.log(`[DEBUG-${debugId}] Auth debug endpoint accessed at ${new Date().toISOString()}`)
  
  try {
    // Test auth() function
    console.log(`[DEBUG-${debugId}] Testing auth() function...`)
    const authStartTime = Date.now()
    
    const authResult = auth()
    const authDuration = Date.now() - authStartTime
    
    console.log(`[DEBUG-${debugId}] auth() completed in ${authDuration}ms`)
    
    // Analyze request details
    const requestDetails = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      cookies: req.headers.get('cookie'),
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer')
    }
    
    console.log(`[DEBUG-${debugId}] Request details:`, requestDetails)
    
    // Environment check
    const environment = {
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      clerkSecretKeyLength: process.env.CLERK_SECRET_KEY?.length,
      hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      publishableKeyLength: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    }
    
    console.log(`[DEBUG-${debugId}] Environment:`, environment)
    
    // Cookie analysis
    const cookieHeader = req.headers.get('cookie')
    const cookieAnalysis = {
      hasCookies: !!cookieHeader,
      cookieCount: cookieHeader ? cookieHeader.split(';').length : 0,
      clerkCookies: cookieHeader ? cookieHeader.split(';')
        .filter(c => c.trim().startsWith('__clerk') || c.trim().startsWith('__session'))
        .map(c => c.trim().split('=')[0]) : [],
      allCookieNames: cookieHeader ? cookieHeader.split(';')
        .map(c => c.trim().split('=')[0]) : []
    }
    
    console.log(`[DEBUG-${debugId}] Cookie analysis:`, cookieAnalysis)
    
    const totalDuration = Date.now() - startTime
    
    const debugResult = {
      debugId,
      timestamp: new Date().toISOString(),
      processingTime: totalDuration,
      authResult: {
        hasUserId: !!authResult?.userId,
        userId: authResult?.userId ? `${authResult.userId.substring(0, 8)}...` : null,
        hasSessionId: !!authResult?.sessionId,
        sessionId: authResult?.sessionId ? `${authResult.sessionId.substring(0, 8)}...` : null,
        hasOrgId: !!authResult?.orgId,
        authResultKeys: Object.keys(authResult || {})
      },
      environment,
      cookies: cookieAnalysis,
      request: {
        method: requestDetails.method,
        hasUserAgent: !!requestDetails.userAgent,
        hasOrigin: !!requestDetails.origin,
        hasReferer: !!requestDetails.referer,
        headerCount: Object.keys(requestDetails.headers).length
      }
    }
    
    console.log(`[DEBUG-${debugId}] Debug result:`, debugResult)
    
    return NextResponse.json(debugResult)
    
  } catch (error) {
    const totalDuration = Date.now() - startTime
    
    console.error(`[DEBUG-${debugId}] Debug endpoint error:`, {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${totalDuration}ms`
    })
    
    return NextResponse.json({
      error: 'Debug endpoint failed',
      debugId,
      timestamp: new Date().toISOString(),
      processingTime: totalDuration,
      errorDetails: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      }
    }, { status: 500 })
  }
}