import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/jobs/new(.*)',
  '/jobs/post(.*)',
  '/admin(.*)',
  '/employer(.*)',
  '/onboarding(.*)',
  '/applications(.*)',
  '/candidates(.*)'
])

// Let Clerk handle authentication automatically for most routes
// API routes will handle their own authentication using auth() in the route handlers
export default clerkMiddleware((auth, req) => {
  const middlewareId = Math.random().toString(36).substring(7)
  const path = req.nextUrl.pathname
  
  console.log(`[MIDDLEWARE-${middlewareId}] Processing request: ${req.method} ${path}`)
  
  // Only protect page routes, let API routes handle their own auth
  if (isProtectedRoute(req)) {
    console.log(`[MIDDLEWARE-${middlewareId}] Protected route detected: ${path}`)
    
    const authInfo = auth()
    console.log(`[MIDDLEWARE-${middlewareId}] Auth info:`, {
      hasUserId: !!authInfo?.userId,
      userId: authInfo?.userId ? `${authInfo.userId.substring(0, 8)}...` : null,
      hasSessionId: !!authInfo?.sessionId,
      sessionId: authInfo?.sessionId ? `${authInfo.sessionId.substring(0, 8)}...` : null
    })
    
    // Let Clerk handle redirects automatically by not returning anything
    // if user is not authenticated for page routes
  } else {
    console.log(`[MIDDLEWARE-${middlewareId}] Public route, allowing access: ${path}`)
  }
  
  console.log(`[MIDDLEWARE-${middlewareId}] Middleware processing completed`)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - manifest.json and other static JSON files
     * - images and other static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|images/.*|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.woff|.*\\.woff2|.*\\.ttf|.*\\.eot).*)',
    '/api/(.*)',
  ],
}