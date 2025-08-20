import { NextRequest, NextResponse } from 'next/server'

// Store alerts in memory for demo (in production, use a proper database and notification service)
interface AlertNotification {
  id: string
  alertId: string
  alertName: string
  metric: string
  value: number
  threshold: number
  timestamp: number
  url?: string
  acknowledged?: boolean
}

const alertsStore: AlertNotification[] = []

export async function POST(request: NextRequest) {
  try {
    const alertData = await request.json()

    const notification: AlertNotification = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      alertId: alertData.alertId,
      alertName: alertData.alertName,
      metric: alertData.metric,
      value: alertData.value,
      threshold: alertData.threshold,
      timestamp: alertData.timestamp || Date.now(),
      url: alertData.url,
      acknowledged: false
    }

    alertsStore.push(notification)

    // Keep only recent alerts (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentAlerts = alertsStore.filter(alert => alert.timestamp > sevenDaysAgo)
    alertsStore.length = 0
    alertsStore.push(...recentAlerts)

    console.log(`Alert triggered: ${notification.alertName} - ${notification.metric} = ${notification.value} (threshold: ${notification.threshold})`)

    // In production, send notifications via:
    // - Email (SendGrid, SES)
    // - Slack/Discord webhooks
    // - PagerDuty
    // - SMS (Twilio)
    await sendAlertNotifications(notification)

    return NextResponse.json({ 
      alertId: notification.id,
      status: 'received' 
    })
  } catch (error) {
    console.error('Failed to process alert:', error)
    return NextResponse.json(
      { error: 'Failed to process alert' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const acknowledged = searchParams.get('acknowledged')
    const hoursBack = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '50')

    const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000

    let filteredAlerts = alertsStore.filter(alert => alert.timestamp > cutoffTime)

    if (acknowledged !== null) {
      const isAcknowledged = acknowledged === 'true'
      filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged === isAcknowledged)
    }

    // Sort by timestamp (newest first) and limit results
    const resultAlerts = filteredAlerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)

    return NextResponse.json({
      alerts: resultAlerts,
      total: filteredAlerts.length,
      unacknowledged: filteredAlerts.filter(a => !a.acknowledged).length
    })
  } catch (error) {
    console.error('Failed to retrieve alerts:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve alerts' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { alertId, acknowledged }: { alertId: string, acknowledged: boolean } = await request.json()

    const alert = alertsStore.find(a => a.id === alertId)
    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    alert.acknowledged = acknowledged

    return NextResponse.json({ 
      alertId: alert.id,
      acknowledged: alert.acknowledged 
    })
  } catch (error) {
    console.error('Failed to update alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}

async function sendAlertNotifications(alert: AlertNotification) {
  // In production, implement actual notification sending
  
  // Example: Send to Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Performance Alert: ${alert.alertName}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Alert:* ${alert.alertName}\n*Metric:* ${alert.metric}\n*Value:* ${alert.value}\n*Threshold:* ${alert.threshold}\n*URL:* ${alert.url || 'N/A'}`
              }
            }
          ]
        })
      })
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
    }
  }

  // Example: Send email notification
  if (process.env.ALERT_EMAIL && process.env.SENDGRID_API_KEY) {
    try {
      // Implementation would depend on your email service
      console.log(`Would send email alert to ${process.env.ALERT_EMAIL}`)
    } catch (error) {
      console.error('Failed to send email notification:', error)
    }
  }

  // Log to console for development
  console.log(`🚨 Alert: ${alert.alertName} - ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`)
}