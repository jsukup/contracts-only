import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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
  '/candidates(.*)',
  '/api/profile(.*)',  // Protect profile API routes
  '/api/profile/create',  // Protect profile creation
  '/api/jobs/create(.*)',
  '/api/jobs/update(.*)',
  '/api/jobs/delete(.*)',
  '/api/applications(.*)'
])

// Define public routes that should bypass authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/jobs',
  '/jobs/[jobId]',
  '/api/public(.*)',
  '/about',
  '/contact',
  '/privacy',
  '/terms'
])

export default clerkMiddleware((auth, req) => {
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    auth().protect()
  }
  
  // Allow public routes to proceed
  return NextResponse.next()
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