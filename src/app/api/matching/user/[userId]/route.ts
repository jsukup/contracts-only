import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { JobMatchingEngine } from '@/lib/matching'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
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

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Check if user can access this data (own profile or admin)
    if (user.id !== params.userId && userProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const minScore = parseInt(searchParams.get('minScore') || '50')

    // Get matches for the user
    const matches = await JobMatchingEngine.getMatchesForUser(
      params.userId,
      Math.min(limit, 50), // Cap at 50
      Math.max(minScore, 0) // Ensure non-negative
    )

    // In a real implementation, you'd also fetch job details for each match
    // For now, we'll return the match scores with mock job data
    const matchesWithJobData = await Promise.all(
      matches.map(async (match) => {
        // Mock job data - in real implementation, fetch from database
        const jobData = {
          id: match.jobId,
          title: `Senior ${['Developer', 'Designer', 'Manager'][Math.floor(Math.random() * 3)]}`,
          company: ['Tech Corp', 'Design Studio', 'StartupCo'][Math.floor(Math.random() * 3)],
          location: match.locationScore === 100 ? 'Remote' : 'New York, NY',
          hourlyRateMin: 80 + Math.floor(Math.random() * 40),
          hourlyRateMax: 120 + Math.floor(Math.random() * 50),
          contractDuration: ['3 months', '6 months', '12 months'][Math.floor(Math.random() * 3)],
          postedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
          applicationsCount: Math.floor(Math.random() * 25),
        }

        return {
          ...match,
          job: jobData
        }
      })
    )

    return NextResponse.json({
      matches: matchesWithJobData,
      total: matches.length,
      filters: {
        limit,
        minScore
      }
    })

  } catch (error) {
    console.error('Error getting user matches:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update user matching preferences
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
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

    if (user.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      preferredJobTypes,
      preferredContractDuration,
      hourlyRateMin,
      hourlyRateMax,
      isRemoteOnly,
      availability
    } = body

    // Update user preferences in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        preferred_job_types: preferredJobTypes,
        preferred_contract_duration: preferredContractDuration,
        hourly_rate_min: hourlyRateMin,
        hourly_rate_max: hourlyRateMax,
        is_remote_only: isRemoteOnly,
        availability,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user preferences:', updateError)
      throw updateError
    }

    return NextResponse.json({
      message: 'Matching preferences updated successfully',
      preferences: {
        preferredJobTypes: updatedUser.preferred_job_types,
        preferredContractDuration: updatedUser.preferred_contract_duration,
        hourlyRateMin: updatedUser.hourly_rate_min,
        hourlyRateMax: updatedUser.hourly_rate_max,
        isRemoteOnly: updatedUser.is_remote_only,
        availability: updatedUser.availability
      }
    })

  } catch (error) {
    console.error('Error updating matching preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}