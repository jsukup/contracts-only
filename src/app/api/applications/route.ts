import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRoute } from '@/lib/auth-server'

export async function GET(req: NextRequest) {
  try {
    const { user, userProfile, supabase } = await authenticateApiRoute(req)
    
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'sent' // 'sent' or 'received'
    const statusParam = searchParams.get('status')
    
    // Validate status parameter
    const validStatuses = ['PENDING', 'REVIEWED', 'INTERVIEW', 'ACCEPTED', 'REJECTED']
    let status: string | undefined
    if (statusParam && validStatuses.includes(statusParam)) {
      status = statusParam
    }
    
    let applications
    
    if (type === 'sent') {
      // Applications sent by the user
      let query = supabase
        .from('job_applications')
        .select(`
          *,
          job:job_id (
            *,
            poster:poster_id (id, name, image)
          )
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
      
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching sent applications:', error)
        throw error
      }
      
      applications = data
    } else {
      // Applications received for user's job postings
      // First get user's job IDs
      const { data: userJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('poster_id', user.id)
      
      if (jobsError) {
        console.error('Error fetching user jobs:', jobsError)
        throw jobsError
      }
      
      if (!userJobs || userJobs.length === 0) {
        applications = []
      } else {
        const jobIds = userJobs.map(job => job.id)
        
        let query = supabase
          .from('job_applications')
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
          .in('job_id', jobIds)
          .order('created_at', { ascending: false })
        
        if (status) {
          query = query.eq('status', status)
        }
        
        const { data, error } = await query
        
        if (error) {
          console.error('Error fetching received applications:', error)
          throw error
        }
        
        applications = data
      }
    }
    
    return NextResponse.json(applications || [])
  } catch (error) {
    console.error('Error fetching applications:', error)
    
    // Handle authentication errors
    if (error instanceof Error && 
        (error.message.includes('Authentication failed') || 
         error.message.includes('No authenticated user') ||
         error.message.includes('User profile not found'))) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error.message },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}