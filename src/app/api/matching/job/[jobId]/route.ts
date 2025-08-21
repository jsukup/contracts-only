import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { JobMatchingEngine } from '@/lib/matching'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    
    // Check if user owns this job or is admin
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_poster_id_fkey(id, name, role)
      `)
      .eq('id', params.jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.users?.id !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const minScore = parseInt(searchParams.get('minScore') || '60')

    // Get candidate matches for the job
    const candidates = await JobMatchingEngine.getCandidatesForJob(
      params.jobId,
      Math.min(limit, 100), // Cap at 100
      Math.max(minScore, 0) // Ensure non-negative
    )

    // In a real implementation, fetch user profile data for each candidate
    const candidatesWithProfileData = await Promise.all(
      candidates.map(async (candidate) => {
        // Mock profile data - in real implementation, fetch from database
        const profileData = {
          id: candidate.userId,
          name: ['John Doe', 'Jane Smith', 'Alex Johnson', 'Sarah Wilson'][Math.floor(Math.random() * 4)],
          title: `Senior ${['Developer', 'Designer', 'Consultant'][Math.floor(Math.random() * 3)]}`,
          location: candidate.locationScore === 100 ? 'Remote' : 'San Francisco, CA',
          hourlyRate: `$${80 + Math.floor(Math.random() * 70)}-${120 + Math.floor(Math.random() * 80)}/hr`,
          experience: ['3 years', '5 years', '8 years', '10+ years'][Math.floor(Math.random() * 4)],
          profileImage: null,
          rating: 4.2 + Math.random() * 0.8,
          completedJobs: Math.floor(Math.random() * 25) + 5,
          skills: [
            'React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker'
          ].slice(0, 3 + Math.floor(Math.random() * 3)),
          availability: ['Available now', 'Available in 2 weeks', 'Available next month'][Math.floor(Math.random() * 3)]
        }

        return {
          ...candidate,
          profile: profileData
        }
      })
    )

    return NextResponse.json({
      candidates: candidatesWithProfileData,
      total: candidates.length,
      jobId: params.jobId,
      filters: {
        limit,
        minScore
      }
    })

  } catch (error) {
    console.error('Error getting job candidates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Invite candidates to apply for a job
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user owns this job
    const supabase = createServerSupabaseClient()
    
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_poster_id_fkey(id, name)
      `)
      .eq('id', params.jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.users?.id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { candidateIds, message } = body

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one candidate ID is required' },
        { status: 400 }
      )
    }

    if (candidateIds.length > 10) {
      return NextResponse.json(
        { error: 'Cannot invite more than 10 candidates at once' },
        { status: 400 }
      )
    }

    // Create job invitations
    const invitations = await Promise.all(
      candidateIds.map(async (userId: string) => {
        // In real implementation, create invitation records
        // and send notification emails
        
        return {
          id: `inv_${Math.random().toString(36).substr(2, 9)}`,
          jobId: params.jobId,
          userId,
          message: message || `You've been invited to apply for ${job.title}`,
          status: 'sent',
          sentAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })
    )

    // In real implementation, send email notifications here
    // await sendJobInvitationEmails(invitations, job)

    return NextResponse.json({
      message: `Successfully invited ${candidateIds.length} candidates`,
      invitations,
      jobId: params.jobId
    })

  } catch (error) {
    console.error('Error inviting candidates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}