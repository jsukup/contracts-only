import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getServerSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params
    const body = await request.json()
    const { externalUrl, referrerUrl } = body

    // Get client IP and User Agent
    const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    const supabase = createServerSupabaseClient()

    // First, verify that this job exists and has click tracking enabled
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, click_tracking_enabled, external_url, poster_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Only track clicks if the recruiter enabled tracking for this job
    if (!job.click_tracking_enabled) {
      return NextResponse.json(
        { message: 'Click tracking not enabled for this job' },
        { status: 200 }
      )
    }

    // Get current user (if logged in)
    const session = await getServerSession(request)
    const userId = session?.user?.id || null

    // Generate a session ID for anonymous users
    const sessionId = userId || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Insert click tracking record
    const { error: clickError } = await supabase
      .from('job_external_link_clicks')
      .insert({
        job_id: jobId,
        user_id: userId,
        external_url: externalUrl,
        referrer_url: referrerUrl,
        ip_address: ip,
        user_agent: userAgent,
        session_id: sessionId,
        clicked_at: new Date().toISOString()
      })

    if (clickError) {
      console.error('Error tracking click:', clickError)
      // Don't fail the request - just log the error
    }

    // Optional: Queue notification to recruiter
    if (job.poster_id && userId !== job.poster_id) {
      try {
        await supabase
          .from('notification_queue')
          .insert({
            recipient_id: job.poster_id,
            notification_type: 'external_link_click',
            data: {
              job_id: jobId,
              clicked_by_user_id: userId,
              external_url: externalUrl,
              clicked_at: new Date().toISOString()
            },
            status: 'pending'
          })
      } catch (notificationError) {
        console.error('Error queuing notification:', notificationError)
        // Don't fail the request for notification errors
      }
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Click tracked successfully',
        redirectUrl: externalUrl 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in track-click API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}