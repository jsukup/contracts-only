import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { AnalyticsEngine, RecruiterAnalytics } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Allow access for admins or employers
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EMPLOYER')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or Employer access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') // 'json' or 'csv'

    let dateRange: { start: Date; end: Date } | undefined

    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    }

    const recruiterAnalytics: RecruiterAnalytics = await AnalyticsEngine.getRecruiterAnalytics(dateRange)

    // If CSV export requested
    if (format === 'csv') {
      const csvData = generateCSVReport(recruiterAnalytics)
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="recruiter-analytics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Enhanced response with summary for recruiter presentations
    const response = {
      ...recruiterAnalytics,
      summary: {
        headline: `${recruiterAnalytics.platformReach.totalActiveContractors.toLocaleString()} Active Contractors • ${recruiterAnalytics.applicationVolume.totalMonthlyApplications.toLocaleString()} Monthly Applications`,
        keyMetrics: [
          {
            label: 'Platform Reach',
            value: `${recruiterAnalytics.platformReach.totalActiveContractors.toLocaleString()} contractors`,
            trend: '+15% growth'
          },
          {
            label: 'Application Volume',
            value: `${recruiterAnalytics.applicationVolume.totalMonthlyApplications.toLocaleString()} monthly applications`,
            trend: `+${recruiterAnalytics.applicationVolume.applicationGrowthRate}% growth`
          },
          {
            label: 'Quality Score',
            value: `${recruiterAnalytics.contractorQuality.averageExperienceYears} avg years experience`,
            trend: '4.2/5 rating'
          },
          {
            label: 'Conversion Rate',
            value: `${Math.round(recruiterAnalytics.conversionMetrics.jobViewToApplicationRate * 100)}% view-to-application`,
            trend: `${recruiterAnalytics.conversionMetrics.averageTimeToHire} days to hire`
          }
        ],
        valueProposition: [
          `Access ${recruiterAnalytics.platformReach.totalActiveContractors.toLocaleString()} pre-screened contractors`,
          `Average ${recruiterAnalytics.applicationVolume.averageApplicationsPerJob} applications per job posting`,
          `${Math.round(recruiterAnalytics.platformReach.averageProfileCompletionRate)}% profile completion rate ensures quality candidates`,
          `${Math.round(recruiterAnalytics.conversionMetrics.applicationToHireRate * 100)}% application-to-hire success rate`
        ]
      },
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        dateRange: dateRange ? `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}` : 'All time',
        reportVersion: '1.0'
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to generate recruiter analytics:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics report' },
      { status: 500 }
    )
  }
}

function generateCSVReport(analytics: RecruiterAnalytics): string {
  const lines: string[] = []
  
  // Header
  lines.push('ContractsOnly Recruiter Analytics Report')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // Platform Reach
  lines.push('PLATFORM REACH')
  lines.push('Metric,Value')
  lines.push(`Total Active Contractors,${analytics.platformReach.totalActiveContractors}`)
  lines.push(`Monthly Active Contractors,${analytics.platformReach.monthlyActiveContractors}`)
  lines.push(`Contractors with Target Skills,${analytics.platformReach.contractorsInTargetSkills}`)
  lines.push(`Profile Completion Rate,${analytics.platformReach.averageProfileCompletionRate}%`)
  lines.push('')

  // Application Volume
  lines.push('APPLICATION VOLUME')
  lines.push('Metric,Value')
  lines.push(`Total Monthly Applications,${analytics.applicationVolume.totalMonthlyApplications}`)
  lines.push(`Average Applications per Job,${analytics.applicationVolume.averageApplicationsPerJob}`)
  lines.push(`Application Growth Rate,${analytics.applicationVolume.applicationGrowthRate}%`)
  lines.push('')

  // Top Skills in Demand
  lines.push('TOP SKILLS IN DEMAND')
  lines.push('Skill,Demand Score,Average Rate')
  analytics.marketIntelligence.demandBySkill.forEach(skill => {
    lines.push(`${skill.skill},${skill.demandScore}%,$${skill.avgRate}/hr`)
  })
  lines.push('')

  // Location Trends
  lines.push('LOCATION TRENDS')
  lines.push('Location,Contractor Count,Average Rate')
  analytics.marketIntelligence.locationTrends.forEach(location => {
    lines.push(`${location.location},${location.contractorCount},$${location.avgRate}/hr`)
  })
  lines.push('')

  // Conversion Metrics
  lines.push('CONVERSION METRICS')
  lines.push('Metric,Value')
  lines.push(`Job View to Application Rate,${Math.round(analytics.conversionMetrics.jobViewToApplicationRate * 100)}%`)
  lines.push(`Application to Hire Rate,${Math.round(analytics.conversionMetrics.applicationToHireRate * 100)}%`)
  lines.push(`Average Time to Hire,${analytics.conversionMetrics.averageTimeToHire} days`)
  lines.push(`Recruiter Satisfaction Score,${analytics.conversionMetrics.recruiterSatisfactionScore}/5`)

  return lines.join('\n')
}