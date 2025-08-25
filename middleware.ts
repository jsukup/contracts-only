import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createAuthenticatedSupabaseClient } from "@/lib/auth-server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for static files and api routes that handle auth themselves
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Skip all files with extensions (manifest.json, favicon.ico, etc.)
  ) {
    return NextResponse.next()
  }
  
  // Protected paths
  const protectedPaths = ["/dashboard", "/jobs/new", "/profile"]
  
  // Check if the current path is protected
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtected) {
    try {
      const supabase = createAuthenticatedSupabaseClient(request)
      
      // Check for authentication
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        // Redirect to signin page
        const redirectUrl = new URL('/auth/signin', request.url)
        redirectUrl.searchParams.set('redirectTo', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error('Middleware auth error:', error)
      // Redirect to signin page on auth error
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('redirectTo', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.woff|.*\\.woff2).*)',
  ],
}