import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    
    // Filters
    const search = searchParams.get('search')
    const jobType = searchParams.get('jobType')
    const isRemote = searchParams.get('isRemote')
    const minRate = searchParams.get('minRate')
    const maxRate = searchParams.get('maxRate')
    const skills = searchParams.get('skills')?.split(',').filter(Boolean)
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    // Build where clause
    const where: Prisma.JobWhereInput = {
      isActive: true,
      expiresAt: {
        gte: new Date()
      }
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (jobType) {
      where.jobType = jobType
    }
    
    if (isRemote !== null) {
      where.isRemote = isRemote === 'true'
    }
    
    if (minRate) {
      where.hourlyRateMax = { gte: parseInt(minRate) }
    }
    
    if (maxRate) {
      where.hourlyRateMin = { lte: parseInt(maxRate) }
    }
    
    if (skills && skills.length > 0) {
      where.jobSkills = {
        some: {
          skillId: { in: skills }
        }
      }
    }
    
    // Execute query
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          postedBy: {
            select: {
              id: true,
              name: true,
              image: true
            }
          },
          jobSkills: {
            include: {
              skill: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        }
      }),
      prisma.job.count({ where })
    ])
    
    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
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
    const job = await prisma.job.create({
      data: {
        title,
        description,
        company,
        location,
        isRemote: isRemote || false,
        jobType: jobType || 'CONTRACT',
        hourlyRateMin,
        hourlyRateMax,
        currency: currency || 'USD',
        contractDuration,
        hoursPerWeek,
        startDate: startDate ? new Date(startDate) : null,
        applicationUrl,
        applicationEmail,
        postedById: user.id,
        jobSkills: {
          create: skills?.map((skillId: string) => ({
            skillId
          })) || []
        }
      },
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        jobSkills: {
          include: {
            skill: true
          }
        }
      }
    })
    
    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}