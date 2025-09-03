import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NotificationHelper, createNotification, createBatchNotifications, NotificationTypeEnum } from '@/lib/notifications'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/sender'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/email/sender')
jest.mock('@/lib/email/templates')

describe('NotificationHelper', () => {
  const mockSupabase = {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'notification-1', created_at: new Date().toISOString() }, 
            error: null 
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              notification_preferences: {
                job_alerts: true,
                application_updates: true,
                email_notifications: true
              }
            },
            error: null
          }))
        }))
      }))
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('createNotification', () => {
    it('should create in-app notification successfully', async () => {
      const notificationData = {
        userId: 'user-1',
        type: NotificationTypeEnum.JOB_MATCH,
        title: 'New Job Match',
        message: 'A new job matches your skills',
        data: { jobId: 'job-1' },
        sendEmail: false
      }

      const result = await createNotification(notificationData)

      expect(result.success).toBe(true)
      expect(result.notificationId).toBe('notification-1')
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
    })

    it('should send email notification when enabled and user preferences allow', async () => {
      const notificationData = {
        userId: 'user-1',
        type: NotificationTypeEnum.JOB_MATCH,
        title: 'New Job Match',
        message: 'A new job matches your skills',
        data: { jobId: 'job-1' },
        sendEmail: true
      }

      ;(sendEmail as jest.Mock).mockResolvedValue({ success: true })

      const result = await createNotification(notificationData)

      expect(result.success).toBe(true)
      expect(sendEmail).toHaveBeenCalled()
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('New Job Match')
        })
      )
    })

    it('should respect user notification preferences', async () => {
      const notificationData = {
        userId: 'user-1',
        type: NotificationTypeEnum.JOB_MATCH,
        title: 'New Job Match',
        message: 'A new job matches your skills',
        data: { jobId: 'job-1' },
        sendEmail: true
      }

      // Mock user with email notifications disabled
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                notification_preferences: {
                  job_alerts: false,
                  email_notifications: false
                }
              },
              error: null
            }))
          }))
        }))
      }))

      const result = await createNotification(notificationData)

      expect(result.success).toBe(true)
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const notificationData = {
        userId: 'user-1',
        type: NotificationTypeEnum.JOB_MATCH,
        title: 'New Job Match',
        message: 'A new job matches your skills',
        data: { jobId: 'job-1' }
      }

      mockSupabase.from.mockImplementationOnce(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: new Error('Database error') 
            }))
          }))
        }))
      }))

      const result = await createNotification(notificationData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database error')
    })

    it('should continue with in-app notification if email fails', async () => {
      const notificationData = {
        userId: 'user-1',
        type: NotificationTypeEnum.APPLICATION_UPDATE,
        title: 'Application Status Update',
        message: 'Your application status has changed',
        data: { applicationId: 'app-1' },
        sendEmail: true
      }

      ;(sendEmail as jest.Mock).mockRejectedValue(new Error('Email service down'))

      const result = await createNotification(notificationData)

      expect(result.success).toBe(true)
      expect(result.notificationId).toBe('notification-1')
      expect(result.emailSent).toBe(false)
    })
  })

  describe('createBatchNotifications', () => {
    it('should create multiple notifications successfully', async () => {
      const notifications = [
        {
          userId: 'user-1',
          type: NotificationTypeEnum.JOB_MATCH,
          title: 'Job Match 1',
          message: 'First job match',
          data: { jobId: 'job-1' }
        },
        {
          userId: 'user-2',
          type: NotificationTypeEnum.JOB_MATCH,
          title: 'Job Match 2',
          message: 'Second job match',
          data: { jobId: 'job-2' }
        }
      ]

      const result = await createBatchNotifications(notifications)

      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle partial failures in batch', async () => {
      const notifications = [
        {
          userId: 'user-1',
          type: NotificationTypeEnum.JOB_MATCH,
          title: 'Job Match 1',
          message: 'First job match',
          data: { jobId: 'job-1' }
        },
        {
          userId: 'invalid-user',
          type: NotificationTypeEnum.JOB_MATCH,
          title: 'Job Match 2',
          message: 'Second job match',
          data: { jobId: 'job-2' }
        }
      ]

      // Mock failure for second notification
      mockSupabase.from
        .mockImplementationOnce(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ 
                data: { id: 'notification-1', created_at: new Date().toISOString() }, 
                error: null 
              }))
            }))
          }))
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ 
                data: null, 
                error: new Error('User not found') 
              }))
            }))
          }))
        }))

      const result = await createBatchNotifications(notifications)

      expect(result.successful).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('invalid-user')
    })

    it('should respect rate limits when sending batch emails', async () => {
      const notifications = Array.from({ length: 15 }, (_, i) => ({
        userId: `user-${i}`,
        type: NotificationTypeEnum.JOB_MATCH,
        title: `Job Match ${i}`,
        message: `Job match ${i}`,
        data: { jobId: `job-${i}` },
        sendEmail: true
      }))

      jest.useFakeTimers()
      const startTime = Date.now()

      const resultPromise = createBatchNotifications(notifications)
      
      // Fast-forward through rate limiting delays
      jest.advanceTimersByTime(2000)
      
      const result = await resultPromise
      const endTime = Date.now()

      expect(result.successful).toBeGreaterThan(0)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000) // Should have rate limiting delays

      jest.useRealTimers()
    })
  })

  describe('NotificationHelper.getNotificationPreferences', () => {
    it('should retrieve user notification preferences', async () => {
      const preferences = await NotificationHelper.getNotificationPreferences('user-1')

      expect(preferences).toEqual({
        job_alerts: true,
        application_updates: true,
        email_notifications: true
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should return default preferences if user not found', async () => {
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: new Error('User not found')
            }))
          }))
        }))
      }))

      const preferences = await NotificationHelper.getNotificationPreferences('invalid-user')

      expect(preferences).toEqual({
        job_alerts: true,
        application_updates: true,
        email_notifications: true,
        weekly_digest: true
      })
    })
  })

  describe('NotificationHelper.canSendEmail', () => {
    it('should allow email for user with notifications enabled', () => {
      const user = {
        notification_preferences: {
          email_notifications: true,
          job_alerts: true
        }
      }

      expect(NotificationHelper.canSendEmail(user, NotificationTypeEnum.JOB_MATCH)).toBe(true)
    })

    it('should block email for user with notifications disabled', () => {
      const user = {
        notification_preferences: {
          email_notifications: false,
          job_alerts: true
        }
      }

      expect(NotificationHelper.canSendEmail(user, NotificationTypeEnum.JOB_MATCH)).toBe(false)
    })

    it('should block email for specific notification type if disabled', () => {
      const user = {
        notification_preferences: {
          email_notifications: true,
          job_alerts: false
        }
      }

      expect(NotificationHelper.canSendEmail(user, NotificationTypeEnum.JOB_MATCH)).toBe(false)
    })
  })
})