import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const jobId = searchParams.get('jobId')
    const type = searchParams.get('type') // 'contractor' or 'employer'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (userId) {
      if (type === 'contractor') {
        where.contractorId = userId
      } else if (type === 'employer') {
        where.employerId = userId
      }
    }

    if (jobId) {
      where.jobId = jobId
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          contractor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          employer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          job: {
            select: {
              id: true,
              title: true,
              company: true
            }
          }
        }
      }),
      prisma.review.count({ where })
    ])

    // Calculate average rating if userId is provided
    let averageRating = null
    if (userId) {
      const ratingWhere = type === 'contractor' 
        ? { contractorId: userId }
        : { employerId: userId }
      
      const avgResult = await prisma.review.aggregate({
        where: ratingWhere,
        _avg: {
          rating: true
        }
      })
      averageRating = avgResult._avg.rating
    }

    return NextResponse.json({
      reviews,
      total,
      hasMore: offset + limit < total,
      averageRating
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      rating, 
      comment, 
      contractorId, 
      employerId, 
      jobId, 
      type // 'for_contractor' or 'for_employer'
    } = body

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!comment?.trim()) {
      return NextResponse.json(
        { error: 'Review comment is required' },
        { status: 400 }
      )
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Check if the user has permission to leave this review
    // They should have been involved in the job application/contract
    const application = await prisma.application.findFirst({
      where: {
        jobId: jobId,
        OR: [
          { userId: session.user.id },
          { job: { userId: session.user.id } }
        ]
      },
      include: { job: true }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'You can only review jobs you were involved in' },
        { status: 403 }
      )
    }

    // Check if review already exists
    const existingReview = await prisma.review.findFirst({
      where: {
        jobId,
        reviewerId: session.user.id,
        ...(type === 'for_contractor' 
          ? { contractorId } 
          : { employerId }
        )
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this person for this job' },
        { status: 400 }
      )
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment.trim(),
        reviewerId: session.user.id,
        jobId,
        ...(type === 'for_contractor' 
          ? { contractorId } 
          : { employerId }
        )
      },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        employer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true
          }
        }
      }
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}