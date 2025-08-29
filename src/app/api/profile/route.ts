import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase-client'

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId } = auth()
    
    if (!userId) {
      console.error('Profile GET failed: No userId from Clerk auth')
      return NextResponse.json({ error: 'Unauthorized - No user ID' }, { status: 401 })
    }
    
    console.log('Profile GET request for userId:', userId)

    const supabase = createServiceSupabaseClient()

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
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle() to prevent 406 errors

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ 
        error: 'Failed to fetch profile',
        details: profileError.message 
      }, { status: 500 })
    }

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
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
    // Get authenticated user from Clerk
    const { userId } = auth()
    
    if (!userId) {
      console.error('Profile PUT failed: No userId from Clerk auth')
      return NextResponse.json({ error: 'Unauthorized - No user ID' }, { status: 401 })
    }
    
    console.log('Profile PUT request for userId:', userId)

    const supabase = createServiceSupabaseClient()

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
      .eq('id', userId)
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
              user_id: userId,
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
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle() to prevent 406 errors

    if (finalError) {
      console.error('Error fetching updated user profile:', finalError)
      throw finalError
    }

    if (!finalUser) {
      throw new Error('User profile not found after update')
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