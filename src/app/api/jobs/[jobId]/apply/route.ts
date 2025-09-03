import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { EmailService } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  try {
    const supabase = createServerSupabaseClient()
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }
    const body = await req.json()
    const { coverLetter: _coverLetter, expectedRate: _expectedRate, availableStartDate } = body

    // Check if job exists and is active
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        poster:poster_id (
          id, name, email
        )
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (!job.is_active) {
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 400 }
      )
    }

    if (job.poster_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot apply to your own job posting' },
        { status: 400 }
      )
    }

    // Check if user already applied
    const { data: existingApplication, error: appCheckError } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .single()

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 400 }
      )
    }

    // Create application
    const { data: application, error: createError } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        applicant_id: user.id,
        status: 'PENDING'
      })
      .select(`
        *,
        applicant:applicant_id (
          id, name, email
        ),
        job:job_id (
          *,
          poster:poster_id (
            id, name, email
          )
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating application:', createError)
      throw createError
    }

    // Send email notifications
    const emailService = EmailService.getInstance()

    // Notify employer of new application
    if (application.job.poster.email) {
      try {
        await emailService.sendApplicationNotification(
          application.job.poster.email,
          {
            applicantName: application.applicant.name || 'Unknown',
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
    if (application.applicant.email) {
      try {
        await emailService.sendApplicationConfirmation(
          application.applicant.email,
          {
            applicantName: application.applicant.name || 'Unknown',
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
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: application.job.poster_id,
          type: 'application_update',
          title: 'New Job Application',
          message: `${application.applicant.name} applied for "${application.job.title}"`,
          related_job_id: application.job.id,
          related_application_id: application.id
        })
      
      if (notificationError) {
        console.error('Failed to create notification:', notificationError)
      }
    } catch (error) {
      console.error('Failed to create notification:', error)
    }

    return NextResponse.json({
      id: application.id,
      status: application.status,
      appliedAt: application.created_at,
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