import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    // Get user profile with skills
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        *,
        user_skills (
          skill:skill_id (
            id, name, category
          )
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      title,
      bio,
      location,
      website,
      linkedinUrl,
      hourlyRateMin,
      hourlyRateMax,
      availability,
      skills
    } = body

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name,
        title,
        bio,
        location,
        website,
        linkedin_url: linkedinUrl,
        hourly_rate_min: hourlyRateMin,
        hourly_rate_max: hourlyRateMax,
        availability
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      throw updateError
    }

    // Update skills if provided
    if (skills && Array.isArray(skills)) {
      // Remove existing skills
      const { error: deleteError } = await supabase
        .from('user_skills')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('Error deleting user skills:', deleteError)
        throw deleteError
      }

      // Add new skills
      if (skills.length > 0) {
        const { error: insertError } = await supabase
          .from('user_skills')
          .insert(
            skills.map((skillId: string) => ({
              user_id: user.id,
              skill_id: skillId
            }))
          )

        if (insertError) {
          console.error('Error inserting user skills:', insertError)
          throw insertError
        }
      }
    }

    // Get updated user profile with skills
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select(`
        *,
        user_skills (
          skill:skill_id (
            id, name, category
          )
        )
      `)
      .eq('id', user.id)
      .single()

    if (finalError) {
      console.error('Error fetching updated user profile:', finalError)
      throw finalError
    }

    return NextResponse.json(finalUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}