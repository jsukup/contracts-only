import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const jobId = searchParams.get('jobId')
    const type = searchParams.get('type') // 'contractor' or 'employer'
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build reviews query
    let reviewsQuery = supabase
      .from('reviews')
      .select(`
        *,
        contractor:contractor_id (
          id, name, email
        ),
        employer:employer_id (
          id, name, email
        ),
        job:job_id (
          id, title, company
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (userId) {
      if (type === 'contractor') {
        reviewsQuery = reviewsQuery.eq('contractor_id', userId)
      } else if (type === 'employer') {
        reviewsQuery = reviewsQuery.eq('employer_id', userId)
      }
    }

    if (jobId) {
      reviewsQuery = reviewsQuery.eq('job_id', jobId)
    }

    // Build count query with same filters
    let countQuery = supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })

    if (userId) {
      if (type === 'contractor') {
        countQuery = countQuery.eq('contractor_id', userId)
      } else if (type === 'employer') {
        countQuery = countQuery.eq('employer_id', userId)
      }
    }

    if (jobId) {
      countQuery = countQuery.eq('job_id', jobId)
    }

    // Execute queries in parallel
    const [reviewsResult, countResult] = await Promise.all([
      reviewsQuery,
      countQuery
    ])

    if (reviewsResult.error) {
      console.error('Error fetching reviews:', reviewsResult.error)
      throw reviewsResult.error
    }

    if (countResult.error) {
      console.error('Error counting reviews:', countResult.error)
      throw countResult.error
    }

    const reviews = reviewsResult.data || []
    const total = countResult.count || 0

    // Calculate average rating if userId is provided
    let averageRating = null
    if (userId) {
      let avgQuery = supabase
        .from('reviews')
        .select('rating')
      
      if (type === 'contractor') {
        avgQuery = avgQuery.eq('contractor_id', userId)
      } else if (type === 'employer') {
        avgQuery = avgQuery.eq('employer_id', userId)
      }
      
      const { data: ratingData, error: avgError } = await avgQuery
      
      if (!avgError && ratingData && ratingData.length > 0) {
        const sum = ratingData.reduce((acc, review) => acc + review.rating, 0)
        averageRating = sum / ratingData.length
      }
    }

    return NextResponse.json({
      reviews,
      total,
      hasMore: offset + limit < total,
      averageRating
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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
    const { 
      rating, 
      comment, 
      contractorId, 
      employerId, 
      jobId, 
      type // 'for_contractor' or 'for_employer'
    } = body

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!comment?.trim()) {
      return NextResponse.json(
        { error: 'Review comment is required' },
        { status: 400 }
      )
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Check if the user has permission to leave this review
    // They should have been involved in the job application/contract
    const { data: userApplication, error: appError } = await supabase
      .from('job_applications')
      .select(`
        *,
        job:job_id (*)
      `)
      .eq('job_id', jobId)
      .eq('applicant_id', user.id)
      .single()

    const { data: jobOwnership, error: jobError } = await supabase
      .from('jobs')
      .select('poster_id')
      .eq('id', jobId)
      .eq('poster_id', user.id)
      .single()

    if (!userApplication && !jobOwnership) {
      return NextResponse.json(
        { error: 'You can only review jobs you were involved in' },
        { status: 403 }
      )
    }

    // Check if review already exists
    let existingReviewQuery = supabase
      .from('reviews')
      .select('id')
      .eq('job_id', jobId)
      .eq('reviewer_id', user.id)

    if (type === 'for_contractor') {
      existingReviewQuery = existingReviewQuery.eq('contractor_id', contractorId)
    } else {
      existingReviewQuery = existingReviewQuery.eq('employer_id', employerId)
    }

    const { data: existingReview } = await existingReviewQuery.single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this person for this job' },
        { status: 400 }
      )
    }

    // Create review data
    const reviewData: {
      rating: number
      comment: string
      reviewer_id: string
      job_id: string
      reviewee_id?: string
    } = {
      rating,
      comment: comment.trim(),
      reviewer_id: user.id,
      job_id: jobId
    }

    if (type === 'for_contractor') {
      reviewData.contractor_id = contractorId
    } else {
      reviewData.employer_id = employerId
    }

    const { data: review, error: createError } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select(`
        *,
        contractor:contractor_id (
          id, name, email
        ),
        employer:employer_id (
          id, name, email
        ),
        job:job_id (
          id, title, company
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating review:', createError)
      throw createError
    }

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}