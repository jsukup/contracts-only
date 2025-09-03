import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, preferences } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      )
    }

    // Validate and decode token
    let userId: string
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [id, timestamp] = decoded.split(':')
      
      if (!id || !timestamp) {
        throw new Error('Invalid token format')
      }
      
      // Check if token is not too old (24 hours)
      const tokenTime = parseInt(timestamp)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      if (now - tokenTime > twentyFourHours) {
        throw new Error('Unsubscribe link has expired')
      }
      
      userId = id
      
    } catch (error) {
      console.error('Token validation error:', error)
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get current user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, marketing_preferences')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('User lookup error:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prepare updated preferences
    const currentPreferences = user.marketing_preferences as any || {}
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      unsubscribed_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    }

    // Update user preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({
        marketing_preferences: updatedPreferences
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Preferences update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    // Log the unsubscribe action for compliance
    console.log(`[Unsubscribe] User ${user.email} updated preferences:`, preferences)
    
    // Check if user unsubscribed from everything
    const unsubscribedFromAll = Object.values(preferences).every(value => value === false)
    
    return NextResponse.json({
      success: true,
      message: unsubscribedFromAll 
        ? 'You have been unsubscribed from all marketing emails' 
        : 'Your email preferences have been updated',
      email: user.email,
      preferences: updatedPreferences
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process unsubscribe request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to validate token and get current preferences
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token parameter is required' },
        { status: 400 }
      )
    }

    // Validate and decode token
    let userId: string
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [id, timestamp] = decoded.split(':')
      
      if (!id || !timestamp) {
        throw new Error('Invalid token format')
      }
      
      // Check if token is not too old (24 hours)
      const tokenTime = parseInt(timestamp)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      if (now - tokenTime > twentyFourHours) {
        throw new Error('Unsubscribe link has expired')
      }
      
      userId = id
      
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Get user preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, marketing_preferences')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const preferences = user.marketing_preferences as any || {}
    
    return NextResponse.json({
      success: true,
      email: user.email,
      preferences: {
        newsletter: preferences.newsletter !== false,
        marketing: preferences.marketing !== false,
        jobAlerts: preferences.job_alerts !== false,
        applicationUpdates: preferences.application_updates !== false
      }
    })

  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get preferences',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}