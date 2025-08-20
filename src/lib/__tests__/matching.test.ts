import { JobMatchingEngine, UserProfile, JobPosting } from '../matching'

const mockUserProfile: UserProfile = {
  id: 'user-1',
  skills: [
    { id: 'skill-1', name: 'React', proficiencyLevel: 'EXPERT' },
    { id: 'skill-2', name: 'TypeScript', proficiencyLevel: 'ADVANCED' },
    { id: 'skill-3', name: 'Node.js', proficiencyLevel: 'INTERMEDIATE' }
  ],
  desiredHourlyRate: 100,
  location: 'Remote',
  availability: 'AVAILABLE',
  preferences: {
    workType: 'REMOTE',
    contractLength: 'LONG_TERM',
    industries: ['Technology', 'Finance']
  }
}

const mockJobPosting: JobPosting = {
  id: 'job-1',
  title: 'Senior React Developer',
  requiredSkills: [
    { id: 'skill-1', name: 'React', requiredLevel: 'ADVANCED' },
    { id: 'skill-2', name: 'TypeScript', requiredLevel: 'INTERMEDIATE' },
    { id: 'skill-4', name: 'Python', requiredLevel: 'BEGINNER' }
  ],
  hourlyRateMin: 80,
  hourlyRateMax: 120,
  location: 'Remote',
  type: 'REMOTE',
  industry: 'Technology',
  contractLength: 'LONG_TERM',
  applicantCount: 5
}

describe('JobMatchingEngine', () => {
  describe('calculateMatch', () => {
    it('should return high match score for well-matched profile and job', () => {
      const result = JobMatchingEngine.calculateMatch(mockUserProfile, mockJobPosting)

      expect(result.overallScore).toBeGreaterThan(70)
      expect(result.breakdown.skills).toBeGreaterThan(60)
      expect(result.breakdown.rate).toBe(100) // Rate matches perfectly
      expect(result.breakdown.location).toBe(100) // Remote matches Remote
      expect(result.breakdown.preference).toBeGreaterThan(80)
      expect(result.isGoodMatch).toBe(true)
    })

    it('should calculate skills match correctly', () => {
      const result = JobMatchingEngine.calculateMatch(mockUserProfile, mockJobPosting)

      // Should have high skills score due to React (Expert > Advanced) and TypeScript (Advanced >= Intermediate)
      expect(result.breakdown.skills).toBeGreaterThan(60)
      expect(result.details.matchedSkills).toHaveLength(2)
      expect(result.details.missingSkills).toHaveLength(1)
      expect(result.details.missingSkills[0]).toBe('Python')
    })

    it('should handle rate mismatch correctly', () => {
      const lowPayJob = {
        ...mockJobPosting,
        hourlyRateMin: 30,
        hourlyRateMax: 50
      }

      const result = JobMatchingEngine.calculateMatch(mockUserProfile, lowPayJob)

      expect(result.breakdown.rate).toBeLessThan(50)
      expect(result.isGoodMatch).toBe(false)
    })

    it('should handle location preferences', () => {
      const onsiteJob = {
        ...mockJobPosting,
        location: 'San Francisco, CA',
        type: 'ON_SITE' as const
      }

      const result = JobMatchingEngine.calculateMatch(mockUserProfile, onsiteJob)

      expect(result.breakdown.location).toBeLessThan(100)
    })

    it('should factor in competition level', () => {
      const highCompetitionJob = {
        ...mockJobPosting,
        applicantCount: 100
      }

      const lowCompetitionJob = {
        ...mockJobPosting,
        applicantCount: 2
      }

      const highCompResult = JobMatchingEngine.calculateMatch(mockUserProfile, highCompetitionJob)
      const lowCompResult = JobMatchingEngine.calculateMatch(mockUserProfile, lowCompetitionJob)

      expect(lowCompResult.breakdown.competition).toBeGreaterThan(highCompResult.breakdown.competition)
    })

    it('should return match recommendations', () => {
      const result = JobMatchingEngine.calculateMatch(mockUserProfile, mockJobPosting)

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('should handle missing skills gracefully', () => {
      const userWithFewSkills = {
        ...mockUserProfile,
        skills: [
          { id: 'skill-5', name: 'Vue.js', proficiencyLevel: 'BEGINNER' as const }
        ]
      }

      const result = JobMatchingEngine.calculateMatch(userWithFewSkills, mockJobPosting)

      expect(result.overallScore).toBeLessThan(50)
      expect(result.details.missingSkills).toHaveLength(3)
      expect(result.isGoodMatch).toBe(false)
    })
  })

  describe('findMatches', () => {
    it('should return sorted matches by score', async () => {
      const jobs = [mockJobPosting]
      const matches = await JobMatchingEngine.findMatches(mockUserProfile, jobs)

      expect(matches).toHaveLength(1)
      expect(matches[0].job.id).toBe(mockJobPosting.id)
      expect(matches[0].score.overallScore).toBeGreaterThan(0)
    })

    it('should filter out poor matches when requested', async () => {
      const poorMatchJob = {
        ...mockJobPosting,
        requiredSkills: [
          { id: 'skill-10', name: 'COBOL', requiredLevel: 'EXPERT' as const }
        ],
        hourlyRateMin: 10,
        hourlyRateMax: 20
      }

      const jobs = [mockJobPosting, poorMatchJob]
      const matches = await JobMatchingEngine.findMatches(mockUserProfile, jobs, { minScore: 50 })

      expect(matches).toHaveLength(1)
      expect(matches[0].job.id).toBe(mockJobPosting.id)
    })

    it('should limit results when requested', async () => {
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        ...mockJobPosting,
        id: `job-${i}`
      }))

      const matches = await JobMatchingEngine.findMatches(mockUserProfile, jobs, { limit: 5 })

      expect(matches).toHaveLength(5)
    })
  })

  describe('proficiencyToScore', () => {
    it('should convert proficiency levels to numeric scores correctly', () => {
      expect(JobMatchingEngine.proficiencyToScore('BEGINNER')).toBe(25)
      expect(JobMatchingEngine.proficiencyToScore('INTERMEDIATE')).toBe(50)
      expect(JobMatchingEngine.proficiencyToScore('ADVANCED')).toBe(75)
      expect(JobMatchingEngine.proficiencyToScore('EXPERT')).toBe(100)
    })
  })
})