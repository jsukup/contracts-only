import { NextRequest, NextResponse } from 'next/server'
import { createPublicSupabaseClient } from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const supabase = createPublicSupabaseClient(req)
    
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        poster:poster_id (
          id, name, email, image, title, bio
        ),
        job_skills (
          skill:skill_id (
            id, name, category
          )
        ),
        applications:job_applications (count)
      `)
      .eq('id', jobId)
      .single()
    
    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    // Transform database fields to match frontend interface
    const transformedJob = {
      id: job.id,
      title: job.title,
      description: job.description,
      company: job.company,
      location: job.location,
      isRemote: job.is_remote,
      jobType: job.job_type,
      hourlyRateMin: job.hourly_rate_min,
      hourlyRateMax: job.hourly_rate_max,
      currency: job.currency,
      contractDuration: job.contract_duration,
      hoursPerWeek: job.hours_per_week,
      startDate: job.start_date,
      applicationUrl: job.application_url,
      applicationEmail: job.application_email,
      applicationDeadline: job.application_deadline,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      benefits: job.benefits,
      isActive: job.is_active,
      experienceLevel: job.experience_level,
      viewCount: job.view_count,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      externalUrl: job.external_url,
      clickTrackingEnabled: job.click_tracking_enabled,
      posterId: job.poster_id,
      poster: job.poster,
      jobSkills: job.job_skills?.map(js => ({
        skill: js.skill
      })),
      _count: {
        applications: job.applications?.[0]?.count || 0
      }
    }
    
    return NextResponse.json(transformedJob)
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
    
    // Check if user owns the job
    const { data: existingJob, error: jobError } = await supabase
      .from('jobs')
      .select('poster_id')
      .eq('id', jobId)
      .single()
    
    if (jobError || !existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    if (existingJob.poster_id !== user.id) {
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
    const { data: job, error: updateError } = await supabase
      .from('jobs')
      .update({
        title,
        description,
        company,
        location,
        is_remote: isRemote,
        job_type: jobType,
        hourly_rate_min: hourlyRateMin,
        hourly_rate_max: hourlyRateMax,
        currency,
        contract_duration: contractDuration,
        hours_per_week: hoursPerWeek,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        application_url: applicationUrl,
        application_email: applicationEmail,
        is_active: isActive
      })
      .eq('id', jobId)
      .select(`
        *,
        poster:poster_id (
          id, name, image
        ),
        job_skills (
          skill:skill_id (
            id, name, category
          )
        )
      `)
      .single()
    
    if (updateError) {
      console.error('Error updating job:', updateError)
      throw updateError
    }
    
    // Update skills if provided
    if (skills && Array.isArray(skills)) {
      // Remove existing skills
      const { error: deleteError } = await supabase
        .from('job_skills')
        .delete()
        .eq('job_id', jobId)
      
      if (deleteError) {
        console.error('Error deleting job skills:', deleteError)
        throw deleteError
      }
      
      // Add new skills
      if (skills.length > 0) {
        const { error: insertError } = await supabase
          .from('job_skills')
          .insert(
            skills.map((skillId: string) => ({
              job_id: jobId,
              skill_id: skillId
            }))
          )
        
        if (insertError) {
          console.error('Error inserting job skills:', insertError)
          throw insertError
        }
      }
    }
    
    // Get updated job with relationships
    const { data: updatedJob, error: finalError } = await supabase
      .from('jobs')
      .select(`
        *,
        poster:poster_id (
          id, name, image
        ),
        job_skills (
          skill:skill_id (
            id, name, category
          )
        )
      `)
      .eq('id', jobId)
      .single()
    
    if (finalError) {
      console.error('Error fetching updated job:', finalError)
      throw finalError
    }
    
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
    
    // Check if user owns the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('poster_id')
      .eq('id', jobId)
      .single()
    
    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    
    if (job.poster_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('jobs')
      .update({ is_active: false })
      .eq('id', jobId)
    
    if (deleteError) {
      console.error('Error deleting job:', deleteError)
      throw deleteError
    }
    
    return NextResponse.json({ message: 'Job deleted successfully' })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}