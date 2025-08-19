import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.jobId },
      include: {
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            title: true,
            bio: true
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
    })
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    
    // Check if user owns the job
    const existingJob = await prisma.job.findUnique({
      where: { id: params.jobId }
    })
    
    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    if (existingJob.postedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      isActive,
      skills
    } = body
    
    // Update job
    const job = await prisma.job.update({
      where: { id: params.jobId },
      data: {
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
        startDate: startDate ? new Date(startDate) : null,
        applicationUrl,
        applicationEmail,
        isActive
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
    
    // Update skills if provided
    if (skills && Array.isArray(skills)) {
      // Remove existing skills
      await prisma.jobSkill.deleteMany({
        where: { jobId: params.jobId }
      })
      
      // Add new skills
      if (skills.length > 0) {
        await prisma.jobSkill.createMany({
          data: skills.map((skillId: string) => ({
            jobId: params.jobId,
            skillId
          }))
        })
      }
    }
    
    const updatedJob = await prisma.job.findUnique({
      where: { id: params.jobId },
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
    
    return NextResponse.json(updatedJob)
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    
    // Check if user owns the job
    const job = await prisma.job.findUnique({
      where: { id: params.jobId }
    })
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    if (job.postedById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Soft delete by setting isActive to false
    await prisma.job.update({
      where: { id: params.jobId },
      data: { isActive: false }
    })
    
    return NextResponse.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}