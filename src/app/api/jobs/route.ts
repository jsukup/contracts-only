import { NextRequest, NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/auth-server'
import { JobMatchingEngine } from '@/lib/matching'
import { createBatchNotifications, NotificationTypeEnum } from '@/lib/notifications'

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
    const location = searchParams.get('location')
    const hourlyRate = searchParams.get('hourlyRate')
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
        applications:job_applications (count),
        jobSkills:job_skills (
          skill:skill_id (id, name)
        )
      `, { count: 'exact' })
      .eq('is_active', true)
      .or(`application_deadline.is.null,application_deadline.gte.${new Date().toISOString()}`)
    
    // Apply filters
    if (search) {
      // Search specifically in job titles for the keyword search
      query = query.ilike('title', `%${search}%`)
    }
    
    if (location) {
      // Location filter - search in the location field
      query = query.ilike('location', `%${location}%`)
    }
    
    if (hourlyRate) {
      // Hourly rate filter - find jobs where the user's rate falls within the job's range
      const rate = parseInt(hourlyRate)
      query = query.lte('hourly_rate_min', rate).gte('hourly_rate_max', rate)
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

    // Transform database fields to match frontend interface
    const transformedJobs = (jobs || []).map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location,
      isRemote: job.is_remote,
      jobType: job.job_type,
      hourlyRateMin: job.hourly_rate_min,
      hourlyRateMax: job.hourly_rate_max,
      currency: job.currency,
      contractDuration: job.contract_duration,
      hoursPerWeek: job.hours_per_week,
      createdAt: job.created_at,
      externalUrl: job.external_url,
      clickTrackingEnabled: job.click_tracking_enabled,
      jobSkills: job.jobSkills?.map(js => ({
        skill: js.skill
      })),
      _count: {
        applications: job.applications?.[0]?.count || 0
      }
    }))
    
    return NextResponse.json({
      jobs: transformedJobs,
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
      skills,
      externalUrl,
      clickTrackingEnabled
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
        experience_level: 'MID', // Default value, can be made configurable
        external_url: externalUrl || null,
        click_tracking_enabled: clickTrackingEnabled || false
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

    // After successful job creation, trigger job alert notifications
    try {
      await triggerJobAlertNotifications(job.id, job)
    } catch (notificationError) {
      // Log but don't fail the job creation
      console.error('Error triggering job alert notifications:', notificationError)
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

/**
 * Trigger job alert notifications for matching contractors
 */
async function triggerJobAlertNotifications(jobId: string, jobData: any) {
  try {
    console.log(`Triggering job alerts for job ${jobId}: ${jobData.title}`)
    
    // Use job matching engine to find candidates with 70+ score threshold
    const matches = await JobMatchingEngine.getCandidatesForJob(jobId, 50, 70)
    
    if (matches.length === 0) {
      console.log(`No matching candidates found for job ${jobId} with 70+ score`)
      return
    }

    console.log(`Found ${matches.length} matching candidates for job ${jobId}`)

    // Create notifications for each matching user
    const notifications = matches.map(match => ({
      userId: match.userId,
      type: NotificationTypeEnum.JOB_MATCH,
      title: 'New Job Match!',
      message: `${jobData.title} at ${jobData.company} matches your skills (${match.overallScore}% match)`,
      data: {
        jobId: jobId,
        matchScore: match.overallScore,
        url: `/jobs/${jobId}`,
        company: jobData.company,
        title: jobData.title,
        hourlyRate: `$${jobData.hourly_rate_min}-$${jobData.hourly_rate_max}/hr`
      },
      sendEmail: true // This will be checked against user preferences
    }))

    // Create notifications in batch
    const result = await createBatchNotifications(notifications)
    
    console.log(`Job alert notifications created: ${result.successful} successful, ${result.failed} failed`)
    
    if (result.failed > 0) {
      console.error('Some job alert notifications failed:', result.errors)
    }

  } catch (error) {
    console.error('Error in triggerJobAlertNotifications:', error)
    throw error
  }
}