// Admin middleware for protecting admin routes
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function adminMiddleware(request: NextRequest) {
  const token = await getToken({ 
    req: request as any, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Check if user has admin role
  // You'll need to add a 'role' field to your User model in Prisma
  if (token.role !== 'ADMIN' && token.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return NextResponse.next()
}

// Define admin routes that need protection
export const adminRoutes = [
  '/admin',
  '/admin/dashboard',
  '/admin/users',
  '/admin/jobs',
  '/admin/applications',
  '/admin/reports',
  '/admin/settings',
  '/admin/payments',
  '/admin/analytics'
]

// Check if a path is an admin route
export function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some(route => pathname.startsWith(route))
}