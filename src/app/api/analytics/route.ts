import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { AnalyticsEngine } from '@/lib/analytics'

// Get platform analytics (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Require admin access for analytics
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')

    // Parse date range if provided
    const dateRange = startDate && endDate 
      ? { 
          start: new Date(startDate), 
          end: new Date(endDate) 
        }
      : undefined

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
      
      case 'executive':
      case 'summary':
      default:
        data = await AnalyticsEngine.getExecutiveSummary(dateRange)
        break
    }

    return NextResponse.json({
      type,
      dateRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      } : null,
      data,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}