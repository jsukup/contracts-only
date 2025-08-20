import { AnalyticsEngine } from '../analytics'

// Mock the prisma import
jest.mock('../prisma', () => ({
  prisma: (global as any).__mockPrisma
}))

const mockPrisma = (global as any).__mockPrisma

describe('AnalyticsEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getJobAnalytics', () => {
    it('should return job analytics with correct structure', async () => {
      // Mock database responses
      mockPrisma.job.count
        .mockResolvedValueOnce(100) // totalJobs
        .mockResolvedValueOnce(75) // activeJobs
        .mockResolvedValueOnce(60) // remoteJobs
        .mockResolvedValueOnce(40) // onSiteJobs

      mockPrisma.job.groupBy.mockResolvedValueOnce([
        { category: 'Technology', _count: { id: 50 } },
        { category: 'Design', _count: { id: 30 } },
        { category: 'Marketing', _count: { id: 20 } },
      ])

      mockPrisma.job.aggregate.mockResolvedValueOnce({
        _avg: { hourlyRateMin: 80, hourlyRateMax: 120 }
      })

      mockPrisma.job.findMany.mockResolvedValueOnce([
        { hourlyRateMin: 50, hourlyRateMax: 75 },
        { hourlyRateMin: 80, hourlyRateMax: 120 },
        { hourlyRateMin: 100, hourlyRateMax: 150 },
      ])

      mockPrisma.application.count.mockResolvedValueOnce(450)

      const analytics = await AnalyticsEngine.getJobAnalytics()

      expect(analytics).toMatchObject({
        totalJobs: 100,
        activeJobs: 75,
        jobsByCategory: expect.arrayContaining([
          { category: 'Technology', count: 50 },
          { category: 'Design', count: 30 },
          { category: 'Marketing', count: 20 },
        ]),
        jobsByLocation: expect.arrayContaining([
          { location: 'Remote', count: 60 },
          { location: 'On-site', count: 40 },
        ]),
        averageHourlyRate: 100,
        applicationMetrics: expect.objectContaining({
          totalApplications: 450,
          averageApplicationsPerJob: 5,
          conversionRate: 0.15,
        }),
      })
    })

    it('should handle date range filtering', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }

      mockPrisma.job.count.mockResolvedValue(50)
      mockPrisma.job.groupBy.mockResolvedValue([])
      mockPrisma.job.aggregate.mockResolvedValue({ _avg: { hourlyRateMin: 80, hourlyRateMax: 120 } })
      mockPrisma.job.findMany.mockResolvedValue([])
      mockPrisma.application.count.mockResolvedValue(200)

      await AnalyticsEngine.getJobAnalytics(dateRange)

      expect(mockPrisma.job.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      })
    })
  })

  describe('getUserAnalytics', () => {
    it('should return user analytics with growth data', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(500) // totalUsers (line 237)
        .mockResolvedValueOnce(300) // contractorCount (line 238-243)
        .mockResolvedValueOnce(200) // employerCount (line 244-249)
        .mockResolvedValueOnce(400) // usersWithProfiles (line 259-265)
        .mockResolvedValue(5) // Daily user counts for growth data

      mockPrisma.userSkill.groupBy.mockResolvedValueOnce([
        { skillId: 'skill1', _count: { skillId: 150 } },
        { skillId: 'skill2', _count: { skillId: 100 } },
        { skillId: 'skill3', _count: { skillId: 75 } },
      ])

      mockPrisma.skill.findMany.mockResolvedValueOnce([
        { id: 'skill1', name: 'React' },
        { id: 'skill2', name: 'Node.js' },
        { id: 'skill3', name: 'Python' },
      ])

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
      mockPrisma.job.count.mockResolvedValue(100)
      mockPrisma.job.groupBy.mockResolvedValue([])
      mockPrisma.job.aggregate.mockResolvedValue({ _avg: { hourlyRateMin: 80, hourlyRateMax: 120 } })
      mockPrisma.job.findMany.mockResolvedValue([])
      mockPrisma.application.count.mockResolvedValue(450)
      mockPrisma.user.count.mockResolvedValue(500)
      mockPrisma.userSkill.groupBy.mockResolvedValue([])
      mockPrisma.skill.findMany.mockResolvedValue([])

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
        { hourlyRateMin: 20, hourlyRateMax: 40 }, // $0-50 bracket
        { hourlyRateMin: 60, hourlyRateMax: 70 }, // $50-75 bracket  
        { hourlyRateMin: 80, hourlyRateMax: 90 }, // $75-100 bracket
        { hourlyRateMin: 120, hourlyRateMax: 140 }, // $100-150 bracket
        { hourlyRateMin: 160, hourlyRateMax: 200 }, // $150+ bracket
      ]

      // Mock the database calls needed for getJobAnalytics
      mockPrisma.job.count.mockResolvedValue(jobs.length)
      mockPrisma.job.groupBy.mockResolvedValue([])
      mockPrisma.job.aggregate.mockResolvedValue({ _avg: { hourlyRateMin: 80, hourlyRateMax: 120 } })
      mockPrisma.job.findMany.mockResolvedValueOnce(jobs)
      mockPrisma.application.count.mockResolvedValue(100)

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