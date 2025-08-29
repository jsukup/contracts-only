import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase-clerk'

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId } = auth()
    
    if (!userId) {
      console.error('Profile creation failed: No userId from Clerk auth')
      return NextResponse.json({ error: 'Unauthorized - No user ID' }, { status: 401 })
    }

    const body = await req.json()
    const { role } = body
    
    console.log('Profile creation request:', { userId, role })

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
      const errorText = await clerkResponse.text()
      console.error('Clerk API error:', clerkResponse.status, errorText)
      throw new Error(`Failed to fetch user from Clerk: ${clerkResponse.status}`)
    }

    const clerkUser = await clerkResponse.json()
    console.log('Clerk user data received:', { id: clerkUser.id, email: clerkUser.email_addresses?.[0]?.email_address })

    // Create user profile in Supabase
    // Use service role client for user creation (bypasses RLS for initial setup)
    const supabase = createServiceSupabaseClient()
    
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

    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating user profile:', error)
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('Profile created successfully:', { userId: data.id, role: data.role })
    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}