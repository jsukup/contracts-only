import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    const { password } = body
    
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    
    // Update password using the authenticated user's session
    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      console.error('Error updating password:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ message: 'Password updated successfully' })
    
  } catch (error) {
    console.error('Error in update-password API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}