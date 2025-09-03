import { NextRequest, NextResponse } from 'next/server'
import { EmailAutomationEngine } from '@/lib/email/automation'
import { JobQueue, JobConfigs } from '@/lib/automation/job-queue'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'development-secret'
    
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' }, 
        { status: 401 }
      )
    }

    console.log('Starting automated notification jobs with job queue system...')
    
    // Define jobs with retry logic and error handling
    const jobs = [
      {
        name: 'contractor-weekly-digests',
        function: async () => {
          return await EmailAutomationEngine.scheduleContractorWeeklyDigests()
        },
        config: JobConfigs.EMAIL_JOBS
      },
      {
        name: 'recruiter-weekly-reports',
        function: async () => {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/weekly-reports`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'ContractsOnly-Cron/1.0'
            }
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate reports`)
          }
          
          return await response.json()
        },
        config: JobConfigs.EXTERNAL_API_JOBS
      }
    ]

    // Execute jobs with built-in retry and error handling
    const jobResults = await JobQueue.executeJobBatch(jobs)
    
    // Transform job results to match expected format
    const results = {
      weeklyDigests: {
        success: jobResults['contractor-weekly-digests']?.success || false,
        error: jobResults['contractor-weekly-digests']?.error || null,
        executionTime: jobResults['contractor-weekly-digests']?.executionTime,
        retryCount: jobResults['contractor-weekly-digests']?.retryCount
      },
      weeklyReports: {
        success: jobResults['recruiter-weekly-reports']?.success || false,
        error: jobResults['recruiter-weekly-reports']?.error || null,
        executionTime: jobResults['recruiter-weekly-reports']?.executionTime,
        retryCount: jobResults['recruiter-weekly-reports']?.retryCount
      },
      timestamp: new Date().toISOString()
    }

    const overallSuccess = results.weeklyDigests.success && results.weeklyReports.success

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'All automated notification jobs completed successfully'
        : 'Some automated notification jobs encountered errors',
      results
    }, { 
      status: overallSuccess ? 200 : 207 // 207 = Multi-Status (partial success)
    })

  } catch (error) {
    console.error('Fatal error in automated notification jobs:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute automated notification jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Allow GET requests for manual testing/health checks
export async function GET(request: NextRequest) {
  const testMode = request.nextUrl.searchParams.get('test') === 'true'
  const healthCheck = request.nextUrl.searchParams.get('health') === 'true'
  
  if (healthCheck) {
    // Perform comprehensive health check
    const health = await JobQueue.healthCheck()
    return NextResponse.json({
      ...health,
      cron: {
        endpoint: '/api/cron/notifications',
        schedule: '0 9 * * 1', // Every Monday 9 AM UTC
        hasSecret: !!process.env.CRON_SECRET,
        environment: process.env.NODE_ENV
      }
    })
  }
  
  if (testMode) {
    // In test mode, just validate the setup without sending emails
    return NextResponse.json({
      message: 'Cron endpoint is configured and ready',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasSecret: !!process.env.CRON_SECRET,
      availableParams: {
        test: 'Validate configuration without executing jobs',
        health: 'Perform comprehensive system health check'
      }
    })
  }
  
  // For non-test requests, execute normally but require auth
  return POST(request)
}