import { Job, User } from '@prisma/client'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailTemplateData {
  user: {
    name: string
    email: string
  }
  job?: {
    title: string
    company: string
    hourlyRateMin: number
    hourlyRateMax: number
    location?: string
    isRemote: boolean
  }
  matches?: Array<{
    title: string
    company: string
    hourlyRate: string
    matchScore: number
  }>
  unsubscribeUrl?: string
  dashboardUrl?: string
  companyName?: string
}

export class EmailTemplateEngine {
  private static readonly BRAND_COLOR = '#3B82F6'
  private static readonly BRAND_NAME = 'ContractsOnly'
  private static readonly SUPPORT_EMAIL = 'support@contractsonly.com'

  /**
   * Generate welcome email for new users
   */
  static generateWelcomeEmail(data: EmailTemplateData): EmailTemplate {
    const { user } = data
    
    return {
      subject: `Welcome to ${this.BRAND_NAME}! Find your next contract opportunity`,
      
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ContractsOnly</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, ${this.BRAND_COLOR} 0%, #1E40AF 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${this.BRAND_NAME}</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">Transparent Contract Opportunities</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1F2937; margin: 0 0 20px; font-size: 24px;">Welcome, ${user.name}! 🎉</h2>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Thank you for joining ContractsOnly, the specialized job board for contract positions with transparent hourly rates.
              </p>

              <p style="margin-bottom: 25px; font-size: 16px;">
                Here's what makes us different:
              </p>

              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                <div style="display: flex; margin-bottom: 15px;">
                  <div style="color: ${this.BRAND_COLOR}; font-size: 20px; margin-right: 10px;">✓</div>
                  <div>
                    <strong>Transparent Rates:</strong> All job postings include clear hourly rate ranges
                  </div>
                </div>
                <div style="display: flex; margin-bottom: 15px;">
                  <div style="color: ${this.BRAND_COLOR}; font-size: 20px; margin-right: 10px;">✓</div>
                  <div>
                    <strong>Direct Applications:</strong> Apply directly to companies through their preferred process
                  </div>
                </div>
                <div style="display: flex;">
                  <div style="color: ${this.BRAND_COLOR}; font-size: 20px; margin-right: 10px;">✓</div>
                  <div>
                    <strong>Quality Focus:</strong> Curated contract opportunities from verified companies
                  </div>
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl || '#'}" style="background-color: ${this.BRAND_COLOR}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Complete Your Profile
                </a>
              </div>

              <p style="margin-bottom: 20px; font-size: 14px; color: #6B7280;">
                <strong>Next Steps:</strong>
              </p>
              <ul style="color: #6B7280; font-size: 14px; padding-left: 20px;">
                <li>Add your skills and set your hourly rate preferences</li>
                <li>Browse our current contract opportunities</li>
                <li>Set up job alerts to get notified of new matches</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                Questions? Reply to this email or contact us at <a href="mailto:${this.SUPPORT_EMAIL}" style="color: ${this.BRAND_COLOR};">${this.SUPPORT_EMAIL}</a>
              </p>
              ${data.unsubscribeUrl ? `
                <p style="margin: 10px 0 0; font-size: 12px; color: #9CA3AF;">
                  <a href="${data.unsubscribeUrl}" style="color: #9CA3AF;">Unsubscribe from emails</a>
                </p>
              ` : ''}
            </div>
          </div>
        </body>
        </html>
      `,

      text: `
Welcome to ${this.BRAND_NAME}, ${user.name}!

Thank you for joining our specialized job board for contract positions with transparent hourly rates.

What makes us different:
✓ Transparent Rates: All jobs include clear hourly rate ranges
✓ Direct Applications: Apply directly to companies through their process  
✓ Quality Focus: Curated contract opportunities from verified companies

Next Steps:
1. Complete your profile with skills and rate preferences
2. Browse current contract opportunities  
3. Set up job alerts for new matches

Visit your dashboard: ${data.dashboardUrl || 'https://contractsonly.com/dashboard'}

Questions? Contact us at ${this.SUPPORT_EMAIL}

${data.unsubscribeUrl ? `Unsubscribe: ${data.unsubscribeUrl}` : ''}
      `
    }
  }

  /**
   * Generate job alert email with matching opportunities
   */
  static generateJobAlertEmail(data: EmailTemplateData): EmailTemplate {
    const { user, matches = [] } = data
    const jobCount = matches.length
    
    return {
      subject: `${jobCount} new contract ${jobCount === 1 ? 'opportunity' : 'opportunities'} matching your skills`,
      
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Job Matches</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, ${this.BRAND_COLOR} 0%, #1E40AF 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">New Job Matches</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                ${jobCount} new ${jobCount === 1 ? 'opportunity matches' : 'opportunities match'} your preferences
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin-bottom: 20px; font-size: 16px;">
                Hi ${user.name},
              </p>
              
              <p style="margin-bottom: 25px; font-size: 16px;">
                We found ${jobCount} new contract ${jobCount === 1 ? 'opportunity' : 'opportunities'} that match your skills and rate preferences:
              </p>

              ${matches.map(match => `
                <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #FAFAFA;">
                  <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 10px;">
                    <h3 style="margin: 0; color: #1F2937; font-size: 18px; flex: 1;">${match.title}</h3>
                    <span style="background-color: ${this.getMatchScoreColor(match.matchScore)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px;">
                      ${match.matchScore}% match
                    </span>
                  </div>
                  <p style="margin: 5px 0; color: #6B7280; font-size: 14px;">
                    <strong>${match.company}</strong> • ${match.hourlyRate}
                  </p>
                  <div style="margin-top: 15px;">
                    <a href="${data.dashboardUrl || '#'}" style="background-color: ${this.BRAND_COLOR}; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;">
                      View & Apply
                    </a>
                  </div>
                </div>
              `).join('')}

              <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #EFF6FF; border-radius: 8px;">
                <p style="margin: 0 0 15px; color: #1E40AF; font-size: 16px; font-weight: bold;">
                  🎯 Pro Tip
                </p>
                <p style="margin: 0; font-size: 14px; color: #1E40AF;">
                  Jobs posted in the last 24 hours receive 5x more applications. Apply early for the best chance!
                </p>
              </div>

              <div style="text-align: center; margin-top: 25px;">
                <a href="${data.dashboardUrl || '#'}" style="background-color: ${this.BRAND_COLOR}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                  View All Matches
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6B7280;">
                You're receiving this because you enabled job alerts. Manage your preferences in your dashboard.
              </p>
              ${data.unsubscribeUrl ? `
                <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                  <a href="${data.unsubscribeUrl}" style="color: #9CA3AF;">Unsubscribe from job alerts</a>
                </p>
              ` : ''}
            </div>
          </div>
        </body>
        </html>
      `,

      text: `
New Job Matches - ${jobCount} opportunities

Hi ${user.name},

We found ${jobCount} new contract opportunities matching your preferences:

${matches.map(match => `
• ${match.title} at ${match.company}
  ${match.hourlyRate} | ${match.matchScore}% match
`).join('')}

View and apply: ${data.dashboardUrl || 'https://contractsonly.com/dashboard'}

Pro Tip: Apply early! Jobs get 5x more applications in the first 24 hours.

${data.unsubscribeUrl ? `Unsubscribe from job alerts: ${data.unsubscribeUrl}` : ''}
      `
    }
  }

  /**
   * Generate application confirmation email
   */
  static generateApplicationConfirmationEmail(data: EmailTemplateData): EmailTemplate {
    const { user, job } = data
    
    if (!job) {
      throw new Error('Job data required for application confirmation email')
    }

    return {
      subject: `Application submitted: ${job.title} at ${job.company}`,
      
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application Confirmed</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">✅ Application Submitted</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                Your application has been sent to the employer
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin-bottom: 20px; font-size: 16px;">
                Hi ${user.name},
              </p>
              
              <p style="margin-bottom: 25px; font-size: 16px;">
                Great news! Your application has been successfully submitted for:
              </p>

              <div style="border: 1px solid #D1D5DB; border-radius: 8px; padding: 25px; margin-bottom: 25px; background-color: #F9FAFB;">
                <h3 style="margin: 0 0 10px; color: #1F2937; font-size: 20px;">${job.title}</h3>
                <p style="margin: 5px 0; color: #6B7280; font-size: 16px;">
                  <strong>${job.company}</strong>
                </p>
                <p style="margin: 5px 0; color: #6B7280; font-size: 14px;">
                  💰 $${job.hourlyRateMin}-$${job.hourlyRateMax}/hr
                  ${job.isRemote ? '🌍 Remote' : job.location ? `📍 ${job.location}` : ''}
                </p>
              </div>

              <div style="background-color: #EFF6FF; border-left: 4px solid ${this.BRAND_COLOR}; padding: 20px; margin-bottom: 25px;">
                <h4 style="margin: 0 0 10px; color: #1E40AF; font-size: 16px;">What happens next?</h4>
                <ul style="margin: 0; padding-left: 20px; color: #1E40AF; font-size: 14px;">
                  <li style="margin-bottom: 5px;">The employer will review your application</li>
                  <li style="margin-bottom: 5px;">If interested, they'll contact you directly</li>
                  <li style="margin-bottom: 5px;">All communication happens between you and the employer</li>
                  <li>We'll notify you of any status updates</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${data.dashboardUrl || '#'}" style="background-color: ${this.BRAND_COLOR}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; margin-right: 10px;">
                  View Dashboard
                </a>
                <a href="${data.dashboardUrl || '#'}" style="background-color: white; color: ${this.BRAND_COLOR}; border: 2px solid ${this.BRAND_COLOR}; padding: 10px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Find More Jobs
                </a>
              </div>

              <p style="margin-top: 25px; font-size: 14px; color: #6B7280; text-align: center;">
                Good luck with your application! 🤞
              </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                Questions about your application? Contact <a href="mailto:${this.SUPPORT_EMAIL}" style="color: ${this.BRAND_COLOR};">${this.SUPPORT_EMAIL}</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,

      text: `
Application Submitted Successfully!

Hi ${user.name},

Your application has been successfully submitted for:

${job.title} at ${job.company}
Rate: $${job.hourlyRateMin}-$${job.hourlyRateMax}/hr
Location: ${job.isRemote ? 'Remote' : job.location || 'Not specified'}

What happens next?
• The employer will review your application
• If interested, they'll contact you directly  
• All communication happens between you and the employer
• We'll notify you of any status updates

View your dashboard: ${data.dashboardUrl || 'https://contractsonly.com/dashboard'}

Good luck! 🤞

Questions? Contact us at ${this.SUPPORT_EMAIL}
      `
    }
  }

  /**
   * Generate weekly digest email for employers
   */
  static generateEmployerWeeklyDigest(data: EmailTemplateData & { 
    stats: { 
      newApplications: number
      profileViews: number
      jobViews: number
      topPerformingJob?: string
    } 
  }): EmailTemplate {
    const { user, stats } = data

    return {
      subject: `Your weekly ContractsOnly summary - ${stats.newApplications} new applications`,
      
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Summary</title>
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">📊 Weekly Summary</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                Your ContractsOnly performance this week
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin-bottom: 25px; font-size: 16px;">
                Hi ${user.name},
              </p>
              
              <p style="margin-bottom: 25px; font-size: 16px;">
                Here's how your job postings performed this week:
              </p>

              <!-- Stats Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background-color: #EFF6FF; padding: 20px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: ${this.BRAND_COLOR}; margin-bottom: 5px;">
                    ${stats.newApplications}
                  </div>
                  <div style="font-size: 14px; color: #6B7280;">New Applications</div>
                </div>
                <div style="background-color: #F0FDF4; padding: 20px; border-radius: 8px; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: #10B981; margin-bottom: 5px;">
                    ${stats.jobViews}
                  </div>
                  <div style="font-size: 14px; color: #6B7280;">Job Views</div>
                </div>
              </div>

              ${stats.topPerformingJob ? `
                <div style="background-color: #FFF7ED; border-left: 4px solid #F59E0B; padding: 20px; margin-bottom: 25px;">
                  <h4 style="margin: 0 0 10px; color: #92400E; font-size: 16px;">🏆 Top Performing Job</h4>
                  <p style="margin: 0; color: #92400E; font-size: 14px;">
                    <strong>${stats.topPerformingJob}</strong> received the most applications this week
                  </p>
                </div>
              ` : ''}

              <div style="background-color: #F3F4F6; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                <h4 style="margin: 0 0 15px; color: #1F2937; font-size: 16px;">💡 Tips to improve your results:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #6B7280; font-size: 14px;">
                  <li style="margin-bottom: 8px;">Include specific skills and requirements in job descriptions</li>
                  <li style="margin-bottom: 8px;">Offer competitive rates within market range</li>
                  <li style="margin-bottom: 8px;">Respond quickly to applications (within 24-48 hours)</li>
                  <li>Consider remote work options to expand your candidate pool</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="${data.dashboardUrl || '#'}" style="background-color: ${this.BRAND_COLOR}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                  View Full Dashboard
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #6B7280;">
                Want to change your email frequency? <a href="${data.dashboardUrl || '#'}" style="color: ${this.BRAND_COLOR};">Update preferences</a>
              </p>
              ${data.unsubscribeUrl ? `
                <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                  <a href="${data.unsubscribeUrl}" style="color: #9CA3AF;">Unsubscribe from weekly summaries</a>
                </p>
              ` : ''}
            </div>
          </div>
        </body>
        </html>
      `,

      text: `
Weekly Summary - ContractsOnly

Hi ${user.name},

Here's how your job postings performed this week:

📊 Your Stats:
• ${stats.newApplications} new applications
• ${stats.jobViews} job views
• ${stats.profileViews} profile views

${stats.topPerformingJob ? `🏆 Top performer: ${stats.topPerformingJob}` : ''}

💡 Tips to improve results:
• Include specific skills and requirements
• Offer competitive market rates
• Respond quickly to applications (24-48 hours)
• Consider remote work options

View full dashboard: ${data.dashboardUrl || 'https://contractsonly.com/dashboard'}

${data.unsubscribeUrl ? `Unsubscribe: ${data.unsubscribeUrl}` : ''}
      `
    }
  }

  /**
   * Get color for match score badge
   */
  private static getMatchScoreColor(score: number): string {
    if (score >= 80) return '#10B981' // green
    if (score >= 60) return '#3B82F6' // blue
    return '#6B7280' // gray
  }
}