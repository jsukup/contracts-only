import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/sender'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get the date range for the past week
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Get all recruiters who have click tracking enabled on their jobs and want weekly reports
    const { data: recruiters, error: recruiterError } = await supabase
      .from('users')
      .select(`
        id, 
        name, 
        email,
        recruiter_notifications
      `)
      .eq('role', 'RECRUITER')
      .not('recruiter_notifications', 'is', null)
    
    if (recruiterError) {
      console.error('Error fetching recruiters:', recruiterError)
      return NextResponse.json({ error: 'Failed to fetch recruiters' }, { status: 500 })
    }

    const reports = []
    
    for (const recruiter of recruiters || []) {
      // Check if recruiter wants weekly reports
      const notifications = recruiter.recruiter_notifications as any
      if (!notifications?.weekly_click_reports) {
        continue
      }

      // Get recruiter's jobs with comprehensive data
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id, 
          title, 
          external_url, 
          created_at,
          view_count,
          hourly_rate_min,
          hourly_rate_max,
          job_type,
          is_remote
        `)
        .eq('poster_id', recruiter.id)
        .eq('is_active', true)

      if (jobsError || !jobs || jobs.length === 0) {
        continue
      }

      const jobIds = jobs.map(job => job.id)

      // Get click data for the past week
      const { data: clicks, error: clicksError } = await supabase
        .from('job_external_link_clicks')
        .select('job_id, clicked_at, external_url')
        .in('job_id', jobIds)
        .gte('clicked_at', startDate.toISOString())
        .lte('clicked_at', endDate.toISOString())

      if (clicksError) {
        console.error('Error fetching clicks for recruiter:', recruiter.id, clicksError)
        continue
      }

      // Get application data for the past week
      const { data: applications, error: applicationsError } = await supabase
        .from('job_applications')
        .select('job_id, created_at, status')
        .in('job_id', jobIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (applicationsError) {
        console.error('Error fetching applications for recruiter:', recruiter.id, applicationsError)
        continue
      }

      // Get job view data for comparison (total views per job)
      const { data: jobViews, error: viewsError } = await supabase
        .from('jobs')
        .select('id, view_count')
        .in('id', jobIds)

      if (viewsError) {
        console.error('Error fetching job views for recruiter:', recruiter.id, viewsError)
      }

      // Aggregate comprehensive performance data by job
      const jobPerformanceData = jobs.map(job => {
        const jobClicks = clicks?.filter(click => click.job_id === job.id) || []
        const jobApplications = applications?.filter(app => app.job_id === job.id) || []
        const totalViews = jobViews?.find(view => view.id === job.id)?.view_count || 0
        
        // Calculate application conversion rate (applications per view)
        const conversionRate = totalViews > 0 ? ((jobApplications.length / totalViews) * 100).toFixed(1) : '0.0'
        
        // Calculate status distribution
        const statusCounts = jobApplications.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        return {
          jobId: job.id,
          title: job.title,
          externalUrl: job.external_url,
          totalClicks: jobClicks.length,
          totalApplications: jobApplications.length,
          totalViews: totalViews,
          conversionRate: parseFloat(conversionRate),
          hourlyRateRange: `$${job.hourly_rate_min}-$${job.hourly_rate_max}`,
          jobType: job.job_type,
          isRemote: job.is_remote,
          statusCounts,
          clicksByDay: aggregateClicksByDay(jobClicks, startDate, endDate),
          applicationsByDay: aggregateApplicationsByDay(jobApplications, startDate, endDate),
          createdAt: job.created_at
        }
      })

      const totalClicks = clicks?.length || 0
      const totalApplications = applications?.length || 0
      const totalViews = jobPerformanceData.reduce((sum, job) => sum + job.totalViews, 0)
      
      // Send report if there's any activity (clicks, applications, or views)
      if (totalClicks > 0 || totalApplications > 0 || totalViews > 0) {
        // Generate and send the comprehensive weekly report
        await sendWeeklyReport({
          recruiter,
          jobPerformanceData,
          totalClicks,
          totalApplications,
          totalViews,
          startDate,
          endDate
        })
        
        reports.push({
          recruiterId: recruiter.id,
          email: recruiter.email,
          totalClicks,
          totalApplications,
          totalViews,
          jobsTracked: jobs.length,
          averageConversionRate: jobPerformanceData.length > 0 
            ? (jobPerformanceData.reduce((sum, job) => sum + job.conversionRate, 0) / jobPerformanceData.length).toFixed(1)
            : '0.0'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Weekly reports sent to ${reports.length} recruiters`,
      reports
    })

  } catch (error) {
    console.error('Error generating weekly reports:', error)
    return NextResponse.json(
      { error: 'Failed to generate weekly reports' },
      { status: 500 }
    )
  }
}

function aggregateClicksByDay(clicks: any[], startDate: Date, endDate: Date) {
  const days = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    const dayClicks = clicks.filter(click => {
      const clickDate = new Date(click.clicked_at)
      return clickDate >= dayStart && clickDate <= dayEnd
    })
    
    days.push({
      date: currentDate.toISOString().split('T')[0],
      clicks: dayClicks.length
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return days
}

function aggregateApplicationsByDay(applications: any[], startDate: Date, endDate: Date) {
  const days = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    const dayApplications = applications.filter(app => {
      const appDate = new Date(app.created_at)
      return appDate >= dayStart && appDate <= dayEnd
    })
    
    days.push({
      date: currentDate.toISOString().split('T')[0],
      applications: dayApplications.length
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return days
}

async function sendWeeklyReport({ 
  recruiter, 
  jobPerformanceData, 
  totalClicks,
  totalApplications,
  totalViews,
  startDate, 
  endDate 
}: {
  recruiter: any
  jobPerformanceData: any[]
  totalClicks: number
  totalApplications: number
  totalViews: number
  startDate: Date
  endDate: Date
}) {
  const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
  
  // Generate HTML email content with comprehensive performance data
  const htmlContent = generateWeeklyReportHtml({
    recruiterName: recruiter.name || 'Recruiter',
    dateRange,
    totalClicks,
    totalApplications,
    totalViews,
    jobPerformanceData
  })
  
  try {
    await sendEmail({
      to: recruiter.email,
      subject: `📊 Weekly Job Performance Report - ${dateRange}`,
      html: htmlContent,
      from: 'ContractsOnly <info@contracts-only.com>'
    })
    
    console.log(`Weekly report sent to ${recruiter.email}`)
  } catch (error) {
    console.error(`Failed to send weekly report to ${recruiter.email}:`, error)
  }
}

function generateWeeklyReportHtml({ 
  recruiterName, 
  dateRange, 
  totalClicks,
  totalApplications,
  totalViews,
  jobPerformanceData 
}: {
  recruiterName: string
  dateRange: string
  totalClicks: number
  totalApplications: number
  totalViews: number
  jobPerformanceData: any[]
}) {
  const topPerformer = jobPerformanceData.sort((a, b) => b.totalApplications - a.totalApplications)[0]
  const topClickJob = jobPerformanceData.sort((a, b) => b.totalClicks - a.totalClicks)[0]
  const topConversionJob = jobPerformanceData.sort((a, b) => b.conversionRate - a.conversionRate)[0]
  const averageConversionRate = jobPerformanceData.length > 0 
    ? (jobPerformanceData.reduce((sum, job) => sum + job.conversionRate, 0) / jobPerformanceData.length).toFixed(1)
    : '0.0'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Job Performance Report</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; margin: 10px 0; border-radius: 8px; }
            .job-item { border-bottom: 1px solid #e2e8f0; padding: 15px 0; }
            .job-item:last-child { border-bottom: none; }
            .number { font-size: 24px; font-weight: bold; color: #4f46e5; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📊 Weekly Job Performance Report</h1>
            <p>${dateRange}</p>
        </div>
        
        <div class="content">
            <p>Hi ${recruiterName},</p>
            <p>Here's your weekly job posting performance summary:</p>
            
            <div class="stat-box">
                <h3>📈 Performance Overview</h3>
                <p><span class="number">${totalViews}</span> total job views</p>
                <p><span class="number">${totalApplications}</span> total applications received</p>
                <p><span class="number">${totalClicks}</span> total external link clicks</p>
                <p><span class="number">${averageConversionRate}%</span> average application rate</p>
                <p><span class="number">${jobPerformanceData.length}</span> active jobs tracked</p>
            </div>
            
            <div class="stat-box">
                <h3>🏆 Top Performers</h3>
                ${topPerformer ? `<p>📋 Most applications: <strong>${topPerformer.title}</strong> (${topPerformer.totalApplications} applications)</p>` : ''}
                ${topClickJob ? `<p>🖱️ Most clicks: <strong>${topClickJob.title}</strong> (${topClickJob.totalClicks} clicks)</p>` : ''}
                ${topConversionJob && topConversionJob.conversionRate > 0 ? `<p>📊 Best conversion: <strong>${topConversionJob.title}</strong> (${topConversionJob.conversionRate}% rate)</p>` : ''}
            </div>
            
            <h3>📋 Detailed Job Performance</h3>
            ${jobPerformanceData.map(job => `
                <div class="job-item">
                    <h4>${job.title}</h4>
                    <p><strong>${job.totalViews} views</strong> • <strong>${job.totalApplications} applications</strong> • <strong>${job.totalClicks} clicks</strong></p>
                    <p>💰 ${job.hourlyRateRange} • 📍 ${job.isRemote ? 'Remote' : 'On-site'} • 📋 ${job.jobType}</p>
                    <p>📊 <strong>Conversion Rate: ${job.conversionRate}%</strong> (applications per view)</p>
                    ${job.totalApplications > 0 ? `
                        <p><small>📈 Applications: ${job.applicationsByDay.map((day: any) => `${day.date}: ${day.applications}`).join(', ')}</small></p>
                    ` : ''}
                    ${job.totalClicks > 0 ? `
                        <p><small>🖱️ Clicks: ${job.clicksByDay.map((day: any) => `${day.date}: ${day.clicks}`).join(', ')}</small></p>
                    ` : ''}
                    ${Object.keys(job.statusCounts).length > 0 ? `
                        <p><small>📋 Application Status: ${Object.entries(job.statusCounts).map(([status, count]) => `${status}: ${count}`).join(', ')}</small></p>
                    ` : ''}
                </div>
            `).join('')}
            
            <div class="stat-box">
                <h4>💡 Performance Insights & Tips</h4>
                <ul>
                    <li>📊 Industry Average: 2-4% application rate (views to applications)</li>
                    <li>🎯 Jobs with detailed descriptions get 40% more applications</li>
                    <li>💰 Clear salary ranges increase engagement by 25%</li>
                    <li>🌐 Remote-friendly positions see 60% more interest</li>
                    <li>⚡ Jobs with faster response times get 30% more quality applications</li>
                    <li>📧 Following up on applications within 48hrs improves acceptance rates</li>
                </ul>
                ${averageConversionRate > 0 ? `
                    <p><small>Your average conversion rate of ${averageConversionRate}% is ${parseFloat(averageConversionRate) >= 2 ? '✅ above' : '⚠️ below'} industry standards.</small></p>
                ` : ''}
            </div>
            
            <p>Want to improve your job performance? <a href="https://contracts-only.vercel.app/employer/dashboard" style="color: #4f46e5;">Visit your dashboard</a> for detailed analytics.</p>
        </div>
        
        <div class="footer">
            <p>© 2024 ContractsOnly. All rights reserved.</p>
            <p><a href="https://contracts-only.vercel.app/profile/settings">Update notification preferences</a></p>
        </div>
    </body>
    </html>
  `
}

// Allow manual trigger for testing
export async function GET() {
  return POST(new NextRequest('http://localhost/api/notifications/weekly-reports', { method: 'POST' }))
}