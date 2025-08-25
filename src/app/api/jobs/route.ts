import { NextRequest, NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createPublicSupabaseClient(req)
    const { searchParams } = new URL(req.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    // Filters
    const search = searchParams.get('search')
    const jobType = searchParams.get('jobType')
    const isRemote = searchParams.get('isRemote')
    const minRate = searchParams.get('minRate')
    const maxRate = searchParams.get('maxRate')
    const skills = searchParams.get('skills')?.split(',').filter(Boolean)
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build query
    let query = supabase
      .from('jobs')
      .select(`
        *,
        poster:poster_id (id, name, image),
        applications:job_applications (count)
      `)
      .eq('is_active', true)
      .or(`application_deadline.is.null,application_deadline.gte.${new Date().toISOString()}`)
    
    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`)
    }
    
    if (jobType) {
      query = query.eq('job_type', jobType)
    }
    
    if (isRemote !== null) {
      query = query.eq('is_remote', isRemote === 'true')
    }
    
    if (minRate) {
      query = query.gte('hourly_rate_max', parseInt(minRate))
    }
    
    if (maxRate) {
      query = query.lte('hourly_rate_min', parseInt(maxRate))
    }
    
    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)
    
    const { data: jobs, error, count } = await query
    
    if (error) {
      console.error('Error fetching jobs:', error)
      throw error
    }
    
    return NextResponse.json({
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authenticateApiRoute } = await import('@/lib/auth-server')
    const { user, userProfile, supabase } = await authenticateApiRoute(req)
    
    const body = await req.json()
    const {
      title,
      description,
      company,
      location,
      isRemote,
      jobType,
      hourlyRateMin,
      hourlyRateMax,
      currency,
      contractDuration,
      hoursPerWeek,
      startDate,
      applicationUrl,
      applicationEmail,
      skills
    } = body
    
    // Validation
    if (!title || !description || !company || !hourlyRateMin || !hourlyRateMax) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    if (hourlyRateMin > hourlyRateMax) {
      return NextResponse.json(
        { error: 'Minimum rate cannot be greater than maximum rate' },
        { status: 400 }
      )
    }
    
    if (!applicationUrl && !applicationEmail) {
      return NextResponse.json(
        { error: 'Either application URL or email is required' },
        { status: 400 }
      )
    }
    
    // Create job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        title,
        description,
        company,
        location,
        is_remote: isRemote || false,
        job_type: jobType || 'CONTRACT',
        hourly_rate_min: hourlyRateMin,
        hourly_rate_max: hourlyRateMax,
        currency: currency || 'USD',
        contract_duration: contractDuration,
        hours_per_week: hoursPerWeek,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        poster_id: user.id,
        is_active: true,
        view_count: 0,
        experience_level: 'MID' // Default value, can be made configurable
      })
      .select(`
        *,
        poster:poster_id (id, name, image)
      `)
      .single()
    
    if (jobError) {
      console.error('Error creating job:', jobError)
      throw jobError
    }
    
    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    
    // Handle authentication errors
    if (error instanceof Error && 
        (error.message.includes('Authentication failed') || 
         error.message.includes('No authenticated user') ||
         error.message.includes('User profile not found'))) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}