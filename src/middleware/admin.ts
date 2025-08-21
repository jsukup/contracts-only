// Admin middleware for protecting admin routes
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function adminMiddleware(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Check if user has admin role
  // Query the users table to check role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!userData || (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN')) {
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