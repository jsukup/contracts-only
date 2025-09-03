import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST as cronNotifications, GET as cronHealth } from '@/app/api/cron/notifications/route'
import { POST as weeklyDigest } from '@/app/api/notifications/weekly-digest/route'
import { POST as weeklyReports } from '@/app/api/notifications/weekly-reports/route'
import { POST as marketingCampaign } from '@/app/api/marketing/campaigns/route'
import { POST as unsubscribe } from '@/app/api/unsubscribe/route'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/email/sender')
jest.mock('@/lib/email/automation')
jest.mock('@/lib/email/marketing')

describe('Notification API Integration Tests', () => {
  const mockEnv = {
    CRON_SECRET: 'test-cron-secret',
    ADMIN_SECRET: 'test-admin-secret',
    NEXTAUTH_URL: 'http://localhost:3000'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Set environment variables
    Object.assign(process.env, mockEnv)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('CRON Notifications Endpoint', () => {
    it('should reject unauthorized requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/notifications', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-secret'
        }
      })

      const response = await cronNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should execute notification jobs with valid auth', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.CRON_SECRET}`
        }
      })

      const { EmailAutomationEngine } = await import('@/lib/email/automation')
      ;(EmailAutomationEngine.scheduleContractorWeeklyDigests as jest.Mock).mockResolvedValue(undefined)

      // Mock fetch for weekly reports
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      const response = await cronNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results.weeklyDigests.success).toBe(true)
      expect(data.results.weeklyReports.success).toBe(true)
    })

    it('should handle partial failures with multi-status response', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.CRON_SECRET}`
        }
      })

      const { EmailAutomationEngine } = await import('@/lib/email/automation')
      ;(EmailAutomationEngine.scheduleContractorWeeklyDigests as jest.Mock).mockRejectedValue(
        new Error('Email service down')
      )

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })

      const response = await cronNotifications(request)
      const data = await response.json()

      expect(response.status).toBe(207) // Multi-status
      expect(data.success).toBe(false)
      expect(data.results.weeklyDigests.success).toBe(false)
      expect(data.results.weeklyDigests.error).toContain('Email service down')
    })

    it('should provide health check on GET request', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/notifications?health=true', {
        method: 'GET'
      })

      const response = await cronHealth(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBeDefined()
      expect(data.checks).toBeDefined()
      expect(data.cron.schedule).toBe('0 9 * * 1')
    })
  })

  describe('Weekly Digest Endpoint', () => {
    it('should trigger contractor weekly digests', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/weekly-digest', {
        method: 'POST'
      })

      const { EmailAutomationEngine } = await import('@/lib/email/automation')
      ;(EmailAutomationEngine.scheduleContractorWeeklyDigests as jest.Mock).mockResolvedValue(undefined)

      const response = await weeklyDigest(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(EmailAutomationEngine.scheduleContractorWeeklyDigests).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications/weekly-digest', {
        method: 'POST'
      })

      const { EmailAutomationEngine } = await import('@/lib/email/automation')
      ;(EmailAutomationEngine.scheduleContractorWeeklyDigests as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const response = await weeklyDigest(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to generate')
    })
  })

  describe('Marketing Campaign Endpoint', () => {
    it('should reject unauthorized requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-secret',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Campaign',
          subject: 'Test Subject',
          templateType: 'newsletter',
          targetAudience: 'all'
        })
      })

      const response = await marketingCampaign(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should create and execute campaign with valid auth', async () => {
      const campaignData = {
        name: 'Weekly Newsletter',
        subject: 'ContractsOnly Weekly',
        templateType: 'newsletter',
        targetAudience: 'all',
        data: {
          highlights: ['New features released'],
          jobCount: 50
        },
        executeNow: true
      }

      const request = new NextRequest('http://localhost:3000/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.ADMIN_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData)
      })

      const { MarketingEmailEngine } = await import('@/lib/email/marketing')
      ;(MarketingEmailEngine.sendMarketingCampaign as jest.Mock).mockResolvedValue({
        success: true,
        sent: 10,
        skipped: 2,
        failed: 0,
        errors: []
      })

      const response = await marketingCampaign(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.results.sent).toBe(10)
      expect(MarketingEmailEngine.sendMarketingCampaign).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.ADMIN_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Campaign'
          // Missing required fields
        })
      })

      const response = await marketingCampaign(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should validate template type', async () => {
      const request = new NextRequest('http://localhost:3000/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.ADMIN_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Campaign',
          subject: 'Test',
          templateType: 'invalid-type',
          targetAudience: 'all'
        })
      })

      const response = await marketingCampaign(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid template type')
    })
  })

  describe('Unsubscribe Endpoint', () => {
    it('should update user preferences with valid token', async () => {
      const userId = 'user-123'
      const token = Buffer.from(`${userId}:${Date.now()}`).toString('base64')
      
      const request = new NextRequest('http://localhost:3000/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          preferences: {
            newsletter: false,
            marketing: false,
            jobAlerts: true,
            applicationUpdates: true
          }
        })
      })

      const { createServerSupabaseClient } = await import('@/lib/supabase')
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: {
                  id: userId,
                  email: 'user@example.com',
                  marketing_preferences: {}
                },
                error: null
              }))
            }))
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: null,
              error: null
            }))
          }))
        }))
      }
      ;(createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)

      const response = await unsubscribe(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should reject expired tokens', async () => {
      const userId = 'user-123'
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const token = Buffer.from(`${userId}:${oldTimestamp}`).toString('base64')
      
      const request = new NextRequest('http://localhost:3000/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          preferences: {}
        })
      })

      const response = await unsubscribe(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('expired')
    })

    it('should handle invalid token format', async () => {
      const request = new NextRequest('http://localhost:3000/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: 'invalid-token',
          preferences: {}
        })
      })

      const response = await unsubscribe(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid')
    })
  })

  describe('Rate Limiting and Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/notifications/weekly-digest', {
          method: 'POST'
        })
      )

      const { EmailAutomationEngine } = await import('@/lib/email/automation')
      ;(EmailAutomationEngine.scheduleContractorWeeklyDigests as jest.Mock).mockResolvedValue(undefined)

      const startTime = Date.now()
      
      const responses = await Promise.all(
        requests.map(req => weeklyDigest(req))
      )
      
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(responses).toHaveLength(10)
      expect(responses.every(r => r.status === 200)).toBe(true)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Error Recovery', () => {
    it('should provide meaningful error messages', async () => {
      const request = new NextRequest('http://localhost:3000/api/marketing/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.ADMIN_SECRET}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid-json'
      })

      const response = await marketingCampaign(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
      expect(data.message).toBeDefined()
    })

    it('should log errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const request = new NextRequest('http://localhost:3000/api/cron/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockEnv.CRON_SECRET}`
        }
      })

      const { EmailAutomationEngine } = await import('@/lib/email/automation')
      ;(EmailAutomationEngine.scheduleContractorWeeklyDigests as jest.Mock).mockRejectedValue(
        new Error('Critical failure')
      )

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      await cronNotifications(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})