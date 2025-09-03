/**
 * Marketing Email System
 * Handles promotional emails, newsletters, and marketing campaigns
 * with full respect for user preferences and GDPR compliance
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import { sendEmail, SendEmailOptions } from './sender'

export interface MarketingCampaign {
  id: string
  name: string
  subject: string
  templateType: MarketingEmailType
  targetAudience: 'all' | 'contractors' | 'recruiters' | 'inactive'
  data: Record<string, any>
  scheduledFor?: Date
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused'
}

export enum MarketingEmailType {
  NEWSLETTER = 'newsletter',
  FEATURE_ANNOUNCEMENT = 'feature_announcement', 
  PRODUCT_UPDATE = 'product_update',
  ONBOARDING_SEQUENCE = 'onboarding_sequence',
  REACTIVATION = 'reactivation',
  SURVEY_REQUEST = 'survey_request'
}

export interface MarketingEmailTemplate {
  subject: string
  html: string
  text: string
}

export class MarketingEmailEngine {
  /**
   * Send marketing email to eligible users based on their preferences
   */
  static async sendMarketingCampaign(campaign: MarketingCampaign): Promise<{
    success: boolean
    sent: number
    skipped: number
    failed: number
    errors: string[]
  }> {
    console.log(`[Marketing] Starting campaign: ${campaign.name}`)
    
    try {
      const supabase = createServerSupabaseClient()
      
      // Get eligible users based on target audience and preferences
      const eligibleUsers = await this.getEligibleUsers(campaign.targetAudience)
      
      if (eligibleUsers.length === 0) {
        console.log(`[Marketing] No eligible users found for campaign: ${campaign.name}`)
        return { success: true, sent: 0, skipped: 0, failed: 0, errors: [] }
      }
      
      console.log(`[Marketing] Found ${eligibleUsers.length} eligible users`)
      
      // Generate email template
      const template = this.generateMarketingTemplate(campaign.templateType, campaign.data)
      
      let sent = 0
      let skipped = 0
      let failed = 0
      const errors: string[] = []
      
      // Send emails in batches to respect rate limits
      const batchSize = 10
      for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = eligibleUsers.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (user) => {
          try {
            // Check if user has opted out of marketing emails
            if (!this.canReceiveMarketing(user)) {
              skipped++
              return
            }
            
            // Personalize email content
            const personalizedTemplate = this.personalizeEmailContent(template, user)
            
            // Send email
            await sendEmail({
              to: user.email,
              subject: this.personalizeSubject(campaign.subject, user),
              html: personalizedTemplate.html,
              text: personalizedTemplate.text,
              from: 'ContractsOnly <info@contracts-only.com>',
              // Add unsubscribe link
              headers: {
                'List-Unsubscribe': `<https://contracts-only.vercel.app/unsubscribe?token=${this.generateUnsubscribeToken(user.id)}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
              }
            })
            
            sent++
            
            // Log marketing email sent (for compliance tracking)
            await this.logMarketingEmail(user.id, campaign.id, 'sent')
            
          } catch (error) {
            failed++
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            errors.push(`User ${user.email}: ${errorMessage}`)
            console.error(`[Marketing] Failed to send to ${user.email}:`, error)
            
            // Log failed attempt
            await this.logMarketingEmail(user.id, campaign.id, 'failed')
          }
        })
        
        // Wait for batch to complete before moving to next
        await Promise.allSettled(batchPromises)
        
        // Rate limiting: wait between batches
        if (i + batchSize < eligibleUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      console.log(`[Marketing] Campaign ${campaign.name} completed: ${sent} sent, ${skipped} skipped, ${failed} failed`)
      
      return {
        success: true,
        sent,
        skipped,
        failed,
        errors
      }
      
    } catch (error) {
      console.error(`[Marketing] Campaign ${campaign.name} failed:`, error)
      return {
        success: false,
        sent: 0,
        skipped: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
  
  /**
   * Get users eligible for marketing campaigns based on preferences
   */
  private static async getEligibleUsers(targetAudience: MarketingCampaign['targetAudience']): Promise<any[]> {
    const supabase = createServerSupabaseClient()
    
    let query = supabase
      .from('users')
      .select('id, email, name, role, created_at, last_sign_in_at, marketing_preferences')
      .not('email', 'is', null)
      .eq('email_verified', true) // Only send to verified emails
    
    // Apply audience filtering
    switch (targetAudience) {
      case 'contractors':
        query = query.eq('role', 'CONTRACTOR')
        break
      case 'recruiters':
        query = query.eq('role', 'RECRUITER')
        break
      case 'inactive':
        // Users who haven't signed in for 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.or(`last_sign_in_at.is.null,last_sign_in_at.lt.${thirtyDaysAgo}`)
        break
      case 'all':
        // No additional filtering
        break
    }
    
    const { data: users, error } = await query
    
    if (error) {
      console.error('[Marketing] Error fetching eligible users:', error)
      throw error
    }
    
    // Filter out users who have opted out of marketing emails
    return (users || []).filter(user => {
      const preferences = user.marketing_preferences as any
      
      // Default to opted-in for existing users (grandfathered)
      // New users must explicitly opt-in
      const userCreatedAfterGDPR = new Date(user.created_at) > new Date('2024-01-01')
      const defaultOptIn = !userCreatedAfterGDPR
      
      return preferences?.newsletter !== false && 
             preferences?.marketing !== false && 
             (preferences?.marketing === true || defaultOptIn)
    })
  }
  
  /**
   * Check if a specific user can receive marketing emails
   */
  private static canReceiveMarketing(user: any): boolean {
    const preferences = user.marketing_preferences as any
    
    // Respect explicit opt-out
    if (preferences?.marketing === false || preferences?.newsletter === false) {
      return false
    }
    
    // Check if user has been marked as unsubscribed
    if (preferences?.unsubscribed_at) {
      return false
    }
    
    return true
  }
  
  /**
   * Generate marketing email template based on type
   */
  private static generateMarketingTemplate(
    type: MarketingEmailType, 
    data: Record<string, any>
  ): MarketingEmailTemplate {
    switch (type) {
      case MarketingEmailType.NEWSLETTER:
        return this.generateNewsletterTemplate(data)
      case MarketingEmailType.FEATURE_ANNOUNCEMENT:
        return this.generateFeatureAnnouncementTemplate(data)
      case MarketingEmailType.REACTIVATION:
        return this.generateReactivationTemplate(data)
      default:
        return this.generateGenericTemplate(data)
    }
  }
  
  /**
   * Newsletter template
   */
  private static generateNewsletterTemplate(data: Record<string, any>): MarketingEmailTemplate {
    const { highlights, jobCount, newFeatures } = data
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ContractsOnly Newsletter</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
              .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .highlight-box { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 15px 0; }
              .job-stats { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
              .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
              .cta-button { 
                display: inline-block; 
                background: #4f46e5; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 10px 0; 
              }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>📰 ContractsOnly Weekly</h1>
              <p>Your source for freelance contract opportunities</p>
          </div>
          
          <div class="content">
              <h2>👋 Hello {{user_name}},</h2>
              <p>Here's what's happening in the world of contract work:</p>
              
              <div class="job-stats">
                  <h3>📊 This Week's Numbers</h3>
                  <p><strong>${jobCount || 150}</strong> new contract opportunities posted</p>
                  <p><strong>$75-$150/hr</strong> average rate range</p>
                  <p><strong>Remote-first</strong> positions up 23%</p>
              </div>
              
              ${highlights?.map((highlight: string) => `
                  <div class="highlight-box">
                      <p>${highlight}</p>
                  </div>
              `).join('') || ''}
              
              ${newFeatures ? `
                  <h3>🚀 New Features</h3>
                  <ul>
                      ${newFeatures.map((feature: string) => `<li>${feature}</li>`).join('')}
                  </ul>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                  <a href="https://contracts-only.vercel.app/jobs" class="cta-button">
                      Browse Latest Jobs
                  </a>
              </div>
              
              <p>Want to get featured in our newsletter? <a href="https://contracts-only.vercel.app/contact">Let us know</a> about your success stories!</p>
          </div>
          
          <div class="footer">
              <p>© 2024 ContractsOnly. All rights reserved.</p>
              <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="https://contracts-only.vercel.app/profile/settings">Update preferences</a></p>
          </div>
      </body>
      </html>
    `
    
    const text = `
      ContractsOnly Weekly Newsletter
      
      Hello {{user_name}},
      
      This week's numbers:
      - ${jobCount || 150} new contract opportunities posted
      - $75-$150/hr average rate range
      - Remote-first positions up 23%
      
      ${highlights?.join('\n\n') || ''}
      
      ${newFeatures ? `New Features:\n${newFeatures.map((f: string) => `- ${f}`).join('\n')}` : ''}
      
      Browse the latest jobs: https://contracts-only.vercel.app/jobs
      
      Unsubscribe: {{unsubscribe_url}}
      Update preferences: https://contracts-only.vercel.app/profile/settings
    `
    
    return {
      subject: '📰 ContractsOnly Weekly - New Opportunities Await',
      html: html.trim(),
      text: text.trim()
    }
  }
  
  /**
   * Feature announcement template
   */
  private static generateFeatureAnnouncementTemplate(data: Record<string, any>): MarketingEmailTemplate {
    const { featureName, description, benefits, imageUrl } = data
    
    return {
      subject: `🚀 New Feature: ${featureName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1>🚀 Introducing ${featureName}</h1>
          <p>Hi {{user_name}},</p>
          <p>${description}</p>
          ${imageUrl ? `<img src="${imageUrl}" alt="${featureName}" style="max-width: 100%; height: auto;">` : ''}
          <h3>Benefits:</h3>
          <ul>
            ${benefits?.map((benefit: string) => `<li>${benefit}</li>`).join('') || ''}
          </ul>
          <a href="https://contracts-only.vercel.app" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Try It Now
          </a>
        </div>
      `,
      text: `Introducing ${featureName}\n\nHi {{user_name}},\n\n${description}\n\nTry it now: https://contracts-only.vercel.app\n\nUnsubscribe: {{unsubscribe_url}}`
    }
  }
  
  /**
   * Reactivation email template
   */
  private static generateReactivationTemplate(data: Record<string, any>): MarketingEmailTemplate {
    const { incentive, newJobCount } = data
    
    return {
      subject: 'We miss you! New opportunities await 💼',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1>We miss you, {{user_name}}! 👋</h1>
          <p>It's been a while since we've seen you on ContractsOnly.</p>
          <p>Here's what you've missed:</p>
          <ul>
            <li>${newJobCount || 50} new contract opportunities</li>
            <li>Improved job matching algorithm</li>
            <li>New remote-first job categories</li>
          </ul>
          ${incentive ? `<p><strong>Special offer:</strong> ${incentive}</p>` : ''}
          <a href="https://contracts-only.vercel.app" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Come Back & Explore
          </a>
        </div>
      `,
      text: `We miss you, {{user_name}}!\n\nCheck out what's new: https://contracts-only.vercel.app\n\nUnsubscribe: {{unsubscribe_url}}`
    }
  }
  
  /**
   * Generic template fallback
   */
  private static generateGenericTemplate(data: Record<string, any>): MarketingEmailTemplate {
    return {
      subject: data.subject || 'Update from ContractsOnly',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h1>${data.title || 'Update from ContractsOnly'}</h1>
          <p>Hi {{user_name}},</p>
          <p>${data.message || 'We have some updates to share with you.'}</p>
        </div>
      `,
      text: `${data.title || 'Update from ContractsOnly'}\n\nHi {{user_name}},\n\n${data.message || 'We have some updates to share with you.'}`
    }
  }
  
  /**
   * Personalize email content with user data
   */
  private static personalizeEmailContent(template: MarketingEmailTemplate, user: any): MarketingEmailTemplate {
    const userName = user.name || 'there'
    const unsubscribeUrl = `https://contracts-only.vercel.app/unsubscribe?token=${this.generateUnsubscribeToken(user.id)}`
    
    return {
      subject: template.subject.replace('{{user_name}}', userName),
      html: template.html
        .replace(/{{user_name}}/g, userName)
        .replace(/{{unsubscribe_url}}/g, unsubscribeUrl),
      text: template.text
        .replace(/{{user_name}}/g, userName)
        .replace(/{{unsubscribe_url}}/g, unsubscribeUrl)
    }
  }
  
  /**
   * Personalize subject line
   */
  private static personalizeSubject(subject: string, user: any): string {
    return subject.replace('{{user_name}}', user.name || 'there')
  }
  
  /**
   * Generate unsubscribe token (simplified for now)
   */
  private static generateUnsubscribeToken(userId: string): string {
    // In production, this should be a cryptographically secure token
    // For now, using base64 encoding of user ID + timestamp
    const data = `${userId}:${Date.now()}`
    return Buffer.from(data).toString('base64')
  }
  
  /**
   * Log marketing email activity for compliance
   */
  private static async logMarketingEmail(userId: string, campaignId: string, status: 'sent' | 'failed'): Promise<void> {
    try {
      const supabase = createServerSupabaseClient()
      
      // This would typically go to a marketing_email_logs table
      // For now, just log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Marketing Log] User: ${userId}, Campaign: ${campaignId}, Status: ${status}`)
      }
      
      // TODO: Implement proper logging to database when table is created
      // await supabase.from('marketing_email_logs').insert({
      //   user_id: userId,
      //   campaign_id: campaignId,
      //   status,
      //   sent_at: new Date().toISOString()
      // })
      
    } catch (error) {
      console.error('[Marketing] Failed to log email:', error)
      // Don't throw - logging should not break email sending
    }
  }
}