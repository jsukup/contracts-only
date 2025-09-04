// NextRequest and NextResponse are mocked globally in jest.setup.js
import { NextRequest } from 'next/server'

// Note: Auth and Supabase are mocked globally in jest.setup.js

const mockSupabase = (global as { __mockSupabase: any }).__mockSupabase

// Import after mocking to avoid ESM issues
import { GET, POST } from '../jobs/route'
import { getServerSession } from '@/lib/auth'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/jobs', () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'React Developer',
        company: 'Tech Corp',
        location: 'Remote',
        type: 'FULL_TIME',
        hourly_rate_min: 80,
        hourly_rate_max: 120,
        description: 'React development role',
        requirements: 'React, TypeScript',
        application_url: 'https://company.com/apply',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        poster_id: 'user-1',
        users: {
          id: 'user-1',
          name: 'Tech Corp HR',
          email: 'hr@techcorp.com',
          company_name: 'Tech Corp'
        },
        job_skills: [
          { skills: { id: 'skill-1', name: 'React' } },
          { skills: { id: 'skill-2', name: 'TypeScript' } }
        ],
        applications_count: 5
      }
    ]

    it('should return all jobs when no filters applied', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockJobs })
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)
      
      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toHaveLength(1)
      expect(data.jobs[0].title).toBe('React Developer')
    })

    it('should filter jobs by search query', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockJobs })
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?search=React')
      const response = await GET(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockFrom.select).toHaveBeenCalled()
      expect(mockFrom.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('should filter jobs by location', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockJobs })
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?location=Remote')
      await GET(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockFrom.ilike).toHaveBeenCalledWith('location', '%Remote%')
    })

    it('should filter jobs by salary range', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockJobs })
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?minRate=80&maxRate=150')
      await GET(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockFrom.gte).toHaveBeenCalledWith('hourly_rate_min', 80)
      expect(mockFrom.lte).toHaveBeenCalledWith('hourly_rate_max', 150)
    })

    it('should handle pagination', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockJobs })
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?page=2&limit=10')
      await GET(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockFrom.range).toHaveBeenCalledWith(10, 19) // (page 2 - 1) * limit 10, limit 10 + 9
    })

    it('should handle database errors gracefully', async () => {
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockRejectedValue(new Error('Database error'))
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)
      
      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch jobs')
    })
  })

  describe('POST /api/jobs', () => {
    const validJobData = {
      title: 'Senior React Developer',
      company: 'Tech Solutions Inc',
      location: 'Remote',
      type: 'FULL_TIME',
      hourly_rate_min: 90,
      hourly_rate_max: 130,
      description: 'We are looking for a senior React developer...',
      requirements: 'React, TypeScript, 5+ years experience',
      application_url: 'https://techsolutions.com/careers/react-dev',
      skill_ids: ['skill-1', 'skill-2'],
      application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }

    const mockUser = {
      id: 'user-1',
      email: 'employer@techsolutions.com',
      role: 'EMPLOYER'
    }

    it('should create a new job when authenticated as employer', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser })
      
      const mockCreatedJob = {
        id: 'job-1',
        ...validJobData,
        poster_id: mockUser.id,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      }
      
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [mockCreatedJob] })
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(validJobData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.job.id).toBe('job-1')
      expect(data.job.title).toBe(validJobData.title)
    })

    it('should reject job creation when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(validJobData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })

    it('should reject job creation when user is not employer', async () => {
      mockGetServerSession.mockResolvedValue({ 
        user: { ...mockUser, role: 'USER' }
      })

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(validJobData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Employer access required')
    })

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser })

      const incompleteJobData = {
        title: 'React Developer',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(incompleteJobData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing required fields')
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({ user: mockUser })
      
      const mockFrom = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockRejectedValue(new Error('Database constraint violation'))
      }
      
      mockSupabase.from = jest.fn().mockReturnValue(mockFrom)

      const request = new NextRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(validJobData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create job')
    })
  })
})