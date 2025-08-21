import { AnalyticsEngine } from '../analytics'

// Note: Supabase is mocked globally in jest.setup.js
const mockSupabase = (global as any).__mockSupabase

describe('AnalyticsEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getJobAnalytics', () => {
    it('should return job analytics with correct structure', async () => {
      // Mock Supabase responses
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        single: jest.fn(),
        count: jest.fn()
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)
      
      // Mock count queries for different job metrics
      mockFrom.count
        .mockResolvedValueOnce({ count: 100 }) // totalJobs
        .mockResolvedValueOnce({ count: 75 }) // activeJobs
        .mockResolvedValueOnce({ count: 60 }) // remoteJobs
        .mockResolvedValueOnce({ count: 40 }) // onSiteJobs
        .mockResolvedValueOnce({ count: 450 }) // applications

      // Mock query responses
      mockFrom.select
        .mockReturnValueOnce({
          ...mockFrom,
          then: (callback: any) => callback({
            data: [
              { category: 'Technology', count: 50 },
              { category: 'Design', count: 30 },
              { category: 'Marketing', count: 20 },
            ]
          })
        })
        .mockReturnValueOnce({
          ...mockFrom,
          then: (callback: any) => callback({
            data: [
              { hourly_rate_min: 50, hourly_rate_max: 75 },
              { hourly_rate_min: 80, hourly_rate_max: 120 },
              { hourly_rate_min: 100, hourly_rate_max: 150 },
            ]
          })
        })

      const analytics = await AnalyticsEngine.getJobAnalytics()

      // Test that the function returns the expected structure
      expect(analytics).toHaveProperty('totalJobs')
      expect(analytics).toHaveProperty('activeJobs')
      expect(analytics).toHaveProperty('jobsByCategory')
      expect(analytics).toHaveProperty('jobsByLocation')
      expect(analytics).toHaveProperty('averageHourlyRate')
      expect(analytics).toHaveProperty('applicationMetrics')
      expect(analytics.applicationMetrics).toHaveProperty('totalApplications')
      expect(analytics.applicationMetrics).toHaveProperty('averageApplicationsPerJob')
      expect(analytics.applicationMetrics).toHaveProperty('conversionRate')
      
      // Check that we called the Supabase methods
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
    })

    it('should handle date range filtering', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }

      mockFrom.count.mockResolvedValue({ count: 50 })
      mockFrom.select.mockReturnValue({
        ...mockFrom,
        then: (callback: any) => callback({ data: [] })
      })

      await AnalyticsEngine.getJobAnalytics(dateRange)

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockFrom.select).toHaveBeenCalled()
    })
  })

  describe('getUserAnalytics', () => {
    it('should return user analytics with growth data', async () => {
      // Mock count queries for different user metrics
      mockFrom.count
        .mockResolvedValueOnce({ count: 500 }) // totalUsers
        .mockResolvedValueOnce({ count: 300 }) // contractorCount
        .mockResolvedValueOnce({ count: 200 }) // employerCount
        .mockResolvedValueOnce({ count: 400 }) // usersWithProfiles
        .mockResolvedValue({ count: 5 }) // Daily user counts for growth data

      // Mock skill distribution query
      mockFrom.select.mockReturnValue({
        ...mockFrom,
        then: (callback: any) => callback({
          data: [
            { skill_id: 'skill1', count: 150, skills: { name: 'React' } },
            { skill_id: 'skill2', count: 100, skills: { name: 'Node.js' } },
            { skill_id: 'skill3', count: 75, skills: { name: 'Python' } },
          ]
        })
      })

      const analytics = await AnalyticsEngine.getUserAnalytics()

      expect(analytics).toMatchObject({
        totalUsers: 500,
        contractorCount: 300,
        employerCount: 200,
        profileCompletionRate: expect.any(Number), // 400/500 * 100
        activenessMetrics: expect.objectContaining({
          dailyActiveUsers: expect.any(Number),
          weeklyActiveUsers: expect.any(Number),
          monthlyActiveUsers: expect.any(Number),
        }),
        skillDistribution: expect.arrayContaining([
          { skill: 'React', count: 150 },
          { skill: 'Node.js', count: 100 },
          { skill: 'Python', count: 75 },
        ]),
      })
    })
  })

  describe('getPlatformAnalytics', () => {
    it('should return platform-wide metrics', async () => {
      const analytics = await AnalyticsEngine.getPlatformAnalytics()

      expect(analytics).toMatchObject({
        searchMetrics: expect.objectContaining({
          totalSearches: expect.any(Number),
          topSearchTerms: expect.any(Array),
          filterUsage: expect.any(Array),
        }),
        engagementMetrics: expect.objectContaining({
          averageSessionDuration: expect.any(Number),
          bounceRate: expect.any(Number),
          pagesPerSession: expect.any(Number),
        }),
        conversionMetrics: expect.objectContaining({
          profileToApplicationRate: expect.any(Number),
          jobViewToApplicationRate: expect.any(Number),
          registrationToProfileCompletionRate: expect.any(Number),
        }),
      })
    })
  })

  describe('getExecutiveSummary', () => {
    it('should generate executive summary with KPIs and insights', async () => {
      // Setup mocks for all required calls
      mockFrom.count.mockResolvedValue({ count: 100 })
      mockFrom.select.mockReturnValue({
        ...mockFrom,
        then: (callback: any) => callback({ data: [] })
      })

      const summary = await AnalyticsEngine.getExecutiveSummary()

      expect(summary).toMatchObject({
        kpis: expect.objectContaining({
          totalJobs: expect.any(Number),
          totalUsers: expect.any(Number),
          averageHourlyRate: expect.any(Number),
          totalRevenuePotential: expect.any(Number),
          userEngagementScore: expect.any(Number),
          marketHealthScore: expect.any(Number),
        }),
        trends: expect.objectContaining({
          jobGrowth: expect.any(String),
          userGrowth: expect.any(String),
          applicationGrowth: expect.any(String),
        }),
        insights: expect.arrayContaining([
          expect.any(String),
        ]),
      })
    })
  })

  describe('calculateRateDistribution', () => {
    it('should correctly categorize jobs into rate brackets', async () => {
      const jobs = [
        { hourly_rate_min: 20, hourly_rate_max: 40 }, // $0-50 bracket
        { hourly_rate_min: 60, hourly_rate_max: 70 }, // $50-75 bracket  
        { hourly_rate_min: 80, hourly_rate_max: 90 }, // $75-100 bracket
        { hourly_rate_min: 120, hourly_rate_max: 140 }, // $100-150 bracket
        { hourly_rate_min: 160, hourly_rate_max: 200 }, // $150+ bracket
      ]

      // Mock the database calls needed for getJobAnalytics
      mockFrom.count.mockResolvedValue({ count: jobs.length })
      mockFrom.select.mockReturnValue({
        ...mockFrom,
        then: (callback: any) => callback({ data: jobs })
      })

      const analytics = await AnalyticsEngine.getJobAnalytics()

      expect(analytics.rateDistribution).toEqual([
        { range: '$0-50', count: 1 },
        { range: '$50-75', count: 1 },
        { range: '$75-100', count: 1 },
        { range: '$100-150', count: 1 },
        { range: '$150+', count: 1 },
      ])
    })
  })
})