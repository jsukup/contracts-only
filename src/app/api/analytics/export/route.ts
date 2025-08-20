import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { AnalyticsEngine } from '@/lib/analytics'

// Export analytics data in various formats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const type = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    const dateRange = startDate && endDate 
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined

    // Get analytics data
    let data
    switch (type) {
      case 'jobs':
        data = await AnalyticsEngine.getJobAnalytics(dateRange)
        break
      case 'users':
        data = await AnalyticsEngine.getUserAnalytics(dateRange)
        break
      case 'platform':
        data = await AnalyticsEngine.getPlatformAnalytics()
        break
      default:
        data = await AnalyticsEngine.getExecutiveSummary(dateRange)
        break
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `contractsonly-analytics-${type}-${timestamp}`

    switch (format.toLowerCase()) {
      case 'csv':
        const csvData = convertToCSV(data, type)
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}.csv"`
          }
        })

      case 'xlsx':
        // In a real implementation, use a library like 'xlsx' to generate Excel files
        return NextResponse.json(
          { error: 'Excel export not implemented yet' },
          { status: 501 }
        )

      case 'pdf':
        // In a real implementation, use a library like 'puppeteer' or 'jspdf'
        return NextResponse.json(
          { error: 'PDF export not implemented yet' },
          { status: 501 }
        )

      case 'json':
      default:
        return new NextResponse(JSON.stringify(data, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}.json"`
          }
        })
    }

  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function convertToCSV(data: any, type: string): string {
  const rows: string[] = []

  if (type === 'jobs') {
    rows.push('Metric,Value')
    rows.push(`Total Jobs,${data.totalJobs}`)
    rows.push(`Active Jobs,${data.activeJobs}`)
    rows.push(`Average Hourly Rate,${data.averageHourlyRate}`)
    rows.push(`Total Applications,${data.applicationMetrics.totalApplications}`)
    
    rows.push('')
    rows.push('Category,Job Count')
    data.jobsByCategory.forEach((item: any) => {
      rows.push(`${item.category},${item.count}`)
    })

    rows.push('')
    rows.push('Rate Range,Job Count')
    data.rateDistribution.forEach((item: any) => {
      rows.push(`${item.range},${item.count}`)
    })
  
  } else if (type === 'users') {
    rows.push('Metric,Value')
    rows.push(`Total Users,${data.totalUsers}`)
    rows.push(`Contractors,${data.contractorCount}`)
    rows.push(`Employers,${data.employerCount}`)
    rows.push(`Profile Completion Rate,${data.profileCompletionRate}%`)
    rows.push(`Daily Active Users,${data.activenessMetrics.dailyActiveUsers}`)
    
    rows.push('')
    rows.push('Skill,User Count')
    data.skillDistribution.forEach((item: any) => {
      rows.push(`${item.skill},${item.count}`)
    })

    rows.push('')
    rows.push('Date,New Users')
    data.userGrowth.forEach((item: any) => {
      rows.push(`${item.date},${item.count}`)
    })
  
  } else {
    // Executive summary
    rows.push('KPI,Value')
    Object.entries(data.kpis || {}).forEach(([key, value]) => {
      rows.push(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()},${value}`)
    })

    rows.push('')
    rows.push('Insight')
    data.insights?.forEach((insight: string) => {
      rows.push(`"${insight}"`)
    })
  }

  return rows.join('\n')
}