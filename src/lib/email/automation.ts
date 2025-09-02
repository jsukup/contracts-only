import { createServerSupabaseClient } from '@/lib/supabase'
import { db } from '@/lib/database'
import { EmailType, EmailJobStatus } from '@/lib/types'
import { EmailTemplateEngine, EmailTemplateData } from './templates'
import { sendEmail } from './sender'

export type EmailAutomationType = 
  | 'welcome'
  | 'job_alert' 
  | 'application_confirmation'
  | 'employer_weekly_digest'
  | 'profile_completion_reminder'
  | 'job_expiring_reminder'
  | 'match_notification'

// Map custom types to EmailType enum values
function mapToEmailType(type: EmailAutomationType): EmailType {
  switch (type) {
    case 'welcome':
    case 'job_alert':
      return EmailType.JOB_APPLICATION_NOTIFICATION
    case 'application_confirmation':
      return EmailType.JOB_POSTING_CONFIRMATION
    case 'employer_weekly_digest':
      return EmailType.WEEKLY_DIGEST
    case 'profile_completion_reminder':
    case 'job_expiring_reminder':
    case 'match_notification':
      return EmailType.APPLICATION_STATUS_UPDATE
    default:
      return EmailType.JOB_APPLICATION_NOTIFICATION
  }
}

export class EmailAutomationEngine {
  /**
   * Schedule welcome email for new user
   */
  static async scheduleWelcomeEmail(userId: string, delay: number = 0): Promise<void> {
    const user = await db.findUniqueUser(
      { id: userId },
      { email: true, name: true }
    )

    if (!user) return

    await this.scheduleEmail({
      type: 'welcome',
      recipient: user.email,
      data: {
        user: {
          name: user.name,
          email: user.email
        },
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`
      },
      scheduledFor: new Date(Date.now() + delay * 1000)
    })
  }

  /**
   * Schedule job alert emails for users with matching preferences
   */
  static async scheduleJobAlerts(jobId: string): Promise<void> {
    const supabase = createServerSupabaseClient()
    
    // Get job with skills
    const { data: job } = await supabase
      .from('jobs')
      .select(`
        *,
        job_skills!inner(
          skill_id,
          skills!inner(id, name)
        )
      `)
      .eq('id', jobId)
      .single()

    if (!job) return

    // Get skill IDs for this job
    const skillIds = job.job_skills?.map(js => js.skill_id) || []

    // Find users with matching skills who have job alerts enabled
    const { data: matchingUsers } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        desired_rate_min,
        desired_rate_max,
        user_skills!inner(skill_id)
      `)
      .eq('job_alerts_enabled', true)
      .in('user_skills.skill_id', skillIds)
      .or(`desired_rate_min.is.null,and(desired_rate_min.lte.${job.hourly_rate_max},desired_rate_max.gte.${job.hourly_rate_min})`)

    // Schedule alerts for each matching user
    if (matchingUsers) {
      for (const user of matchingUsers) {
        const matches = [{
          title: job.title,
          company: job.company,
          hourlyRate: `$${job.hourly_rate_min}-$${job.hourly_rate_max}/hr`,
          matchScore: 85 // Mock score - in real implementation, calculate from matching engine
        }]

      await this.scheduleEmail({
        type: 'job_alert',
        recipient: user.email,
        data: {
          user: {
            name: user.name,
            email: user.email
          },
          matches,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`
        },
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes delay
        jobId: jobId
      })
      }
    }
  }

  /**
   * Schedule application confirmation email
   */
  static async scheduleApplicationConfirmation(
    userId: string, 
    jobId: string
  ): Promise<void> {
    const [user, job] = await Promise.all([
      db.findUniqueUser(
        { id: userId },
        { email: true, name: true }
      ),
      db.findUniqueJob(
        { id: jobId },
        { select: { title: true, company: true, hourly_rate_min: true, hourly_rate_max: true, location: true, is_remote: true } }
      )
    ])

    if (!user || !job) return

    await this.scheduleEmail({
      type: 'application_confirmation',
      recipient: user.email,
      data: {
        user: {
          name: user.name,
          email: user.email
        },
        job: {
          title: job.title,
          company: job.company,
          hourlyRateMin: job.hourly_rate_min,
          hourlyRateMax: job.hourly_rate_max,
          location: job.location,
          isRemote: job.is_remote
        },
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      },
      scheduledFor: new Date() // Send immediately
    })
  }

  /**
   * Schedule weekly digest emails for employers
   */
  static async scheduleWeeklyDigests(): Promise<void> {
    const employers = await db.findManyUsers({
      role: 'EMPLOYER',
      email_preferences: { weeklyDigest: true }
    }, {
      id: true,
      email: true,
      name: true
    })

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    for (const employer of employers) {
      // Get employer's job statistics for the week
      const [jobs, applications] = await Promise.all([
        db.findManyJobs({
          poster_id: employer.id,
          created_at: { gte: oneWeekAgo }
        }, {
          id: true,
          title: true
        }),
        db.countApplications({
          poster_id: employer.id,
          created_at: { gte: oneWeekAgo }
        })
      ])

      const stats = {
        newApplications: applications,
        profileViews: Math.floor(Math.random() * 50) + 10, // Mock data
        jobViews: Math.floor(Math.random() * 200) + 50, // Mock data
        topPerformingJob: jobs.length > 0 ? jobs[0].title : undefined
      }

      await this.scheduleEmail({
        type: 'employer_weekly_digest',
        recipient: employer.email,
        data: {
          user: {
            name: employer.name,
            email: employer.email
          },
          stats,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(employer.email)}`
        },
        scheduledFor: new Date()
      })
    }
  }

  /**
   * Schedule profile completion reminders
   */
  static async scheduleProfileReminders(): Promise<void> {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    // Find users who registered 2+ days ago but haven't completed their profile
    const incompleteUsers = await db.findManyUsers({
      created_at: { lte: twoDaysAgo },
      // Users with incomplete profiles
      bio: null
    }, {
      id: true,
      email: true,
      name: true
    })

    for (const user of incompleteUsers) {
      await this.scheduleEmail({
        type: 'profile_completion_reminder',
        recipient: user.email,
        data: {
          user: {
            name: user.name,
            email: user.email
          },
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}`
        },
        scheduledFor: new Date()
      })
    }
  }

  /**
   * Schedule job expiring reminders for employers
   */
  static async scheduleJobExpiringReminders(): Promise<void> {
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const expiringJobs = await db.findManyJobs({
      is_active: true,
      application_deadline: {
        lte: threeDaysFromNow,
        gte: new Date() // Not already expired
      }
    }, {
      '*': true,
      'users!jobs_poster_id_fkey': {
        email: true,
        name: true
      }
    })

    for (const job of expiringJobs) {
      await this.scheduleEmail({
        type: 'job_expiring_reminder',
        recipient: job.users.email,
        data: {
          user: {
            name: job.users.name,
            email: job.users.email
          },
          job: {
            title: job.title,
            company: job.company,
            hourlyRateMin: job.hourly_rate_min,
            hourlyRateMax: job.hourly_rate_max,
            location: job.location,
            isRemote: job.is_remote
          },
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(job.users.email)}`
        },
        scheduledFor: new Date()
      })
    }
  }

  /**
   * Process pending email jobs
   */
  static async processEmailQueue(batchSize: number = 50): Promise<void> {
    const supabase = createServerSupabaseClient()
    const { data: pendingJobs } = await supabase
      .from('email_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(batchSize)

    for (const job of pendingJobs) {
      await this.processEmailJob(job.id)
    }
  }

  /**
   * Process individual email job
   */
  private static async processEmailJob(jobId: string): Promise<void> {
    const supabase = createServerSupabaseClient()
    
    const { data: job } = await supabase
      .from('email_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!job) return

    try {
      // Mark as processing
      await supabase
        .from('email_jobs')
        .update({ 
          status: 'processing',
          attempts: job.attempts + 1
        })
        .eq('id', jobId)

      let template
      const data = job.data as EmailTemplateData

      switch (job.type) {
        case 'welcome':
          template = EmailTemplateEngine.generateWelcomeEmail(data)
          break
        case 'job_alert':
          template = EmailTemplateEngine.generateJobAlertEmail(data)
          break
        case 'application_confirmation':
          template = EmailTemplateEngine.generateApplicationConfirmationEmail(data)
          break
        case 'employer_weekly_digest':
          template = EmailTemplateEngine.generateEmployerWeeklyDigest(data as any)
          break
        default:
          throw new Error(`Unknown email type: ${job.type}`)
      }

      // Send email
      await sendEmail({
        to: job.recipient,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      // Mark as sent
      await supabase
        .from('email_jobs')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', jobId)

    } catch (error) {
      console.error(`Error processing email job ${jobId}:`, error)

      // Mark as failed if max attempts reached
      const shouldMarkAsFailed = job.attempts >= 2 // Will be 3 after the increment above

      await supabase
        .from('email_jobs')
        .update({
          status: shouldMarkAsFailed ? 'failed' : 'pending',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', jobId)
    }
  }

  /**
   * Schedule email with proper data validation
   */
  private static async scheduleEmail({
    type,
    recipient,
    data,
    scheduledFor,
    jobId
  }: {
    type: EmailAutomationType
    recipient: string
    data: EmailTemplateData
    scheduledFor: Date
    jobId?: string
  }): Promise<void> {
    try {
      // Find recipient user by email
      const supabase = createServerSupabaseClient()
      
      const { data: recipientUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', recipient)
        .single()

      if (!recipientUser) {
        console.error('Recipient user not found:', recipient)
        return
      }

      await supabase
        .from('email_jobs')
        .insert({
          type: mapToEmailType(type),
          recipient_id: recipientUser.id,
          job_id: jobId,
          data: JSON.parse(JSON.stringify(data)), // Ensure serializable
          scheduled_for: scheduledFor.toISOString(),
          status: EmailJobStatus.PENDING
        })
    } catch (error) {
      console.error('Error scheduling email:', error)
    }
  }

  /**
   * Get email statistics
   */
  static async getEmailStats(dateRange?: { start: Date; end: Date }) {
    const whereClause = dateRange
      ? {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      : {}

    const supabase = createServerSupabaseClient()
    
    const [
      totalEmails,
      sentEmails,
      failedEmails,
      pendingEmails
    ] = await Promise.all([
      supabase.from('email_jobs').select('*', { count: 'exact' }),
      supabase.from('email_jobs').select('*', { count: 'exact' }).eq('status', 'sent'),
      supabase.from('email_jobs').select('*', { count: 'exact' }).eq('status', 'failed'),
      supabase.from('email_jobs').select('*', { count: 'exact' }).eq('status', 'pending')
    ])
    
    const emailsByType = []

    const successRate = totalEmails.count && totalEmails.count > 0 ? (sentEmails.count! / totalEmails.count) * 100 : 0

    return {
      totalEmails: totalEmails.count || 0,
      sentEmails: sentEmails.count || 0,
      failedEmails: failedEmails.count || 0,
      pendingEmails: pendingEmails.count || 0,
      successRate: Math.round(successRate),
      emailsByType
    }
  }
}