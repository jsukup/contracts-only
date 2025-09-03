import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createNotification, NotificationTypeEnum } from '@/lib/notifications'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params
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
    const { status } = body
    
    if (!['PENDING', 'REVIEWED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }
    
    // Check if user owns the job for this application
    const { data: application, error: appError } = await supabase
      .from('job_applications')
      .select(`
        *,
        job:job_id (
          poster_id
        )
      `)
      .eq('id', applicationId)
      .single()
    
    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }
    
    if (application.job.poster_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // Update application status
    const { data: updatedApplication, error: updateError } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', applicationId)
      .select(`
        *,
        applicant:applicant_id (
          id, name, email, image, title, bio,
          hourly_rate_min, hourly_rate_max
        ),
        job:job_id (
          id, title, company
        )
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating application:', updateError)
      throw updateError
    }

    // Trigger notification for significant status changes
    if (['INTERVIEW', 'ACCEPTED', 'REJECTED'].includes(status)) {
      try {
        await triggerApplicationStatusNotification(
          updatedApplication.applicant_id,
          params.applicationId,
          updatedApplication.job_id,
          status,
          updatedApplication.job.title,
          updatedApplication.job.company
        )
      } catch (notificationError) {
        // Log but don't fail the status update
        console.error('Error sending application status notification:', notificationError)
      }
    }
    
    return NextResponse.json(updatedApplication)
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params
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
    
    // Check if user owns the application
    const { data: application, error: appError } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', applicationId)
      .single()
    
    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }
    
    if (application.applicant_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    // Delete application
    const { error: deleteError } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', applicationId)
    
    if (deleteError) {
      console.error('Error deleting application:', deleteError)
      throw deleteError
    }
    
    return NextResponse.json({ message: 'Application withdrawn successfully' })
  } catch (error) {
    console.error('Error deleting application:', error)
    return NextResponse.json(
      { error: 'Failed to withdraw application' },
      { status: 500 }
    )
  }
}

/**
 * Trigger application status notification for significant status changes
 */
async function triggerApplicationStatusNotification(
  applicantId: string,
  applicationId: string,
  jobId: string,
  status: string,
  jobTitle: string,
  company: string
) {
  try {
    console.log(`Triggering application status notification: ${status} for application ${applicationId}`)

    // Create status-specific notification content
    const statusMessages = {
      'INTERVIEW': `Great news! ${company} wants to interview you for ${jobTitle}`,
      'ACCEPTED': `Congratulations! ${company} has extended an offer for ${jobTitle}`,
      'REJECTED': `Thank you for your application to ${jobTitle} at ${company}. While this opportunity wasn't a match, keep applying!`
    }

    const statusTitles = {
      'INTERVIEW': 'Interview Scheduled! 🎯',
      'ACCEPTED': 'Job Offer Received! 🎉',
      'REJECTED': 'Application Update 📋'
    }

    const title = statusTitles[status as keyof typeof statusTitles] || 'Application Update'
    const message = statusMessages[status as keyof typeof statusMessages] || `Your application status has been updated to ${status}`

    // Create notification
    const result = await createNotification({
      userId: applicantId,
      type: NotificationTypeEnum.APPLICATION_UPDATE,
      title,
      message,
      data: {
        applicationId,
        jobId,
        status,
        company,
        jobTitle,
        url: `/applications/${applicationId}`
      },
      sendEmail: true // Will be checked against user preferences
    })

    if (result.success) {
      console.log(`Application status notification created successfully for user ${applicantId}`)
    } else {
      console.error(`Failed to create application status notification: ${result.error}`)
    }

  } catch (error) {
    console.error('Error in triggerApplicationStatusNotification:', error)
    throw error
  }
}