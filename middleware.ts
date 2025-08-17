import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add custom logic here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        // Protected paths
        const protectedPaths = ["/dashboard", "/jobs/new", "/profile"]
        const pathname = req.nextUrl.pathname
        
        // Check if the current path is protected
        const isProtected = protectedPaths.some(path => pathname.startsWith(path))
        
        // Allow access if not protected or if user is authenticated
        return !isProtected || !!token
      },
    },
  }
)

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