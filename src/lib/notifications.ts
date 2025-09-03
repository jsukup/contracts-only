import { createServerSupabaseClient } from '@/lib/supabase'
import { EmailAutomationEngine } from '@/lib/email/automation'

export interface NotificationData {
  userId: string
  type: NotificationTypeEnum
  title: string
  message: string
  data?: {
    jobId?: string
    applicationId?: string
    url?: string
    matchScore?: number
    [key: string]: any
  }
  sendEmail?: boolean
}

export enum NotificationTypeEnum {
  JOB_MATCH = 'job_match',
  APPLICATION_UPDATE = 'application',
  WEEKLY_DIGEST = 'digest', 
  MARKETING = 'marketing',
  SYSTEM = 'system'
}

export interface NotificationPreferences {
  job_alerts_enabled: boolean
  application_updates: boolean
  weekly_digest: boolean
  marketing_emails: boolean
}

/**
 * Unified notification creation system
 * Creates both in-app notifications and schedules emails based on user preferences
 */
export class NotificationHelper {
  /**
   * Create a notification with dual delivery (in-app + email)
   */
  static async createNotification({
    userId,
    type,
    title,
    message,
    data,
    sendEmail = true
  }: NotificationData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const supabase = createServerSupabaseClient()

      // 1. Get user preferences to determine if email should be sent
      const shouldSendEmail = sendEmail ? await this.shouldSendEmail(userId, type) : false
      
      // 2. Create in-app notification (always created)
      const notificationResult = await this.createInAppNotification({
        userId,
        type,
        title,
        message,
        data
      })

      if (!notificationResult.success) {
        return notificationResult
      }

      // 3. Schedule email if user has enabled notifications for this type
      if (shouldSendEmail) {
        await this.scheduleEmailNotification({
          userId,
          type,
          title,
          message,
          data
        })
      }

      return {
        success: true,
        notificationId: notificationResult.notificationId
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Create in-app notification
   */
  private static async createInAppNotification({
    userId,
    type,
    title,
    message,
    data
  }: NotificationData): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const supabase = createServerSupabaseClient()

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: type,
          title: title,
          message: message,
          data: data ? JSON.stringify(data) : null,
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating in-app notification:', error)
        return { success: false, error: error.message }
      }

      return {
        success: true,
        notificationId: notification.id
      }
    } catch (error) {
      console.error('Error in createInAppNotification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Schedule email notification based on type
   */
  private static async scheduleEmailNotification({
    userId,
    type,
    title,
    message,
    data
  }: NotificationData): Promise<void> {
    try {
      const supabase = createServerSupabaseClient()
      
      // Get user info for email scheduling
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (!user) {
        console.error('User not found for email notification:', userId)
        return
      }

      // Schedule appropriate email type
      switch (type) {
        case NotificationTypeEnum.JOB_MATCH:
          if (data?.jobId) {
            // Job alert email will be scheduled by job posting flow
            // This is handled in the job creation API
            console.log('Job alert email will be scheduled by job creation flow')
          }
          break

        case NotificationTypeEnum.APPLICATION_UPDATE:
          if (data?.applicationId && data?.jobId) {
            await EmailAutomationEngine.scheduleApplicationStatusUpdate(
              userId,
              data.applicationId,
              data.jobId,
              title,
              message
            )
          }
          break

        case NotificationTypeEnum.SYSTEM:
        case NotificationTypeEnum.MARKETING:
          // Marketing and system emails handled separately
          console.log(`${type} email scheduling not implemented yet`)
          break

        default:
          console.log(`Email scheduling not configured for type: ${type}`)
      }
    } catch (error) {
      console.error('Error scheduling email notification:', error)
      // Don't fail the entire notification creation if email scheduling fails
    }
  }

  /**
   * Check if user wants to receive email notifications for this type
   */
  private static async shouldSendEmail(userId: string, type: NotificationTypeEnum): Promise<boolean> {
    try {
      const supabase = createServerSupabaseClient()
      
      const { data: user } = await supabase
        .from('users')
        .select('contractor_notifications, recruiter_notifications, role')
        .eq('id', userId)
        .single()

      if (!user) return false

      // Check notification preferences based on user role and type
      const contractorPrefs = user.contractor_notifications as NotificationPreferences | null
      const recruiterPrefs = user.recruiter_notifications as any | null

      if (!contractorPrefs && !recruiterPrefs) return false

      switch (type) {
        case NotificationTypeEnum.JOB_MATCH:
          return contractorPrefs?.job_alerts_enabled ?? true

        case NotificationTypeEnum.APPLICATION_UPDATE:
          return contractorPrefs?.application_updates ?? true

        case NotificationTypeEnum.WEEKLY_DIGEST:
          return contractorPrefs?.weekly_digest ?? true

        case NotificationTypeEnum.MARKETING:
          return contractorPrefs?.marketing_emails ?? false

        case NotificationTypeEnum.SYSTEM:
          return true // System notifications are important

        default:
          return false
      }
    } catch (error) {
      console.error('Error checking email preferences:', error)
      return false // Default to no email if can't determine preferences
    }
  }

  /**
   * Batch create notifications for multiple users
   */
  static async createBatchNotifications(notifications: NotificationData[]): Promise<{
    successful: number
    failed: number
    errors: string[]
  }> {
    const results = { successful: 0, failed: 0, errors: [] as string[] }

    for (const notification of notifications) {
      const result = await this.createNotification(notification)
      
      if (result.success) {
        results.successful++
      } else {
        results.failed++
        if (result.error) {
          results.errors.push(result.error)
        }
      }
    }

    return results
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createServerSupabaseClient()

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createServerSupabaseClient()

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  /**
   * Get notification counts for user
   */
  static async getNotificationCounts(userId: string): Promise<{
    total: number
    unread: number
  }> {
    try {
      const supabase = createServerSupabaseClient()

      const [totalResult, unreadResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_read', false)
      ])

      return {
        total: totalResult.count || 0,
        unread: unreadResult.count || 0
      }
    } catch (error) {
      console.error('Error getting notification counts:', error)
      return { total: 0, unread: 0 }
    }
  }
}

// Export convenience functions
export const createNotification = NotificationHelper.createNotification.bind(NotificationHelper)
export const createBatchNotifications = NotificationHelper.createBatchNotifications.bind(NotificationHelper)
export const markNotificationAsRead = NotificationHelper.markAsRead.bind(NotificationHelper)
export const deleteNotification = NotificationHelper.deleteNotification.bind(NotificationHelper)
export const getNotificationCounts = NotificationHelper.getNotificationCounts.bind(NotificationHelper)