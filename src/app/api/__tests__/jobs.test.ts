import { NextRequest } from 'next/server'
import { GET, POST } from '../jobs/route'
import { prisma } from '@/lib/prisma'

// Mock the prisma client
jest.mock('@/lib/prisma')
const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

const mockGetServerSession = require('next-auth/next').getServerSession

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
        hourlyRateMin: 80,
        hourlyRateMax: 120,
        description: 'React development role',
        requirements: 'React, TypeScript',
        applicationUrl: 'https://company.com/apply',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        userId: 'user-1',
        user: {
          id: 'user-1',
          name: 'Tech Corp HR',
          email: 'hr@techcorp.com',
          companyName: 'Tech Corp'
        },
        skills: [
          { id: 'skill-1', name: 'React' },
          { id: 'skill-2', name: 'TypeScript' }
        ],
        _count: {
          applications: 5
        }
      }
    ]

    it('should return all jobs when no filters applied', async () => {
      mockPrisma.job.findMany.mockResolvedValue(mockJobs)
      
      const request = new NextRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toHaveLength(1)
      expect(data.jobs[0].title).toBe('React Developer')
    })

    it('should filter jobs by search query', async () => {
      mockPrisma.job.findMany.mockResolvedValue(mockJobs)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?search=React')
      const response = await GET(request)

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { title: { contains: 'React', mode: 'insensitive' } },
            { description: { contains: 'React', mode: 'insensitive' } },
            { requirements: { contains: 'React', mode: 'insensitive' } },
            { company: { contains: 'React', mode: 'insensitive' } }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true
            }
          },
          skills: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      })
    })

    it('should filter jobs by location', async () => {
      mockPrisma.job.findMany.mockResolvedValue(mockJobs)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?location=Remote')
      await GET(request)

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: { contains: 'Remote', mode: 'insensitive' }
          })
        })
      )
    })

    it('should filter jobs by salary range', async () => {
      mockPrisma.job.findMany.mockResolvedValue(mockJobs)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?minRate=80&maxRate=150')
      await GET(request)

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hourlyRateMin: { gte: 80 },
            hourlyRateMax: { lte: 150 }
          })
        })
      )
    })

    it('should handle pagination', async () => {
      mockPrisma.job.findMany.mockResolvedValue(mockJobs)
      
      const request = new NextRequest('http://localhost:3000/api/jobs?page=2&limit=10')
      await GET(request)

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10 // (page 2 - 1) * limit 10
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.job.findMany.mockRejectedValue(new Error('Database error'))
      
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
      hourlyRateMin: 90,
      hourlyRateMax: 130,
      description: 'We are looking for a senior React developer...',
      requirements: 'React, TypeScript, 5+ years experience',
      applicationUrl: 'https://techsolutions.com/careers/react-dev',
      skillIds: ['skill-1', 'skill-2'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
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
        userId: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }
      
      mockPrisma.job.create.mockResolvedValue(mockCreatedJob)

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
      mockPrisma.job.create.mockRejectedValue(new Error('Database constraint violation'))

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