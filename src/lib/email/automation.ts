import { prisma } from '@/lib/prisma'
import { EmailTemplateEngine, EmailTemplateData } from './templates'
import { sendEmail } from './sender'
import { JobMatchingEngine } from '@/lib/matching'

export interface EmailJob {
  id: string
  type: string
  recipient: string
  data: any
  scheduledFor: Date
  attempts: number
  status: 'pending' | 'processing' | 'sent' | 'failed'
  createdAt: Date
  sentAt?: Date
  error?: string
}

export type EmailAutomationType = 
  | 'welcome'
  | 'job_alert' 
  | 'application_confirmation'
  | 'employer_weekly_digest'
  | 'profile_completion_reminder'
  | 'job_expiring_reminder'
  | 'match_notification'

export class EmailAutomationEngine {
  /**
   * Schedule welcome email for new user
   */
  static async scheduleWelcomeEmail(userId: string, delay: number = 0): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

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
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        jobSkills: {
          include: { skill: true }
        }
      }
    })

    if (!job) return

    // Find users with matching skills who have job alerts enabled
    const matchingUsers = await prisma.user.findMany({
      where: {
        jobAlertsEnabled: true,
        userSkills: {
          some: {
            skillId: {
              in: job.jobSkills.map(js => js.skillId)
            }
          }
        },
        // Only send to users whose rate preferences match
        OR: [
          { desiredRateMin: null }, // No rate preference set
          {
            AND: [
              { desiredRateMin: { lte: job.hourlyRateMax } },
              { desiredRateMax: { gte: job.hourlyRateMin } }
            ]
          }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        desiredRateMin: true,
        desiredRateMax: true
      }
    })

    // Schedule alerts for each matching user
    for (const user of matchingUsers) {
      const matches = [{
        title: job.title,
        company: job.company,
        hourlyRate: `$${job.hourlyRateMin}-$${job.hourlyRateMax}/hr`,
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
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes delay
      })
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
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      }),
      prisma.job.findUnique({
        where: { id: jobId },
        select: {
          title: true,
          company: true,
          hourlyRateMin: true,
          hourlyRateMax: true,
          location: true,
          isRemote: true
        }
      })
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
          hourlyRateMin: job.hourlyRateMin,
          hourlyRateMax: job.hourlyRateMax,
          location: job.location,
          isRemote: job.isRemote
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
    const employers = await prisma.user.findMany({
      where: {
        role: 'EMPLOYER',
        emailPreferences: {
          path: ['weeklyDigest'],
          equals: true
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    for (const employer of employers) {
      // Get employer's job statistics for the week
      const [jobs, applications] = await Promise.all([
        prisma.job.findMany({
          where: {
            postedById: employer.id,
            createdAt: { gte: oneWeekAgo }
          },
          select: { id: true, title: true }
        }),
        prisma.application.count({
          where: {
            job: { postedById: employer.id },
            createdAt: { gte: oneWeekAgo }
          }
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
    const incompleteUsers = await prisma.user.findMany({
      where: {
        createdAt: { lte: twoDaysAgo },
        OR: [
          { bio: null },
          { bio: '' },
          { userSkills: { none: {} } }
        ],
        // Don't spam - only send if they haven't received this reminder in the last week
        NOT: {
          emailJobs: {
            some: {
              type: 'profile_completion_reminder',
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          }
        }
      },
      select: { id: true, email: true, name: true }
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
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile`,
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

    const expiringJobs = await prisma.job.findMany({
      where: {
        status: 'open',
        expiresAt: {
          lte: threeDaysFromNow,
          gte: new Date() // Not already expired
        }
      },
      include: {
        postedBy: {
          select: { email: true, name: true }
        }
      }
    })

    for (const job of expiringJobs) {
      await this.scheduleEmail({
        type: 'job_expiring_reminder',
        recipient: job.postedBy.email,
        data: {
          user: {
            name: job.postedBy.name,
            email: job.postedBy.email
          },
          job: {
            title: job.title,
            company: job.company,
            hourlyRateMin: job.hourlyRateMin,
            hourlyRateMax: job.hourlyRateMax,
            location: job.location,
            isRemote: job.isRemote
          },
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(job.postedBy.email)}`
        },
        scheduledFor: new Date()
      })
    }
  }

  /**
   * Process pending email jobs
   */
  static async processEmailQueue(batchSize: number = 50): Promise<void> {
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: new Date() },
        attempts: { lt: 3 } // Max 3 attempts
      },
      take: batchSize,
      orderBy: { scheduledFor: 'asc' }
    })

    for (const job of pendingJobs) {
      await this.processEmailJob(job.id)
    }
  }

  /**
   * Process individual email job
   */
  private static async processEmailJob(jobId: string): Promise<void> {
    const job = await prisma.emailJob.findUnique({
      where: { id: jobId }
    })

    if (!job) return

    try {
      // Mark as processing
      await prisma.emailJob.update({
        where: { id: jobId },
        data: { 
          status: 'processing',
          attempts: { increment: 1 }
        }
      })

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
      await prisma.emailJob.update({
        where: { id: jobId },
        data: { 
          status: 'sent',
          sentAt: new Date()
        }
      })

    } catch (error) {
      console.error(`Error processing email job ${jobId}:`, error)

      // Mark as failed if max attempts reached
      const shouldMarkAsFailed = job.attempts >= 2 // Will be 3 after the increment above

      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          status: shouldMarkAsFailed ? 'failed' : 'pending',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * Schedule email with proper data validation
   */
  private static async scheduleEmail({
    type,
    recipient,
    data,
    scheduledFor
  }: {
    type: string
    recipient: string
    data: EmailTemplateData
    scheduledFor: Date
  }): Promise<void> {
    try {
      await prisma.emailJob.create({
        data: {
          id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          recipient,
          data: JSON.parse(JSON.stringify(data)), // Ensure serializable
          scheduledFor,
          attempts: 0,
          status: 'pending',
          createdAt: new Date()
        }
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

    const [
      totalEmails,
      sentEmails,
      failedEmails,
      pendingEmails,
      emailsByType
    ] = await Promise.all([
      prisma.emailJob.count({ where: whereClause }),
      prisma.emailJob.count({ where: { ...whereClause, status: 'sent' } }),
      prisma.emailJob.count({ where: { ...whereClause, status: 'failed' } }),
      prisma.emailJob.count({ where: { ...whereClause, status: 'pending' } }),
      prisma.emailJob.groupBy({
        by: ['type'],
        where: whereClause,
        _count: { id: true }
      })
    ])

    const successRate = totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 0

    return {
      totalEmails,
      sentEmails,
      failedEmails,
      pendingEmails,
      successRate: Math.round(successRate),
      emailsByType: emailsByType.map(item => ({
        type: item.type,
        count: item._count.id
      }))
    }
  }
}