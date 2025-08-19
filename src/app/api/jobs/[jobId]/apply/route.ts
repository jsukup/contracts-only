import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
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
    
    // Check if job exists and is active
    const job = await prisma.job.findUnique({
      where: { 
        id: params.jobId,
        isActive: true,
        expiresAt: {
          gte: new Date()
        }
      }
    })
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found or no longer accepting applications' },
        { status: 404 }
      )
    }
    
    // Check if user has already applied
    const existingApplication = await prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId: params.jobId,
          userId: user.id
        }
      }
    })
    
    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 409 }
      )
    }
    
    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        jobId: params.jobId,
        userId: user.id,
        status: 'PENDING'
      },
      include: {
        job: {
          select: {
            title: true,
            company: true,
            applicationUrl: true,
            applicationEmail: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    // Return application with redirect URL if external
    const response: any = {
      application,
      message: 'Application submitted successfully'
    }
    
    if (job.applicationUrl) {
      response.redirectUrl = job.applicationUrl
      response.message = 'Application recorded. Redirecting to employer\'s application page...'
    }
    
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error applying to job:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}