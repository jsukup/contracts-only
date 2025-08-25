import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    
    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successful authentication, redirect to the intended destination
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // If there's no code or an error occurred, redirect to sign in
  return NextResponse.redirect(new URL('/auth/signin?error=auth_callback_error', requestUrl.origin))
}