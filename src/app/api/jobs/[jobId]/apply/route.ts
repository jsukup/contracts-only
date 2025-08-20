import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email'
import { authOptions } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = params
    const body = await req.json()
    const { coverLetter, expectedRate, availableStartDate } = body

    // Check if job exists and is active
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { postedBy: true }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.isActive) {
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 400 }
      )
    }

    if (job.postedById === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot apply to your own job posting' },
        { status: 400 }
      )
    }

    // Check if user already applied
    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        jobId,
        userId: session.user.id
      }
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 400 }
      )
    }

    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        userId: session.user.id,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        job: {
          include: {
            postedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Send email notifications
    const emailService = EmailService.getInstance()

    // Notify employer of new application
    if (application.job.user.email) {
      try {
        await emailService.sendApplicationNotification(
          application.job.user.email,
          {
            applicantName: application.user.name || 'Unknown',
            jobTitle: application.job.title,
            company: application.job.company,
            jobId: application.job.id,
            applicationId: application.id
          }
        )
      } catch (error) {
        console.error('Failed to send employer notification:', error)
      }
    }

    // Send confirmation to applicant
    if (application.user.email) {
      try {
        await emailService.sendApplicationConfirmation(
          application.user.email,
          {
            applicantName: application.user.name || 'Unknown',
            jobTitle: application.job.title,
            company: application.job.company,
            jobId: application.job.id,
            applicationId: application.id
          }
        )
      } catch (error) {
        console.error('Failed to send applicant confirmation:', error)
      }
    }

    // Create notification record for the employer
    try {
      await prisma.notification.create({
        data: {
          userId: application.job.userId,
          type: 'application_update',
          title: 'New Job Application',
          message: `${application.user.name} applied for "${application.job.title}"`,
          relatedJobId: application.job.id,
          relatedApplicationId: application.id
        }
      })
    } catch (error) {
      console.error('Failed to create notification:', error)
    }

    return NextResponse.json({
      id: application.id,
      status: application.status,
      appliedAt: application.createdAt,
      message: 'Application submitted successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error submitting application:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}