import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
        where: { userId: session.user.id }
      }),
      
      // Active jobs
      prisma.job.count({
        where: { 
          userId: session.user.id,
          status: 'active'
        }
      }),
      
      // Total applications across all jobs
      prisma.application.count({
        where: {
          job: {
            userId: session.user.id
          }
        }
      }),
      
      // Views this month (mock data for now - would need analytics tracking)
      prisma.job.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: startOfMonth
          }
        }
      }) * 15 // Mock multiplier for views per job
    ])

    return NextResponse.json({
      totalJobs,
      activeJobs,
      totalApplications,
      viewsThisMonth
    })
  } catch (error) {
    console.error('Error fetching employer stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}