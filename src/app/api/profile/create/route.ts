import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with service role for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await req.json()

    if (!role || !['USER', 'RECRUITER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get user data from Clerk
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!clerkResponse.ok) {
      throw new Error('Failed to fetch user from Clerk')
    }

    const clerkUser = await clerkResponse.json()

    // Create user profile in Supabase
    const userData = {
      id: userId,
      email: clerkUser.email_addresses[0]?.email_address || '',
      name: clerkUser.first_name && clerkUser.last_name 
        ? `${clerkUser.first_name} ${clerkUser.last_name}`
        : clerkUser.first_name || clerkUser.username || '',
      image: clerkUser.image_url || null,
      email_verified: clerkUser.email_addresses[0]?.verification?.status === 'verified' 
        ? new Date().toISOString() 
        : null,
      role: role as 'USER' | 'RECRUITER',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      availability: 'AVAILABLE' as const,
      job_alerts_enabled: true
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert(userData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}