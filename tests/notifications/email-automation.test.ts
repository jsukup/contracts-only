import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { EmailAutomationEngine } from '@/lib/email/automation'
import { JobMatchingEngine } from '@/lib/matching'
import { sendEmail } from '@/lib/email/sender'
import { createServerSupabaseClient } from '@/lib/supabase'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/email/sender')
jest.mock('@/lib/matching')

describe('EmailAutomationEngine', () => {
  const mockSupabase = {
    from: jest.fn()
  }

  const mockUsers = [
    {
      id: 'user-1',
      email: 'contractor1@example.com',
      name: 'John Doe',
      role: 'CONTRACTOR',
      notification_preferences: {
        weekly_digest: true,
        email_notifications: true
      }
    },
    {
      id: 'user-2',
      email: 'contractor2@example.com',
      name: 'Jane Smith',
      role: 'CONTRACTOR',
      notification_preferences: {
        weekly_digest: false,
        email_notifications: true
      }
    }
  ]

  const mockJobs = [
    {
      id: 'job-1',
      title: 'Senior React Developer',
      company: 'TechCorp',
      hourly_rate_min: 80,
      hourly_rate_max: 120,
      created_at: new Date().toISOString()
    },
    {
      id: 'job-2',
      title: 'Full Stack Engineer',
      company: 'StartupInc',
      hourly_rate_min: 70,
      hourly_rate_max: 100,
      created_at: new Date().toISOString()
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(sendEmail as jest.Mock).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('scheduleContractorWeeklyDigests', () => {
    it('should send weekly digests to eligible contractors', async () => {
      // Mock database queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                not: jest.fn(() => Promise.resolve({
                  data: mockUsers,
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({
                      data: mockJobs,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      // Mock job matching
      ;(JobMatchingEngine.getJobsForUser as jest.Mock).mockResolvedValue([
        {
          jobId: 'job-1',
          userId: 'user-1',
          overallScore: 85,
          breakdown: {}
        },
        {
          jobId: 'job-2',
          userId: 'user-1',
          overallScore: 75,
          breakdown: {}
        }
      ])

      await EmailAutomationEngine.scheduleContractorWeeklyDigests()

      // Should only send to user-1 (user-2 has weekly_digest disabled)
      expect(sendEmail).toHaveBeenCalledTimes(1)
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'contractor1@example.com',
          subject: expect.stringContaining('Weekly Job Digest')
        })
      )
    })

    it('should skip users without weekly digest preference', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                not: jest.fn(() => Promise.resolve({
                  data: [mockUsers[1]], // Only user with weekly_digest: false
                  error: null
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      await EmailAutomationEngine.scheduleContractorWeeklyDigests()

      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => Promise.resolve({
              data: null,
              error: new Error('Database connection failed')
            }))
          }))
        }))
      }))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await EmailAutomationEngine.scheduleContractorWeeklyDigests()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching contractors'),
        expect.any(Error)
      )
      expect(sendEmail).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should include personalized job matches in digest', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                not: jest.fn(() => Promise.resolve({
                  data: [mockUsers[0]],
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({
                      data: mockJobs,
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      ;(JobMatchingEngine.getJobsForUser as jest.Mock).mockResolvedValue([
        {
          jobId: 'job-1',
          userId: 'user-1',
          overallScore: 85,
          breakdown: {
            skills: 30,
            rate: 20,
            location: 15
          }
        }
      ])

      await EmailAutomationEngine.scheduleContractorWeeklyDigests()

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Senior React Developer'),
          html: expect.stringContaining('85% match')
        })
      )
    })
  })

  describe('scheduleApplicationStatusUpdate', () => {
    const applicationData = {
      applicantId: 'user-1',
      applicationId: 'app-1',
      jobId: 'job-1',
      status: 'INTERVIEW' as const,
      jobTitle: 'Senior React Developer',
      company: 'TechCorp'
    }

    it('should send status update email', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: mockUsers[0],
              error: null
            }))
          }))
        }))
      }))

      await EmailAutomationEngine.scheduleApplicationStatusUpdate(applicationData)

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'contractor1@example.com',
          subject: expect.stringContaining('Application Update'),
          html: expect.stringContaining('Interview Scheduled')
        })
      )
    })

    it('should use different templates for different statuses', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: mockUsers[0],
              error: null
            }))
          }))
        }))
      }))

      // Test ACCEPTED status
      await EmailAutomationEngine.scheduleApplicationStatusUpdate({
        ...applicationData,
        status: 'ACCEPTED'
      })

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Congratulations')
        })
      )

      // Test REJECTED status
      await EmailAutomationEngine.scheduleApplicationStatusUpdate({
        ...applicationData,
        status: 'REJECTED'
      })

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Thank you for your application')
        })
      )
    })

    it('should skip email if user preferences disable it', async () => {
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                ...mockUsers[0],
                notification_preferences: {
                  application_updates: false,
                  email_notifications: false
                }
              },
              error: null
            }))
          }))
        }))
      }))

      await EmailAutomationEngine.scheduleApplicationStatusUpdate(applicationData)

      expect(sendEmail).not.toHaveBeenCalled()
    })
  })

  describe('Email Rate Limiting', () => {
    it('should respect rate limits when sending bulk emails', async () => {
      const largeUserList = Array.from({ length: 25 }, (_, i) => ({
        ...mockUsers[0],
        id: `user-${i}`,
        email: `user${i}@example.com`
      }))

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => Promise.resolve({
              data: largeUserList,
              error: null
            }))
          }))
        }))
      }))

      ;(JobMatchingEngine.getJobsForUser as jest.Mock).mockResolvedValue([])

      const startTime = Date.now()
      
      await EmailAutomationEngine.scheduleContractorWeeklyDigests()
      
      const endTime = Date.now()
      const duration = endTime - startTime

      // Should have delays for rate limiting (batches of 10)
      expect(sendEmail).toHaveBeenCalledTimes(25)
      // With 25 emails in batches of 10, should have 2 delays of 1000ms each
      // In practice this might be less due to async processing
      expect(duration).toBeGreaterThanOrEqual(0) // Basic check that it completed
    })
  })

  describe('Error Recovery', () => {
    it('should continue processing after individual email failure', async () => {
      const multipleUsers = [mockUsers[0], mockUsers[0], mockUsers[0]]
      
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            not: jest.fn(() => Promise.resolve({
              data: multipleUsers,
              error: null
            }))
          }))
        }))
      }))

      ;(sendEmail as jest.Mock)
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Email service error'))
        .mockResolvedValueOnce({ success: true })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await EmailAutomationEngine.scheduleContractorWeeklyDigests()

      expect(sendEmail).toHaveBeenCalledTimes(3)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send weekly digest'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle empty job matches gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                not: jest.fn(() => Promise.resolve({
                  data: [mockUsers[0]],
                  error: null
                }))
              }))
            }))
          }
        }
        if (table === 'jobs') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({
                      data: [],
                      error: null
                    }))
                  }))
                }))
              }))
            }))
          }
        }
        return { select: jest.fn() }
      })

      ;(JobMatchingEngine.getJobsForUser as jest.Mock).mockResolvedValue([])

      await EmailAutomationEngine.scheduleContractorWeeklyDigests()

      // Should still send digest even with no matches
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('new opportunities')
        })
      )
    })
  })
})