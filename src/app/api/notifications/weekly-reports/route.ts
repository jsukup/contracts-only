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

      // Get recruiter's jobs with click tracking enabled
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, external_url, created_at')
        .eq('poster_id', recruiter.id)
        .eq('click_tracking_enabled', true)
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

      // Aggregate click data by job
      const jobClickData = jobs.map(job => {
        const jobClicks = clicks?.filter(click => click.job_id === job.id) || []
        return {
          jobId: job.id,
          title: job.title,
          externalUrl: job.external_url,
          totalClicks: jobClicks.length,
          clicksByDay: aggregateClicksByDay(jobClicks, startDate, endDate)
        }
      })

      const totalClicks = clicks?.length || 0
      
      if (totalClicks > 0) {
        // Generate and send the weekly report
        await sendWeeklyReport({
          recruiter,
          jobClickData,
          totalClicks,
          startDate,
          endDate
        })
        
        reports.push({
          recruiterId: recruiter.id,
          email: recruiter.email,
          totalClicks,
          jobsTracked: jobs.length
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

async function sendWeeklyReport({ 
  recruiter, 
  jobClickData, 
  totalClicks, 
  startDate, 
  endDate 
}: {
  recruiter: any
  jobClickData: any[]
  totalClicks: number
  startDate: Date
  endDate: Date
}) {
  const dateRange = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
  
  // Generate HTML email content
  const htmlContent = generateWeeklyReportHtml({
    recruiterName: recruiter.name || 'Recruiter',
    dateRange,
    totalClicks,
    jobClickData
  })
  
  try {
    await sendEmail({
      to: recruiter.email,
      subject: `📊 Weekly Job Performance Report - ${dateRange}`,
      html: htmlContent,
      from: 'ContractsOnly <reports@contracts-only.com>'
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
  jobClickData 
}: {
  recruiterName: string
  dateRange: string
  totalClicks: number
  jobClickData: any[]
}) {
  const topPerformer = jobClickData.sort((a, b) => b.totalClicks - a.totalClicks)[0]
  
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
                <h3>📈 Overview</h3>
                <p><span class="number">${totalClicks}</span> total external link clicks</p>
                <p><span class="number">${jobClickData.length}</span> jobs with click tracking enabled</p>
                ${topPerformer ? `<p>🏆 Top performer: <strong>${topPerformer.title}</strong> (${topPerformer.totalClicks} clicks)</p>` : ''}
            </div>
            
            <h3>📋 Job Performance Details</h3>
            ${jobClickData.map(job => `
                <div class="job-item">
                    <h4>${job.title}</h4>
                    <p><strong>${job.totalClicks} clicks</strong> this week</p>
                    ${job.totalClicks > 0 ? `
                        <p><small>Daily breakdown: ${job.clicksByDay.map((day: any) => `${day.date}: ${day.clicks}`).join(', ')}</small></p>
                    ` : '<p><small>No clicks this week</small></p>'}
                </div>
            `).join('')}
            
            <div class="stat-box">
                <h4>💡 Tips for Better Performance</h4>
                <ul>
                    <li>Jobs with detailed descriptions get 40% more clicks</li>
                    <li>Clear salary ranges increase engagement by 25%</li>
                    <li>Remote-friendly positions see 60% more interest</li>
                </ul>
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