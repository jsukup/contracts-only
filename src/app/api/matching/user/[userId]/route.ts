import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { JobMatchingEngine } from '@/lib/matching'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can access this data (own profile or admin)
    if (session.user.id !== params.userId && session.user.role !== 'ADMIN') {
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
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: {
        // These fields would need to be added to your User model
        preferredJobTypes,
        preferredContractDuration,
        hourlyRateMin,
        hourlyRateMax,
        isRemoteOnly,
        availability,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Matching preferences updated successfully',
      preferences: {
        preferredJobTypes: updatedUser.preferredJobTypes,
        preferredContractDuration: updatedUser.preferredContractDuration,
        hourlyRateMin: updatedUser.hourlyRateMin,
        hourlyRateMax: updatedUser.hourlyRateMax,
        isRemoteOnly: updatedUser.isRemoteOnly,
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