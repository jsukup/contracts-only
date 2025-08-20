import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate date for "this month"
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalJobs,
      activeJobs,
      totalApplications,
      viewsThisMonth
    ] = await Promise.all([
      // Total jobs posted by this employer
      prisma.job.count({
        where: { postedById: session.user.id }
      }),
      
      // Active jobs
      prisma.job.count({
        where: { 
          postedById: session.user.id,
          isActive: true
        }
      }),
      
      // Total applications across all jobs
      prisma.jobApplication.count({
        where: {
          job: {
            postedById: session.user.id
          }
        }
      }),
      
      // Job count for views calculation
      prisma.job.count({
        where: {
          postedById: session.user.id,
          createdAt: {
            gte: startOfMonth
          }
        }
      })
    ])

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
}