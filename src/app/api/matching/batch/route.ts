import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { JobMatchingEngine } from '@/lib/matching'
import { createServerSupabaseClient } from '@/lib/supabase'

// Batch job matching for daily notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Only admins can trigger batch matching
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      userIds, 
      maxMatchesPerUser = 5,
      minScore = 70,
      sendNotifications = false 
    } = body

    let targetUserIds: string[]

    if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds
    } else {
      const supabase = createServerSupabaseClient()
      
      // Get all active users if no specific IDs provided
      const { data: activeUsers } = await supabase
        .from('users')
        .select('id')
        .eq('availability', 'AVAILABLE')
        .not('email_verified', 'is', null)
        .limit(1000) // Limit batch size

      targetUserIds = activeUsers?.map(u => u.id) || []
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        message: 'No users to process',
        processedCount: 0,
        matchCount: 0
      })
    }

    // Generate daily matches
    const dailyMatches = await JobMatchingEngine.generateDailyMatches(
      targetUserIds,
      maxMatchesPerUser
    )

    let notificationsSent = 0
    let totalMatches = 0

    // Process matches and optionally send notifications
    for (const [userId, matches] of dailyMatches.entries()) {
      totalMatches += matches.length

      if (sendNotifications && matches.length > 0) {
        // In real implementation, send email notifications
        // await sendDailyMatchNotification(userId, matches)
        notificationsSent++
      }

      // Store matches in database for user dashboard
      // In real implementation, save to a UserMatches table
      // await saveUserMatches(userId, matches)
    }

    return NextResponse.json({
      message: 'Batch matching completed successfully',
      processedUsers: targetUserIds.length,
      usersWithMatches: dailyMatches.size,
      totalMatches,
      notificationsSent,
      averageMatchesPerUser: totalMatches / Math.max(dailyMatches.size, 1),
      executedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in batch matching:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get batch matching status and history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In real implementation, fetch from database
    const batchHistory = [
      {
        id: 'batch-001',
        executedAt: '2024-01-15T09:00:00Z',
        processedUsers: 245,
        usersWithMatches: 189,
        totalMatches: 456,
        notificationsSent: 189,
        executionTimeMs: 2340,
        status: 'completed'
      },
      {
        id: 'batch-002',
        executedAt: '2024-01-14T09:00:00Z',
        processedUsers: 238,
        usersWithMatches: 201,
        totalMatches: 523,
        notificationsSent: 201,
        executionTimeMs: 2180,
        status: 'completed'
      }
    ]

    const stats = {
      totalBatchesRun: batchHistory.length,
      averageMatches: batchHistory.reduce((sum, batch) => sum + batch.totalMatches, 0) / batchHistory.length,
      averageExecutionTime: batchHistory.reduce((sum, batch) => sum + batch.executionTimeMs, 0) / batchHistory.length,
      lastRunAt: batchHistory[0]?.executedAt,
      nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Next 24 hours
    }

    return NextResponse.json({
      stats,
      recentBatches: batchHistory,
      currentStatus: 'idle' // or 'running'
    })

  } catch (error) {
    console.error('Error getting batch matching status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}