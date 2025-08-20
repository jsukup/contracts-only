import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { EmailAutomationEngine } from '@/lib/email/automation'

// Trigger email automation processes (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...params } = body

    let result

    switch (action) {
      case 'process_queue':
        const batchSize = params.batchSize || 50
        await EmailAutomationEngine.processEmailQueue(batchSize)
        result = { message: `Processed up to ${batchSize} emails from queue` }
        break

      case 'schedule_weekly_digests':
        await EmailAutomationEngine.scheduleWeeklyDigests()
        result = { message: 'Weekly digest emails scheduled for all employers' }
        break

      case 'schedule_profile_reminders':
        await EmailAutomationEngine.scheduleProfileReminders()
        result = { message: 'Profile completion reminders scheduled' }
        break

      case 'schedule_job_expiring_reminders':
        await EmailAutomationEngine.scheduleJobExpiringReminders()
        result = { message: 'Job expiring reminders scheduled' }
        break

      case 'schedule_welcome_email':
        if (!params.userId) {
          return NextResponse.json({ error: 'userId required' }, { status: 400 })
        }
        await EmailAutomationEngine.scheduleWelcomeEmail(params.userId, params.delay || 0)
        result = { message: 'Welcome email scheduled' }
        break

      case 'schedule_job_alerts':
        if (!params.jobId) {
          return NextResponse.json({ error: 'jobId required' }, { status: 400 })
        }
        await EmailAutomationEngine.scheduleJobAlerts(params.jobId)
        result = { message: 'Job alert emails scheduled for matching users' }
        break

      case 'schedule_application_confirmation':
        if (!params.userId || !params.jobId) {
          return NextResponse.json(
            { error: 'userId and jobId required' }, 
            { status: 400 }
          )
        }
        await EmailAutomationEngine.scheduleApplicationConfirmation(
          params.userId, 
          params.jobId
        )
        result = { message: 'Application confirmation email scheduled' }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      ...result
    })

  } catch (error) {
    console.error('Error in email automation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get email automation statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    const dateRange = startDate && endDate 
      ? { 
          start: new Date(startDate), 
          end: new Date(endDate) 
        }
      : undefined

    const stats = await EmailAutomationEngine.getEmailStats(dateRange)

    return NextResponse.json({
      dateRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      } : null,
      stats,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting email stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}