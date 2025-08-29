import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAppUrl } from '@/lib/clerk-config'

/**
 * Debug endpoint to check authentication configuration
 * Access at: /api/auth-check
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, sessionId } = auth()
    
    const config = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV || 'not-set',
        VERCEL_URL: process.env.VERCEL_URL || 'not-set',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not-set',
      },
      clerk: {
        hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        hasSecretKey: !!process.env.CLERK_SECRET_KEY,
        signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
        signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
      },
      computed: {
        appUrl: getAppUrl(),
        currentUrl: req.url,
        origin: req.headers.get('origin') || 'not-set',
        host: req.headers.get('host') || 'not-set',
      },
      auth: {
        isAuthenticated: !!userId,
        userId: userId || 'not-authenticated',
        sessionId: sessionId || 'no-session',
      }
    }
    
    return NextResponse.json({
      success: true,
      config,
      message: 'Authentication configuration check completed',
      recommendations: getRecommendations(config)
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check authentication configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function getRecommendations(config: any): string[] {
  const recommendations: string[] = []
  
  // Check for production URL mismatch
  if (config.computed.host && config.environment.NEXT_PUBLIC_APP_URL) {
    if (!config.computed.host.includes('localhost') && 
        !config.computed.host.includes(config.environment.NEXT_PUBLIC_APP_URL.replace('https://', ''))) {
      recommendations.push(
        `URL mismatch detected. You're accessing via ${config.computed.host} but NEXT_PUBLIC_APP_URL is ${config.environment.NEXT_PUBLIC_APP_URL}. Use the production URL for proper authentication.`
      )
    }
  }
  
  // Check for missing Clerk keys
  if (!config.clerk.hasPublishableKey || !config.clerk.hasSecretKey) {
    recommendations.push('Clerk API keys are not properly configured.')
  }
  
  // Check for preview deployment
  if (config.environment.VERCEL_URL && config.environment.VERCEL_URL !== 'not-set') {
    recommendations.push('This appears to be a Vercel preview deployment. Authentication may work differently than production.')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Configuration looks good!')
  }
  
  return recommendations
}