import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-server'

export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    const { user, userProfile, supabase } = auth

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Build the query
    let jobsQuery = supabase
      .from('jobs')
      .select(`
        *,
        job_skills!inner(
          skill_id,
          skills!inner(id, name)
        )
      `)
      .eq('poster_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      if (status === 'active') {
        jobsQuery = jobsQuery.eq('is_active', true)
      } else if (status === 'inactive') {
        jobsQuery = jobsQuery.eq('is_active', false)
      }
    }

    // Count query
    let countQuery = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('poster_id', user.id)

    if (status && status !== 'all') {
      if (status === 'active') {
        countQuery = countQuery.eq('is_active', true)
      } else if (status === 'inactive') {
        countQuery = countQuery.eq('is_active', false)
      }
    }

    const [jobsResult, countResult] = await Promise.all([
      jobsQuery,
      countQuery
    ])

    if (jobsResult.error) {
      throw new Error(`Jobs query error: ${jobsResult.error.message}`)
    }

    if (countResult.error) {
      throw new Error(`Count query error: ${countResult.error.message}`)
    }

    const jobs = jobsResult.data || []
    const total = countResult.count || 0

    return NextResponse.json({
      jobs,
      total,
      hasMore: offset + limit < total
    })
  } catch (error) {
    console.error('Error fetching employer jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
})