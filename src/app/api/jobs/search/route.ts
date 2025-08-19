import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = {
      status: 'active'
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
      const hoursRanges: any[] = []
      
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
    const orderBy: any = {}
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

    // Execute query
    const [jobs, total, totalActive] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          jobSkills: {
            include: {
              skill: {
                select: {
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy,
        take: limit,
        skip: offset
      }),
      prisma.job.count({ where }),
      prisma.job.count({ where: { status: 'active' } })
    ])

    // Get popular skills for suggestions
    const popularSkills = await prisma.skill.findMany({
      take: 20,
      orderBy: {
        jobSkills: {
          _count: 'desc'
        }
      },
      select: {
        name: true,
        _count: {
          select: {
            jobSkills: true
          }
        }
      }
    })

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.isRemote,
        jobType: job.jobType,
        hourlyRateMin: job.hourlyRateMin,
        hourlyRateMax: job.hourlyRateMax,
        currency: job.currency,
        contractDuration: job.contractDuration,
        hoursPerWeek: job.hoursPerWeek,
        description: job.description?.substring(0, 200) + '...',
        createdAt: job.createdAt,
        skills: job.jobSkills.map(js => js.skill.name),
        employer: job.user.name,
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
        skills: popularSkills.map(skill => skill.name)
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