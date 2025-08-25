import { NextRequest, NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/auth-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = createPublicSupabaseClient(req)
    
    // Get user profile basic info (this should be public for stats)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, created_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user statistics
    const [
      { count: jobsPosted },
      { count: applicationsReceived },
      { count: applicationsSent },
      { data: recentJobs }
    ] = await Promise.all([
      // Jobs posted by this user
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('poster_id', userId)
        .eq('is_active', true),
      
      // Applications received for their jobs
      supabase
        .from('job_applications')
        .select(`
          *,
          job:job_id!inner (
            poster_id
          )
        `, { count: 'exact', head: true })
        .eq('job.poster_id', userId),
      
      // Applications sent by this user
      supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('applicant_id', userId),
      
      // Recent active jobs (limit 5)
      supabase
        .from('jobs')
        .select(`
          id,
          title,
          company,
          created_at,
          hourly_rate_min,
          hourly_rate_max,
          currency
        `)
        .eq('poster_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    const stats = {
      userId: userId,
      userName: user.name,
      memberSince: user.created_at,
      stats: {
        jobsPosted: jobsPosted || 0,
        applicationsReceived: applicationsReceived || 0,
        applicationsSent: applicationsSent || 0,
      },
      recentJobs: recentJobs || []
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    )
  }
}