import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { JobWhereInput, JobOrderByInput } from '@/lib/database'
import { JobWithIncludes } from '@/lib/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Search parameters
    const search = searchParams.get('search')
    const location = searchParams.get('location')
    const isRemote = searchParams.get('isRemote')
    const minRate = searchParams.get('minRate')
    const maxRate = searchParams.get('maxRate')
    const currency = searchParams.get('currency') || 'USD'
    const jobTypes = searchParams.get('jobType')?.split(',').filter(Boolean) || []
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || []
    const contractDurations = searchParams.get('contractDuration')?.split(',').filter(Boolean) || []
    const hoursPerWeek = searchParams.get('hoursPerWeek')?.split(',').filter(Boolean) || []
    const postedWithin = searchParams.get('postedWithin')
    const rating = searchParams.get('rating')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    // Build where clause
    const where: JobWhereInput = {
      isActive: true
    }

    // Text search
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { requirements: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Location filter
    if (location) {
      if (isRemote === 'true') {
        where.OR = [
          { isRemote: true },
          { location: { contains: location, mode: 'insensitive' } }
        ]
      } else {
        where.location = { contains: location, mode: 'insensitive' }
      }
    } else if (isRemote === 'true') {
      where.isRemote = true
    } else if (isRemote === 'false') {
      where.isRemote = false
    }

    // Rate filter
    if (minRate || maxRate) {
      where.currency = currency
      if (minRate) {
        where.hourlyRateMin = { gte: parseInt(minRate) }
      }
      if (maxRate) {
        where.hourlyRateMax = { lte: parseInt(maxRate) }
      }
    }

    // Job type filter
    if (jobTypes.length > 0) {
      where.jobType = { in: jobTypes }
    }

    // Contract duration filter
    if (contractDurations.length > 0) {
      where.contractDuration = { in: contractDurations }
    }

    // Hours per week filter (approximation)
    if (hoursPerWeek.length > 0) {
      const hoursRanges: Array<{ hoursPerWeek: { lt?: number; gt?: number; gte?: number; lte?: number } }> = []
      
      hoursPerWeek.forEach(range => {
        switch (range) {
          case 'Part-time (< 20h)':
            hoursRanges.push({ hoursPerWeek: { lt: 20 } })
            break
          case 'Part-time (20-30h)':
            hoursRanges.push({ hoursPerWeek: { gte: 20, lte: 30 } })
            break
          case 'Full-time (40h)':
            hoursRanges.push({ hoursPerWeek: { gte: 35, lte: 45 } })
            break
          case 'Full-time (40h+)':
            hoursRanges.push({ hoursPerWeek: { gt: 40 } })
            break
        }
      })
      
      if (hoursRanges.length > 0) {
        where.OR = hoursRanges
      }
    }

    // Posted within filter
    if (postedWithin && postedWithin !== 'all') {
      const days = parseInt(postedWithin)
      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() - days)
      where.createdAt = { gte: dateThreshold }
    }

    // Skills filter
    if (skills.length > 0) {
      where.jobSkills = {
        some: {
          skill: {
            name: { in: skills }
          }
        }
      }
    }

    // Build orderBy clause
    const orderBy: JobOrderByInput = {}
    switch (sortBy) {
      case 'rate':
        orderBy.hourlyRateMax = sortOrder
        break
      case 'company':
        orderBy.company = sortOrder
        break
      case 'title':
        orderBy.title = sortOrder
        break
      default:
        orderBy.createdAt = sortOrder
    }

    const supabase = createServerSupabaseClient()

    // Build the main jobs query with complex filtering
    let jobsQuery = supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_poster_id_fkey(id, name),
        job_skills!inner(
          skill_id,
          skills!inner(id, name)
        )
      `)

    // Apply filters to the query
    jobsQuery = jobsQuery.eq('is_active', true)

    // Text search filters
    if (search) {
      jobsQuery = jobsQuery.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%,requirements.ilike.%${search}%`)
    }

    // Location and remote filters
    if (location) {
      if (isRemote === 'true') {
        jobsQuery = jobsQuery.or(`is_remote.eq.true,location.ilike.%${location}%`)
      } else {
        jobsQuery = jobsQuery.ilike('location', `%${location}%`)
      }
    } else if (isRemote === 'true') {
      jobsQuery = jobsQuery.eq('is_remote', true)
    } else if (isRemote === 'false') {
      jobsQuery = jobsQuery.eq('is_remote', false)
    }

    // Rate filters
    if (minRate || maxRate) {
      jobsQuery = jobsQuery.eq('currency', currency)
      if (minRate) {
        jobsQuery = jobsQuery.gte('hourly_rate_min', parseInt(minRate))
      }
      if (maxRate) {
        jobsQuery = jobsQuery.lte('hourly_rate_max', parseInt(maxRate))
      }
    }

    // Job type filter
    if (jobTypes.length > 0) {
      jobsQuery = jobsQuery.in('job_type', jobTypes)
    }

    // Posted within filter
    if (postedWithin && postedWithin !== 'all') {
      const days = parseInt(postedWithin)
      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() - days)
      jobsQuery = jobsQuery.gte('created_at', dateThreshold.toISOString())
    }

    // Skills filter (complex join filtering)
    if (skills.length > 0) {
      jobsQuery = jobsQuery.in('job_skills.skills.name', skills)
    }

    // Apply ordering
    switch (sortBy) {
      case 'rate':
        jobsQuery = jobsQuery.order('hourly_rate_max', { ascending: sortOrder === 'asc' })
        break
      case 'company':
        jobsQuery = jobsQuery.order('company', { ascending: sortOrder === 'asc' })
        break
      case 'title':
        jobsQuery = jobsQuery.order('title', { ascending: sortOrder === 'asc' })
        break
      default:
        jobsQuery = jobsQuery.order('created_at', { ascending: sortOrder === 'asc' })
    }

    // Apply pagination
    jobsQuery = jobsQuery.range(offset, offset + limit - 1)

    // Execute the main query
    const { data: jobsData, error: jobsError } = await jobsQuery

    if (jobsError) {
      throw new Error(`Jobs query error: ${jobsError.message}`)
    }

    // Count total jobs with same filters (without pagination)
    let countQuery = supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Apply the same filters for count
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%,requirements.ilike.%${search}%`)
    }
    if (location) {
      if (isRemote === 'true') {
        countQuery = countQuery.or(`is_remote.eq.true,location.ilike.%${location}%`)
      } else {
        countQuery = countQuery.ilike('location', `%${location}%`)
      }
    } else if (isRemote === 'true') {
      countQuery = countQuery.eq('is_remote', true)
    } else if (isRemote === 'false') {
      countQuery = countQuery.eq('is_remote', false)
    }

    const { count: total } = await countQuery

    // Count total active jobs
    const { count: totalActive } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get popular skills for suggestions
    const { data: skillsData } = await supabase
      .from('skills')
      .select(`
        name,
        job_skills(count)
      `)
      .order('job_skills.count', { ascending: false })
      .limit(20)

    // Process the jobs data to match expected format
    const jobs: JobWithIncludes[] = jobsData?.map(job => ({
      ...job,
      user: job.users,
      skills: job.job_skills?.map(js => ({
        id: js.skills.id,
        name: js.skills.name
      })) || [],
      _count: {
        applications: 0 // We'll need to implement this separately if needed
      }
    })) || []

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.is_remote,
        jobType: job.job_type,
        hourlyRateMin: job.hourly_rate_min,
        hourlyRateMax: job.hourly_rate_max,
        currency: job.currency,
        contractDuration: job.contract_duration,
        hoursPerWeek: job.hours_per_week,
        description: job.description?.substring(0, 200) + '...',
        createdAt: job.created_at,
        skills: job.skills?.map(skill => skill.name) || [],
        employer: job.user?.name || '',
        applicationCount: job._count.applications
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      },
      filters: {
        totalActive,
        appliedFilters: {
          search: !!search,
          location: !!location,
          isRemote: isRemote !== null,
          rateRange: !!(minRate || maxRate),
          jobTypes: jobTypes.length > 0,
          skills: skills.length > 0,
          contractDuration: contractDurations.length > 0,
          hoursPerWeek: hoursPerWeek.length > 0,
          postedWithin: postedWithin !== 'all',
          rating: !!rating
        }
      },
      suggestions: {
        skills: skillsData?.map(skill => skill.name) || []
      }
    })
  } catch (error) {
    console.error('Error searching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    )
  }
}