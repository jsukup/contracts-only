import { NextRequest, NextResponse } from 'next/server'

// Store errors in memory for demo (in production, use proper error tracking like Sentry)
interface ErrorReport {
  id: string
  message: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
  timestamp: number
  url?: string
  userAgent?: string
  userId?: string
  sessionId?: string
}

const errorsStore: ErrorReport[] = []

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()

    const errorReport: ErrorReport = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: errorData.message,
      filename: errorData.filename,
      lineno: errorData.lineno,
      colno: errorData.colno,
      stack: errorData.stack,
      timestamp: errorData.timestamp || Date.now(),
      url: errorData.url,
      userAgent: errorData.userAgent,
      userId: errorData.userId,
      sessionId: errorData.sessionId
    }

    errorsStore.push(errorReport)

    // Keep only recent errors (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentErrors = errorsStore.filter(error => error.timestamp > sevenDaysAgo)
    errorsStore.length = 0
    errorsStore.push(...recentErrors)

    console.error(`JavaScript Error: ${errorReport.message}`, {
      filename: errorReport.filename,
      line: errorReport.lineno,
      column: errorReport.colno,
      url: errorReport.url,
      stack: errorReport.stack
    })

    // In production, send to error tracking service
    await sendErrorToTrackingService(errorReport)

    return NextResponse.json({ 
      errorId: errorReport.id,
      status: 'received' 
    })
  } catch (error) {
    console.error('Failed to process error report:', error)
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hoursBack = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')

    const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000

    let filteredErrors = errorsStore.filter(error => error.timestamp > cutoffTime)

    if (search) {
      filteredErrors = filteredErrors.filter(error => 
        error.message.toLowerCase().includes(search.toLowerCase()) ||
        error.filename?.toLowerCase().includes(search.toLowerCase()) ||
        error.url?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Sort by timestamp (newest first) and limit results
    const resultErrors = filteredErrors
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)

    // Calculate error statistics
    const stats = {
      total: filteredErrors.length,
      uniqueMessages: new Set(filteredErrors.map(e => e.message)).size,
      uniqueFiles: new Set(filteredErrors.map(e => e.filename).filter(Boolean)).size,
      errorsByHour: calculateErrorsByHour(filteredErrors),
      topErrors: getTopErrors(filteredErrors)
    }

    return NextResponse.json({
      errors: resultErrors,
      stats,
      total: filteredErrors.length
    })
  } catch (error) {
    console.error('Failed to retrieve errors:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve errors' },
      { status: 500 }
    )
  }
}

function calculateErrorsByHour(errors: ErrorReport[]) {
  const hourlyCount: Record<string, number> = {}
  
  errors.forEach(error => {
    const hour = new Date(error.timestamp).toISOString().slice(0, 13) // YYYY-MM-DDTHH
    hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
  })

  return Object.entries(hourlyCount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }))
}

function getTopErrors(errors: ErrorReport[]) {
  const errorCount: Record<string, { count: number, latest: number, sample: ErrorReport }> = {}

  errors.forEach(error => {
    if (!errorCount[error.message]) {
      errorCount[error.message] = { count: 0, latest: 0, sample: error }
    }
    errorCount[error.message].count++
    if (error.timestamp > errorCount[error.message].latest) {
      errorCount[error.message].latest = error.timestamp
      errorCount[error.message].sample = error
    }
  })

  return Object.entries(errorCount)
    .map(([message, data]) => ({
      message,
      count: data.count,
      latest: data.latest,
      filename: data.sample.filename,
      lineno: data.sample.lineno
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

async function sendErrorToTrackingService(error: ErrorReport) {
  // In production, send to services like:
  // - Sentry
  // - Bugsnag  
  // - LogRocket
  // - DataDog

  // Example: Send to Sentry (if configured)
  if (process.env.SENTRY_DSN) {
    try {
      // Would use Sentry SDK here
      console.log('Would send to Sentry:', error.message)
    } catch (sentryError) {
      console.error('Failed to send to Sentry:', sentryError)
    }
  }

  // Example: Send critical errors to Slack
  if (process.env.SLACK_ERROR_WEBHOOK_URL && isCriticalError(error)) {
    try {
      await fetch(process.env.SLACK_ERROR_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔥 Critical Error: ${error.message}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Error:* ${error.message}\n*File:* ${error.filename || 'Unknown'}:${error.lineno || '?'}\n*URL:* ${error.url || 'N/A'}\n*Stack:* \`\`\`${error.stack?.slice(0, 500) || 'No stack trace'}\`\`\``
              }
            }
          ]
        })
      })
    } catch (slackError) {
      console.error('Failed to send error to Slack:', slackError)
    }
  }
}

function isCriticalError(error: ErrorReport): boolean {
  const criticalPatterns = [
    /network error/i,
    /failed to fetch/i,
    /uncaught/i,
    /unhandled/i,
    /auth/i,
    /payment/i,
    /database/i,
    /server error/i
  ]

  return criticalPatterns.some(pattern => pattern.test(error.message))
}