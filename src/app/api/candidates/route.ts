import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const skills = searchParams.get('skills')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createServerSupabaseClient()
    
    // Build the query to get user profiles (contractors only)
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        image,
        location,
        title,
        experience,
        skills,
        created_at,
        hourly_rate_min,
        hourly_rate_max,
        currency
      `)
      .eq('role', 'USER') // Only show contractors, not recruiters
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,title.ilike.%${search}%,location.ilike.%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Transform data to match frontend interface
    const candidates = users?.map(user => ({
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'Unknown',
      email: user.email,
      image: user.image,
      location: user.location,
      title: user.title,
      experience: user.experience,
      skills: user.skills || [],
      rating: 4.5 + Math.random() * 0.5, // Mock rating until reviews implemented
      completedJobs: Math.floor(Math.random() * 20), // Mock completed jobs
      joinedAt: user.created_at,
      hourlyRate: user.hourly_rate_min && user.hourly_rate_max ? {
        min: user.hourly_rate_min,
        max: user.hourly_rate_max,
        currency: user.currency || 'USD'
      } : undefined
    })) || []

    // Apply skills filter if provided
    const filteredCandidates = skills 
      ? candidates.filter(candidate => 
          candidate.skills.some(skill => 
            skill.toLowerCase().includes(skills.toLowerCase())
          )
        )
      : candidates

    return NextResponse.json({
      candidates: filteredCandidates,
      total: filteredCandidates.length,
      hasMore: offset + limit < filteredCandidates.length
    })
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    )
  }
}