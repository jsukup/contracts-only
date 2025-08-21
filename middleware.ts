import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function middleware(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  // Protected paths
  const protectedPaths = ["/dashboard", "/jobs/new", "/profile"]
  const pathname = request.nextUrl.pathname
  
  // Check if the current path is protected
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtected) {
    // Check for authentication
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      // Redirect to signin page
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('redirectTo', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/new/:path*", 
    "/profile/:path*",
    "/api/jobs/create",
    "/api/jobs/update/:path*",
    "/api/jobs/delete/:path*",
  ],
}