import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-server'

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    const { user, userProfile, supabase } = auth

    // Calculate date for "this month"
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalJobsResult,
      activeJobsResult,
      totalApplicationsResult,
      viewsThisMonthResult
    ] = await Promise.all([
      // Total jobs posted by this employer
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('poster_id', user.id),
      
      // Active jobs
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('poster_id', user.id)
        .eq('is_active', true),
      
      // Total applications across all jobs - need to join with jobs table
      supabase
        .from('job_applications')
        .select(`
          id,
          jobs!inner(poster_id)
        `, { count: 'exact', head: true })
        .eq('jobs.poster_id', user.id),
      
      // Jobs created this month for views calculation
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('poster_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
    ])

    const totalJobs = totalJobsResult.count || 0
    const activeJobs = activeJobsResult.count || 0
    const totalApplications = totalApplicationsResult.count || 0
    const viewsThisMonth = viewsThisMonthResult.count || 0

    return NextResponse.json({
      totalJobs,
      activeJobs,
      totalApplications,
      viewsThisMonth: viewsThisMonth * 15 // Mock multiplier for views per job
    })
  } catch (error) {
    console.error('Error fetching employer stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
})