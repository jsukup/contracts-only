import { createDatabaseClient, db } from './database'
import { createServerSupabaseClient } from './supabase'

export interface JobAnalytics {
  totalJobs: number
  activeJobs: number
  jobsByCategory: Array<{ category: string; count: number }>
  jobsByLocation: Array<{ location: string; count: number }>
  averageHourlyRate: number
  rateDistribution: Array<{ range: string; count: number }>
  applicationMetrics: {
    totalApplications: number
    averageApplicationsPerJob: number
    conversionRate: number
  }
  timeMetrics: {
    averageJobDuration: number
    mostActivePostedDays: Array<{ day: string; count: number }>
  }
}

export interface UserAnalytics {
  totalUsers: number
  contractorCount: number
  employerCount: number
  userGrowth: Array<{ date: string; count: number }>
  profileCompletionRate: number
  activenessMetrics: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
  }
  skillDistribution: Array<{ skill: string; count: number }>
}

export interface PlatformAnalytics {
  searchMetrics: {
    totalSearches: number
    topSearchTerms: Array<{ term: string; count: number }>
    filterUsage: Array<{ filter: string; count: number }>
  }
  engagementMetrics: {
    averageSessionDuration: number
    bounceRate: number
    pagesPerSession: number
  }
  conversionMetrics: {
    profileToApplicationRate: number
    jobViewToApplicationRate: number
    registrationToProfileCompletionRate: number
  }
}

export interface RecruiterAnalytics {
  platformReach: {
    totalActiveContractors: number
    contractorsInTargetSkills: number
    monthlyActiveContractors: number
    averageProfileCompletionRate: number
  }
  applicationVolume: {
    totalMonthlyApplications: number
    averageApplicationsPerJob: number
    applicationGrowthRate: number
    topApplicationSources: Array<{ source: string; count: number }>
  }
  contractorQuality: {
    averageExperienceYears: number
    skillCertificationRate: number
    averageHourlyRate: number
    contractorRatings: Array<{ rating: number; count: number }>
  }
  marketIntelligence: {
    demandBySkill: Array<{ skill: string; demandScore: number; avgRate: number }>
    locationTrends: Array<{ location: string; contractorCount: number; avgRate: number }>
    industryGrowth: Array<{ industry: string; growthRate: number; jobCount: number }>
    seasonalTrends: Array<{ month: string; applicationVolume: number; avgRate: number }>
  }
  conversionMetrics: {
    jobViewToApplicationRate: number
    applicationToHireRate: number
    averageTimeToHire: number
    recruiterSatisfactionScore: number
  }
}

export class AnalyticsEngine {
  /**
   * Generate comprehensive job analytics
   */
  static async getJobAnalytics(
    dateRange?: { start: Date; end: Date }
  ): Promise<JobAnalytics> {
    const supabase = createServerSupabaseClient()
    
    const whereClause = dateRange
      ? {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      : {}

    // Get basic job counts
    const [totalJobs, activeJobs] = await Promise.all([
      db.countJobs(whereClause),
      db.countJobs({
        ...whereClause,
        isActive: true
      })
    ])

    // Jobs by type using direct Supabase query for grouping
    let jobsByTypeQuery = supabase
      .from('jobs')
      .select('job_type, count(*)', { count: 'exact' })

    if (dateRange) {
      jobsByTypeQuery = jobsByTypeQuery
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
    }

    const { data: jobsByTypeData } = await jobsByTypeQuery
    const jobsByCategory = jobsByTypeData?.map(item => ({
      category: item.job_type,
      count: item.count || 0
    })) || []

    // Jobs by location (top remote vs on-site)
    const [remoteJobs, onSiteJobs] = await Promise.all([
      db.countJobs({
        ...whereClause,
        isRemote: true
      }),
      db.countJobs({
        ...whereClause,
        isRemote: false
      })
    ])

    // Calculate average hourly rate using direct query
    let avgQuery = supabase
      .from('jobs')
      .select('hourly_rate_min, hourly_rate_max')

    if (dateRange) {
      avgQuery = avgQuery
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
    }

    const { data: rateData } = await avgQuery
    const avgMin = rateData?.reduce((sum, job) => sum + (job.hourly_rate_min || 0), 0) / (rateData?.length || 1) || 0
    const avgMax = rateData?.reduce((sum, job) => sum + (job.hourly_rate_max || 0), 0) / (rateData?.length || 1) || 0

    const averageHourlyRate = Math.round((avgMin + avgMax) / 2)

    // Rate distribution
    const jobs = rateData?.map(job => ({
      hourlyRateMin: job.hourly_rate_min,
      hourlyRateMax: job.hourly_rate_max
    })) || []

    const rateDistribution = this.calculateRateDistribution(jobs)

    // Application metrics
    const totalApplications = await db.countApplications(
      dateRange
        ? {
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          }
        : {}
    )

    const averageApplicationsPerJob = totalJobs > 0 ? Math.round(totalApplications / totalJobs) : 0
    
    // Mock conversion rate - in real implementation, track actual conversions
    const conversionRate = 0.15 // 15% average

    // Time metrics - mock data for now
    const averageJobDuration = 90 // days
    const mostActivePostedDays = [
      { day: 'Tuesday', count: Math.floor(totalJobs * 0.18) },
      { day: 'Wednesday', count: Math.floor(totalJobs * 0.16) },
      { day: 'Monday', count: Math.floor(totalJobs * 0.15) },
      { day: 'Thursday', count: Math.floor(totalJobs * 0.14) },
      { day: 'Friday', count: Math.floor(totalJobs * 0.12) }
    ]

    return {
      totalJobs,
      activeJobs,
      jobsByCategory: jobsByCategory.map(item => ({
        category: item.jobType,
        count: item._count.id
      })),
      jobsByLocation: [
        { location: 'Remote', count: remoteJobs },
        { location: 'On-site', count: onSiteJobs }
      ],
      averageHourlyRate,
      rateDistribution,
      applicationMetrics: {
        totalApplications,
        averageApplicationsPerJob,
        conversionRate
      },
      timeMetrics: {
        averageJobDuration,
        mostActivePostedDays
      }
    }
  }

  /**
   * Generate user analytics and growth metrics
   */
  static async getUserAnalytics(
    dateRange?: { start: Date; end: Date }
  ): Promise<UserAnalytics> {
    const supabase = createServerSupabaseClient()
    
    const whereClause = dateRange
      ? {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      : {}

    // Basic user counts
    const [totalUsers, contractorCount, employerCount] = await Promise.all([
      db.countUsers(whereClause),
      db.countUsers({
        ...whereClause,
        role: 'USER' // Contractors
      }),
      db.countUsers({
        ...whereClause,
        role: 'RECRUITER' // Updated to match schema
      })
    ])

    // User growth over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const userGrowth = await this.getUserGrowthData(thirtyDaysAgo, new Date())

    // Profile completion rate - users with bio and skills
    let profileQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .not('bio', 'is', null)

    if (dateRange) {
      profileQuery = profileQuery
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
    }

    const { count: usersWithProfiles } = await profileQuery

    const profileCompletionRate = totalUsers > 0 
      ? Math.round(((usersWithProfiles || 0) / totalUsers) * 100) 
      : 0

    // Activity metrics (mock data - in real implementation, track user sessions)
    const activenessMetrics = {
      dailyActiveUsers: Math.floor(totalUsers * 0.15),
      weeklyActiveUsers: Math.floor(totalUsers * 0.35),
      monthlyActiveUsers: Math.floor(totalUsers * 0.65)
    }

    // Skill distribution using JOIN query
    const { data: skillDistributionData } = await supabase
      .from('user_skills')
      .select(`
        skill_id,
        skills!inner(id, name)
      `)
      .limit(10)

    // Group by skill and count
    const skillCounts = skillDistributionData?.reduce((acc, item) => {
      const skillName = item.skills?.name || 'Unknown'
      acc[skillName] = (acc[skillName] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const skillDistribution = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalUsers,
      contractorCount,
      employerCount,
      userGrowth,
      profileCompletionRate,
      activenessMetrics,
      skillDistribution
    }
  }

  /**
   * Generate platform-wide analytics
   */
  static async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    // Mock search metrics - in real implementation, track search queries
    const searchMetrics = {
      totalSearches: 15420,
      topSearchTerms: [
        { term: 'React developer', count: 1240 },
        { term: 'Node.js', count: 980 },
        { term: 'Python', count: 850 },
        { term: 'UI/UX designer', count: 720 },
        { term: 'DevOps', count: 650 }
      ],
      filterUsage: [
        { filter: 'Remote', count: 8500 },
        { filter: 'Rate Range', count: 6200 },
        { filter: 'Contract Duration', count: 4100 },
        { filter: 'Skills', count: 3800 },
        { filter: 'Location', count: 2900 }
      ]
    }

    // Mock engagement metrics - in real implementation, use analytics service
    const engagementMetrics = {
      averageSessionDuration: 420, // seconds (7 minutes)
      bounceRate: 0.32, // 32%
      pagesPerSession: 3.8
    }

    // Mock conversion metrics
    const conversionMetrics = {
      profileToApplicationRate: 0.28, // 28% of profiles result in applications
      jobViewToApplicationRate: 0.12, // 12% of job views result in applications
      registrationToProfileCompletionRate: 0.65 // 65% complete their profile
    }

    return {
      searchMetrics,
      engagementMetrics,
      conversionMetrics
    }
  }

  /**
   * Calculate rate distribution brackets
   */
  private static calculateRateDistribution(
    jobs: Array<{ hourlyRateMin: number; hourlyRateMax: number }>
  ) {
    const brackets = [
      { range: '$0-50', min: 0, max: 50, count: 0 },
      { range: '$50-75', min: 50, max: 75, count: 0 },
      { range: '$75-100', min: 75, max: 100, count: 0 },
      { range: '$100-150', min: 100, max: 150, count: 0 },
      { range: '$150+', min: 150, max: Infinity, count: 0 }
    ]

    jobs.forEach(job => {
      const avgRate = (job.hourlyRateMin + job.hourlyRateMax) / 2
      const bracket = brackets.find(b => avgRate >= b.min && avgRate < b.max)
      if (bracket) {
        bracket.count++
      }
    })

    return brackets.map(b => ({ range: b.range, count: b.count }))
  }

  /**
   * Get user growth data over time period
   */
  private static async getUserGrowthData(startDate: Date, endDate: Date) {
    const supabase = createServerSupabaseClient()
    const days = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)

      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())

      days.push({
        date: dayStart.toISOString().split('T')[0],
        count: count || 0
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  /**
   * Generate recruiter-focused analytics for sales presentations
   */
  static async getRecruiterAnalytics(dateRange?: { start: Date; end: Date }): Promise<RecruiterAnalytics> {
    const [jobAnalytics, userAnalytics] = await Promise.all([
      this.getJobAnalytics(dateRange),
      this.getUserAnalytics(dateRange)
    ])

    // Platform Reach Metrics
    const totalActiveContractors = userAnalytics.contractorCount
    const monthlyActiveContractors = userAnalytics.activenessMetrics.monthlyActiveUsers

    // Get top skills and count contractors with those skills
    const topSkills = userAnalytics.skillDistribution.slice(0, 10)
    const contractorsInTargetSkills = topSkills.reduce((sum, skill) => sum + skill.count, 0)

    const platformReach = {
      totalActiveContractors,
      contractorsInTargetSkills,
      monthlyActiveContractors,
      averageProfileCompletionRate: userAnalytics.profileCompletionRate
    }

    // Application Volume Metrics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const totalMonthlyApplications = jobAnalytics.applicationMetrics.totalApplications
    const applicationGrowthRate = 15 // Mock - calculate from historical data
    
    const applicationVolume = {
      totalMonthlyApplications,
      averageApplicationsPerJob: jobAnalytics.applicationMetrics.averageApplicationsPerJob,
      applicationGrowthRate,
      topApplicationSources: [
        { source: 'Direct Search', count: Math.round(totalMonthlyApplications * 0.45) },
        { source: 'Email Alerts', count: Math.round(totalMonthlyApplications * 0.30) },
        { source: 'Social Media', count: Math.round(totalMonthlyApplications * 0.15) },
        { source: 'Referrals', count: Math.round(totalMonthlyApplications * 0.10) }
      ]
    }

    // Contractor Quality Metrics
    const contractorQuality = {
      averageExperienceYears: 5.2, // Mock - calculate from profile data
      skillCertificationRate: 68, // Mock - percentage with certifications
      averageHourlyRate: jobAnalytics.averageHourlyRate,
      contractorRatings: [
        { rating: 5, count: Math.round(totalActiveContractors * 0.35) },
        { rating: 4, count: Math.round(totalActiveContractors * 0.40) },
        { rating: 3, count: Math.round(totalActiveContractors * 0.20) },
        { rating: 2, count: Math.round(totalActiveContractors * 0.04) },
        { rating: 1, count: Math.round(totalActiveContractors * 0.01) }
      ]
    }

    // Market Intelligence
    const demandBySkill = userAnalytics.skillDistribution.slice(0, 10).map(skill => ({
      skill: skill.skill,
      demandScore: Math.round(skill.count / totalActiveContractors * 100),
      avgRate: jobAnalytics.averageHourlyRate + (Math.random() - 0.5) * 40 // Vary by skill
    }))

    const locationTrends = [
      { location: 'Remote', contractorCount: Math.round(totalActiveContractors * 0.65), avgRate: jobAnalytics.averageHourlyRate },
      { location: 'New York', contractorCount: Math.round(totalActiveContractors * 0.12), avgRate: jobAnalytics.averageHourlyRate + 15 },
      { location: 'San Francisco', contractorCount: Math.round(totalActiveContractors * 0.10), avgRate: jobAnalytics.averageHourlyRate + 25 },
      { location: 'Austin', contractorCount: Math.round(totalActiveContractors * 0.08), avgRate: jobAnalytics.averageHourlyRate + 5 },
      { location: 'Chicago', contractorCount: Math.round(totalActiveContractors * 0.05), avgRate: jobAnalytics.averageHourlyRate - 5 }
    ]

    const seasonalTrends = [
      { month: 'Jan', applicationVolume: totalMonthlyApplications * 0.95, avgRate: jobAnalytics.averageHourlyRate },
      { month: 'Feb', applicationVolume: totalMonthlyApplications * 1.1, avgRate: jobAnalytics.averageHourlyRate + 3 },
      { month: 'Mar', applicationVolume: totalMonthlyApplications * 1.15, avgRate: jobAnalytics.averageHourlyRate + 5 },
      { month: 'Apr', applicationVolume: totalMonthlyApplications * 1.05, avgRate: jobAnalytics.averageHourlyRate + 2 }
    ]

    const marketIntelligence = {
      demandBySkill,
      locationTrends,
      industryGrowth: jobAnalytics.jobsByCategory.map(cat => ({
        industry: cat.category,
        growthRate: 8 + Math.random() * 15, // Mock growth rates
        jobCount: cat.count
      })),
      seasonalTrends
    }

    // Conversion Metrics
    const conversionMetrics = {
      jobViewToApplicationRate: jobAnalytics.applicationMetrics.conversionRate,
      applicationToHireRate: 0.12, // Mock - 12% of applications result in hires
      averageTimeToHire: 14, // Mock - 14 days average
      recruiterSatisfactionScore: 4.2 // Mock - out of 5
    }

    return {
      platformReach,
      applicationVolume,
      contractorQuality,
      marketIntelligence,
      conversionMetrics
    }
  }

  /**
   * Generate executive summary dashboard data
   */
  static async getExecutiveSummary(dateRange?: { start: Date; end: Date }) {
    const [jobAnalytics, userAnalytics, platformAnalytics] = await Promise.all([
      this.getJobAnalytics(dateRange),
      this.getUserAnalytics(dateRange),
      this.getPlatformAnalytics()
    ])

    // Calculate key metrics
    const totalRevenuePotential = jobAnalytics.totalJobs * jobAnalytics.averageHourlyRate * 40 // Assume 40 hours average
    const userEngagementScore = (
      (userAnalytics.profileCompletionRate / 100) * 0.4 +
      (userAnalytics.activenessMetrics.monthlyActiveUsers / userAnalytics.totalUsers) * 0.6
    ) * 100

    const marketHealthScore = Math.round(
      (jobAnalytics.activeJobs / jobAnalytics.totalJobs) * 0.3 * 100 +
      (jobAnalytics.applicationMetrics.averageApplicationsPerJob / 10) * 0.3 * 100 +
      (platformAnalytics.conversionMetrics.jobViewToApplicationRate * 100) * 0.4
    )

    return {
      kpis: {
        totalJobs: jobAnalytics.totalJobs,
        totalUsers: userAnalytics.totalUsers,
        averageHourlyRate: jobAnalytics.averageHourlyRate,
        totalRevenuePotential: Math.round(totalRevenuePotential),
        userEngagementScore: Math.round(userEngagementScore),
        marketHealthScore
      },
      trends: {
        jobGrowth: '+12%', // Mock - calculate from historical data
        userGrowth: userAnalytics.userGrowth.length > 0 ? '+8%' : '0%',
        applicationGrowth: '+15%' // Mock
      },
      insights: [
        `${jobAnalytics.jobsByCategory[0]?.category || 'Technology'} is the most popular job category`,
        `${Math.round(jobAnalytics.jobsByLocation.find(l => l.location === 'Remote')?.count || 0 / jobAnalytics.totalJobs * 100)}% of jobs are remote`,
        `Profile completion rate is ${userAnalytics.profileCompletionRate}% - ${userAnalytics.profileCompletionRate < 70 ? 'needs improvement' : 'good'}`,
        `Average ${jobAnalytics.applicationMetrics.averageApplicationsPerJob} applications per job indicates ${jobAnalytics.applicationMetrics.averageApplicationsPerJob > 5 ? 'healthy' : 'low'} competition`
      ]
    }
  }
}