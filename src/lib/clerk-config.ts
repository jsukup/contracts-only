/**
 * Clerk configuration utilities for handling different deployment environments
 */

/**
 * Get the application URL based on the deployment environment
 * Prioritizes in order:
 * 1. NEXT_PUBLIC_APP_URL (production)
 * 2. VERCEL_URL (preview deployments)
 * 3. localhost (development)
 */
export function getAppUrl(): string {
  // Production URL (explicitly set)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  // Vercel preview deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Vercel production URL (when deployed but no custom domain)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  
  // Local development
  return 'http://localhost:3000'
}

/**
 * Get the after sign-in URL
 */
export function getAfterSignInUrl(): string {
  return process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL || '/dashboard'
}

/**
 * Get the after sign-up URL
 */
export function getAfterSignUpUrl(): string {
  return process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || '/onboarding'
}

/**
 * Check if we're in a preview deployment
 */
export function isPreviewDeployment(): boolean {
  return !!(process.env.VERCEL_URL && !process.env.VERCEL_ENV?.includes('production'))
}

/**
 * Get Clerk configuration based on deployment environment
 */
export function getClerkConfig() {
  const appUrl = getAppUrl()
  const isPreview = isPreviewDeployment()
  
  return {
    // Use development keys for preview deployments if production keys aren't set
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    secretKey: process.env.CLERK_SECRET_KEY!,
    
    // URLs
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
    afterSignInUrl: getAfterSignInUrl(),
    afterSignUpUrl: getAfterSignUpUrl(),
    
    // Domain configuration
    domain: appUrl,
    isSatellite: false,
    
    // Development/Preview mode indicator
    isDevelopment: process.env.NODE_ENV === 'development' || isPreview
  }
}