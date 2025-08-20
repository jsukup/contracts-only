// Job matching algorithm for ContractsOnly platform
// Implements intelligent matching based on skills, rates, preferences, and behavior

interface UserProfile {
  id: string
  skills: Array<{
    id: string
    name: string
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  }>
  hourlyRateMin?: number
  hourlyRateMax?: number
  preferredJobTypes: string[]
  location?: string
  isRemoteOnly: boolean
  availability: 'available' | 'busy' | 'not_looking'
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead'
  preferredContractDuration: string[]
  profileCompleteness: number
}

interface JobPosting {
  id: string
  title: string
  description: string
  skills: Array<{
    id: string
    name: string
    required: boolean
    level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  }>
  hourlyRateMin: number
  hourlyRateMax: number
  location?: string
  isRemote: boolean
  jobType: string
  contractDuration?: string
  experienceRequired: 'entry' | 'mid' | 'senior' | 'lead'
  urgency: 'low' | 'medium' | 'high'
  postedAt: Date
  applicationsCount: number
  viewsCount: number
}

interface MatchScore {
  userId: string
  jobId: string
  overallScore: number
  skillsScore: number
  rateScore: number
  locationScore: number
  preferenceScore: number
  availabilityScore: number
  competitionScore: number
  profileScore: number
  reasonsMatched: string[]
  reasonsNotMatched: string[]
  confidence: 'low' | 'medium' | 'high'
}

export class JobMatchingEngine {
  // Core matching algorithm
  static calculateMatch(user: UserProfile, job: JobPosting): MatchScore {
    const skillsScore = this.calculateSkillsMatch(user, job)
    const rateScore = this.calculateRateMatch(user, job)
    const locationScore = this.calculateLocationMatch(user, job)
    const preferenceScore = this.calculatePreferenceMatch(user, job)
    const availabilityScore = this.calculateAvailabilityScore(user)
    const competitionScore = this.calculateCompetitionScore(job)
    const profileScore = this.calculateProfileCompleteness(user)

    // Weighted algorithm for overall score
    const weights = {
      skills: 0.3,      // 30% - Most important
      rate: 0.2,        // 20% - Compensation match
      location: 0.15,   // 15% - Geography/remote preference
      preference: 0.15, // 15% - Job type and duration preferences
      availability: 0.1, // 10% - Current availability
      competition: 0.05, // 5% - Competition factor
      profile: 0.05     // 5% - Profile completeness bonus
    }

    const overallScore = Math.round(
      (skillsScore * weights.skills +
       rateScore * weights.rate +
       locationScore * weights.location +
       preferenceScore * weights.preference +
       availabilityScore * weights.availability +
       competitionScore * weights.competition +
       profileScore * weights.profile) * 100
    )

    const reasonsMatched: string[] = []
    const reasonsNotMatched: string[] = []

    // Generate match reasons
    if (skillsScore >= 0.8) reasonsMatched.push('Strong skill alignment')
    if (skillsScore < 0.4) reasonsNotMatched.push('Limited skill match')
    
    if (rateScore >= 0.9) reasonsMatched.push('Excellent rate match')
    if (rateScore < 0.3) reasonsNotMatched.push('Rate expectations misaligned')
    
    if (locationScore === 1) reasonsMatched.push('Perfect location match')
    if (locationScore < 0.5) reasonsNotMatched.push('Location preferences not aligned')
    
    if (user.availability === 'not_looking') reasonsNotMatched.push('Not currently looking for work')
    if (user.availability === 'available') reasonsMatched.push('Available immediately')

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high' = 'low'
    if (overallScore >= 80 && skillsScore >= 0.7) confidence = 'high'
    else if (overallScore >= 60 && skillsScore >= 0.5) confidence = 'medium'

    return {
      userId: user.id,
      jobId: job.id,
      overallScore,
      skillsScore: Math.round(skillsScore * 100),
      rateScore: Math.round(rateScore * 100),
      locationScore: Math.round(locationScore * 100),
      preferenceScore: Math.round(preferenceScore * 100),
      availabilityScore: Math.round(availabilityScore * 100),
      competitionScore: Math.round(competitionScore * 100),
      profileScore: Math.round(profileScore * 100),
      reasonsMatched,
      reasonsNotMatched,
      confidence
    }
  }

  // Skills matching with level considerations
  private static calculateSkillsMatch(user: UserProfile, job: JobPosting): number {
    if (job.skills.length === 0) return 0.5 // Neutral if no skills specified

    const userSkillsMap = new Map(user.skills.map(s => [s.name.toLowerCase(), s]))
    let totalWeight = 0
    let matchedWeight = 0

    job.skills.forEach(jobSkill => {
      const weight = jobSkill.required ? 2 : 1 // Required skills weighted more heavily
      totalWeight += weight

      const userSkill = userSkillsMap.get(jobSkill.name.toLowerCase())
      if (userSkill) {
        // Base match for having the skill
        let skillMatch = 0.7

        // Bonus for skill level alignment
        if (jobSkill.level && userSkill.level) {
          const levelScore = this.calculateSkillLevelMatch(userSkill.level, jobSkill.level)
          skillMatch = Math.min(1, skillMatch + levelScore * 0.3)
        } else {
          skillMatch = 0.8 // Good match if levels not specified
        }

        matchedWeight += weight * skillMatch
      }
    })

    return totalWeight > 0 ? matchedWeight / totalWeight : 0
  }

  private static calculateSkillLevelMatch(userLevel: string, requiredLevel: string): number {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert']
    const userIndex = levels.indexOf(userLevel)
    const requiredIndex = levels.indexOf(requiredLevel)

    if (userIndex >= requiredIndex) {
      return 1 // User meets or exceeds required level
    } else {
      // Partial score for being close
      const gap = requiredIndex - userIndex
      return Math.max(0, 1 - gap * 0.3)
    }
  }

  // Rate compatibility scoring
  private static calculateRateMatch(user: UserProfile, job: JobPosting): number {
    if (!user.hourlyRateMin || !user.hourlyRateMax) return 0.5 // Neutral if no rate specified

    const userMinRate = user.hourlyRateMin
    const userMaxRate = user.hourlyRateMax
    const jobMinRate = job.hourlyRateMin
    const jobMaxRate = job.hourlyRateMax

    // Check for overlap in rate ranges
    const overlapMin = Math.max(userMinRate, jobMinRate)
    const overlapMax = Math.min(userMaxRate, jobMaxRate)

    if (overlapMax >= overlapMin) {
      // There is overlap - calculate how much
      const userRange = userMaxRate - userMinRate
      const jobRange = jobMaxRate - jobMinRate
      const overlapRange = overlapMax - overlapMin

      const overlapRatio = userRange > 0 ? overlapRange / userRange : 1
      return Math.min(1, overlapRatio * 1.2) // Bonus for good overlap
    } else {
      // No overlap - calculate how close they are
      const gap = Math.min(
        Math.abs(userMinRate - jobMaxRate),
        Math.abs(userMaxRate - jobMinRate)
      )
      const avgRate = (userMinRate + userMaxRate) / 2
      const gapRatio = gap / avgRate

      return Math.max(0, 1 - gapRatio)
    }
  }

  // Location and remote work preferences
  private static calculateLocationMatch(user: UserProfile, job: JobPosting): number {
    // Perfect match if job is remote and user prefers remote
    if (job.isRemote && user.isRemoteOnly) return 1

    // Good match if job is remote but user is flexible
    if (job.isRemote && !user.isRemoteOnly) return 0.9

    // No match if user only wants remote but job isn't
    if (user.isRemoteOnly && !job.isRemote) return 0

    // For location-based jobs, check location alignment
    if (job.location && user.location) {
      if (job.location.toLowerCase().includes(user.location.toLowerCase()) ||
          user.location.toLowerCase().includes(job.location.toLowerCase())) {
        return 0.8
      }
      return 0.3 // Different locations but both flexible
    }

    return 0.5 // Neutral if location info incomplete
  }

  // Job type and duration preferences
  private static calculatePreferenceMatch(user: UserProfile, job: JobPosting): number {
    let score = 0.5 // Base score

    // Job type preference
    if (user.preferredJobTypes.includes(job.jobType)) {
      score += 0.3
    }

    // Contract duration preference
    if (job.contractDuration && user.preferredContractDuration.includes(job.contractDuration)) {
      score += 0.2
    }

    return Math.min(1, score)
  }

  // User availability scoring
  private static calculateAvailabilityScore(user: UserProfile): number {
    switch (user.availability) {
      case 'available': return 1
      case 'busy': return 0.3
      case 'not_looking': return 0
      default: return 0.5
    }
  }

  // Competition level (fewer applicants = higher score)
  private static calculateCompetitionScore(job: JobPosting): number {
    const applicationsCount = job.applicationsCount || 0
    
    if (applicationsCount === 0) return 1
    if (applicationsCount <= 5) return 0.8
    if (applicationsCount <= 15) return 0.6
    if (applicationsCount <= 30) return 0.4
    return 0.2 // High competition
  }

  // Profile completeness bonus
  private static calculateProfileCompleteness(user: UserProfile): number {
    return user.profileCompleteness / 100
  }

  // Get top matches for a user
  static async getMatchesForUser(
    userId: string, 
    limit: number = 20,
    minScore: number = 50
  ): Promise<MatchScore[]> {
    // This would typically query the database
    // For now, we'll return a mock implementation
    
    // In real implementation:
    // 1. Get user profile from database
    // 2. Get active job postings
    // 3. Calculate match scores for each job
    // 4. Sort by score and return top results

    return this.getMockMatches(userId, limit, minScore)
  }

  // Get top candidates for a job
  static async getCandidatesForJob(
    jobId: string,
    limit: number = 50,
    minScore: number = 60
  ): Promise<MatchScore[]> {
    // In real implementation:
    // 1. Get job posting from database
    // 2. Get available contractor profiles
    // 3. Calculate match scores for each contractor
    // 4. Sort by score and return top candidates

    return this.getMockCandidatesForJob(jobId, limit, minScore)
  }

  // Batch processing for daily match notifications
  static async generateDailyMatches(
    userIds: string[],
    maxMatchesPerUser: number = 5
  ): Promise<Map<string, MatchScore[]>> {
    const dailyMatches = new Map<string, MatchScore[]>()

    for (const userId of userIds) {
      const matches = await this.getMatchesForUser(userId, maxMatchesPerUser, 70)
      if (matches.length > 0) {
        dailyMatches.set(userId, matches)
      }
    }

    return dailyMatches
  }

  // Mock data for development
  private static getMockMatches(userId: string, limit: number, minScore: number): MatchScore[] {
    const mockMatches: MatchScore[] = [
      {
        userId,
        jobId: 'job-1',
        overallScore: 87,
        skillsScore: 90,
        rateScore: 85,
        locationScore: 100,
        preferenceScore: 80,
        availabilityScore: 100,
        competitionScore: 70,
        profileScore: 85,
        reasonsMatched: ['Strong skill alignment', 'Perfect location match', 'Available immediately'],
        reasonsNotMatched: [],
        confidence: 'high'
      },
      {
        userId,
        jobId: 'job-2', 
        overallScore: 76,
        skillsScore: 80,
        rateScore: 90,
        locationScore: 60,
        preferenceScore: 75,
        availabilityScore: 100,
        competitionScore: 80,
        profileScore: 85,
        reasonsMatched: ['Excellent rate match', 'Available immediately'],
        reasonsNotMatched: ['Location preferences not aligned'],
        confidence: 'medium'
      },
      {
        userId,
        jobId: 'job-3',
        overallScore: 65,
        skillsScore: 70,
        rateScore: 60,
        locationScore: 80,
        preferenceScore: 70,
        availabilityScore: 100,
        competitionScore: 90,
        profileScore: 85,
        reasonsMatched: ['Available immediately', 'Low competition'],
        reasonsNotMatched: ['Rate expectations misaligned'],
        confidence: 'medium'
      }
    ]

    return mockMatches.filter(m => m.overallScore >= minScore).slice(0, limit)
  }

  private static getMockCandidatesForJob(jobId: string, limit: number, minScore: number): MatchScore[] {
    const mockCandidates: MatchScore[] = [
      {
        userId: 'user-1',
        jobId,
        overallScore: 92,
        skillsScore: 95,
        rateScore: 88,
        locationScore: 100,
        preferenceScore: 85,
        availabilityScore: 100,
        competitionScore: 80,
        profileScore: 90,
        reasonsMatched: ['Strong skill alignment', 'Perfect location match', 'Available immediately'],
        reasonsNotMatched: [],
        confidence: 'high'
      },
      {
        userId: 'user-2',
        jobId,
        overallScore: 78,
        skillsScore: 85,
        rateScore: 70,
        locationScore: 90,
        preferenceScore: 80,
        availabilityScore: 100,
        competitionScore: 80,
        profileScore: 85,
        reasonsMatched: ['Strong skill alignment', 'Available immediately'],
        reasonsNotMatched: ['Rate expectations slightly low'],
        confidence: 'medium'
      }
    ]

    return mockCandidates.filter(c => c.overallScore >= minScore).slice(0, limit)
  }
}