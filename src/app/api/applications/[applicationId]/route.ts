import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function PUT(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
) {
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
      .eq('id', params.applicationId)
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
      .eq('id', params.applicationId)
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
  { params }: { params: { applicationId: string } }
) {
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
      .eq('id', params.applicationId)
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
      .eq('id', params.applicationId)
    
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