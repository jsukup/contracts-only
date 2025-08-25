import { NextRequest, NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/auth-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = createPublicSupabaseClient(req)
    
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        title,
        bio,
        location,
        website,
        linkedin_url,
        hourly_rate_min,
        hourly_rate_max,
        availability,
        image,
        created_at,
        user_skills (
          skill:skill_id (
            id, name, category
          )
        )
      `)
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}