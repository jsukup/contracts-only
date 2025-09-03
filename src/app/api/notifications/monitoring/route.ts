import { NextRequest, NextResponse } from 'next/server'
import { NotificationMonitor } from '@/lib/notifications/monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const report = searchParams.get('report')
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'
    const format = searchParams.get('format')
    
    // Health check endpoint
    if (report === 'health') {
      const health = await NotificationMonitor.checkSystemHealth()
      return NextResponse.json(health)
    }
    
    // Metrics endpoint
    if (report === 'metrics') {
      const metrics = await NotificationMonitor.collectMetrics(period)
      return NextResponse.json(metrics)
    }
    
    // Prometheus metrics export
    if (format === 'prometheus') {
      const prometheusMetrics = NotificationMonitor.exportMetricsForPrometheus()
      return new NextResponse(prometheusMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4'
        }
      })
    }
    
    // Full performance report (default)
    const performanceReport = await NotificationMonitor.generatePerformanceReport(period)
    
    return NextResponse.json({
      success: true,
      report: performanceReport,
      generated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error generating monitoring report:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate monitoring report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Dashboard data endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body
    
    if (action === 'clear-alerts') {
      // In production, would clear alerts from database
      return NextResponse.json({
        success: true,
        message: 'Alerts cleared successfully'
      })
    }
    
    if (action === 'test-notification') {
      // Test notification sending
      const { type, recipient } = data
      
      // In production, would send test notification
      console.log(`Test notification: ${type} to ${recipient}`)
      
      return NextResponse.json({
        success: true,
        message: 'Test notification sent',
        details: {
          type,
          recipient,
          timestamp: new Date().toISOString()
        }
      })
    }
    
    if (action === 'export-report') {
      // Export detailed report
      const { period, format } = data
      const report = await NotificationMonitor.generatePerformanceReport(period)
      
      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertReportToCSV(report)
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="notification-report-${period}.csv"`
          }
        })
      }
      
      return NextResponse.json(report)
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error processing monitoring action:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process monitoring action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to convert report to CSV
function convertReportToCSV(report: any): string {
  const lines: string[] = []
  
  // Header
  lines.push('Notification Performance Report')
  lines.push(`Period: ${report.period}`)
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  
  // Metrics
  lines.push('Metrics')
  lines.push('Metric,Value')
  lines.push(`Total Sent,${report.metrics.totalSent}`)
  lines.push(`Total Failed,${report.metrics.totalFailed}`)
  lines.push(`Emails Today,${report.metrics.emailsSentToday}`)
  lines.push(`Emails This Week,${report.metrics.emailsSentThisWeek}`)
  lines.push(`Emails This Month,${report.metrics.emailsSentThisMonth}`)
  lines.push(`Avg Delivery Time (ms),${report.metrics.avgDeliveryTime}`)
  lines.push(`Open Rate (%),${report.metrics.userEngagement.openRate.toFixed(1)}`)
  lines.push(`Click Rate (%),${report.metrics.userEngagement.clickRate.toFixed(1)}`)
  lines.push(`Unsubscribe Rate (%),${report.metrics.userEngagement.unsubscribeRate.toFixed(1)}`)
  lines.push('')
  
  // Top notification types
  lines.push('Top Notification Types')
  lines.push('Type,Count')
  report.metrics.topNotificationTypes.forEach((item: any) => {
    lines.push(`${item.type},${item.count}`)
  })
  lines.push('')
  
  // System health
  lines.push('System Health')
  lines.push(`Status,${report.health.status}`)
  lines.push('Component,Status')
  Object.entries(report.health.components).forEach(([component, status]) => {
    lines.push(`${component},${status ? 'OK' : 'ERROR'}`)
  })
  lines.push('')
  
  // Alerts
  if (report.health.alerts.length > 0) {
    lines.push('Alerts')
    lines.push('Severity,Message,Component,Timestamp')
    report.health.alerts.forEach((alert: any) => {
      lines.push(`${alert.severity},"${alert.message}",${alert.component},${alert.timestamp}`)
    })
    lines.push('')
  }
  
  // Recommendations
  lines.push('Recommendations')
  report.recommendations.forEach((rec: string) => {
    lines.push(`"${rec}"`)
  })
  
  return lines.join('\n')
}