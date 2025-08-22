import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/jobs/route'
import { dbTestHelper, setupDatabaseTests, validateTestEnvironment } from '../setup/database-setup'
import { createMockRequest } from '../utils/testing-helpers'

// Validate test environment before running tests
validateTestEnvironment()

// Setup database for integration tests
setupDatabaseTests()

describe('Jobs API Integration Tests', () => {
  describe('GET /api/jobs', () => {
    it('should return jobs from real database', async () => {
      // Arrange: Create test job in database
      const testJob = await dbTestHelper.createTestJob({
        title: 'TEST_Integration React Developer',
        company: 'Integration Test Corp',
        hourly_rate_min: 90,
        hourly_rate_max: 130,
      })

      // Act: Make API request
      const request = createMockRequest('http://localhost:3000/api/jobs')
      const response = await GET(request)
      const data = await response.json()

      // Assert: Verify response
      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      expect(data.jobs.length).toBeGreaterThan(0)
      
      // Find our test job in results
      const returnedJob = data.jobs.find((job: any) => job.id === testJob.id)
      expect(returnedJob).toBeDefined()
      expect(returnedJob.title).toBe('TEST_Integration React Developer')
      expect(returnedJob.company).toBe('Integration Test Corp')
    })

    it('should filter jobs by search query', async () => {
      // Arrange: Create specific test jobs
      await dbTestHelper.createTestJob({
        title: 'TEST_React Frontend Developer',
        description: 'React and JavaScript development',
      })
      
      await dbTestHelper.createTestJob({
        title: 'TEST_Python Backend Developer', 
        description: 'Python and Django development',
      })

      // Act: Search for React jobs
      const request = createMockRequest('http://localhost:3000/api/jobs?search=React')
      const response = await GET(request)
      const data = await response.json()

      // Assert: Only React job should be returned
      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      
      const reactJobs = data.jobs.filter((job: any) => 
        job.title.includes('React') || job.description.includes('React')
      )
      expect(reactJobs.length).toBeGreaterThan(0)
      
      // Should not contain Python jobs
      const pythonJobs = data.jobs.filter((job: any) => 
        job.title.includes('Python') || job.description.includes('Python')
      )
      expect(pythonJobs.length).toBe(0)
    })

    it('should filter jobs by location', async () => {
      // Arrange: Create jobs in different locations
      await dbTestHelper.createTestJob({
        title: 'TEST_Remote Developer',
        location: 'Remote',
        is_remote: true,
      })
      
      await dbTestHelper.createTestJob({
        title: 'TEST_SF Developer',
        location: 'San Francisco, CA',
        is_remote: false,
      })

      // Act: Filter by remote location
      const request = createMockRequest('http://localhost:3000/api/jobs?location=Remote')
      const response = await GET(request)
      const data = await response.json()

      // Assert: Only remote jobs returned
      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      
      data.jobs.forEach((job: any) => {
        expect(job.location).toContain('Remote')
      })
    })

    it('should filter jobs by salary range', async () => {
      // Arrange: Create jobs with different salary ranges
      await dbTestHelper.createTestJob({
        title: 'TEST_Low Rate Job',
        hourly_rate_min: 30,
        hourly_rate_max: 50,
      })
      
      await dbTestHelper.createTestJob({
        title: 'TEST_High Rate Job',
        hourly_rate_min: 100,
        hourly_rate_max: 150,
      })

      // Act: Filter by high salary range
      const request = createMockRequest('http://localhost:3000/api/jobs?minRate=80&maxRate=200')
      const response = await GET(request)
      const data = await response.json()

      // Assert: Only high-paying jobs returned
      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      
      data.jobs.forEach((job: any) => {
        if (job.hourly_rate_min) {
          expect(job.hourly_rate_min).toBeGreaterThanOrEqual(80)
        }
      })
    })

    it('should handle pagination correctly', async () => {
      // Arrange: Create multiple test jobs
      const jobPromises = Array.from({ length: 15 }, (_, i) => 
        dbTestHelper.createTestJob({
          title: `TEST_Pagination Job ${i + 1}`,
          company: `Company ${i + 1}`,
        })
      )
      await Promise.all(jobPromises)

      // Act: Request first page
      const request1 = createMockRequest('http://localhost:3000/api/jobs?page=1&limit=10')
      const response1 = await GET(request1)
      const data1 = await response1.json()

      // Act: Request second page
      const request2 = createMockRequest('http://localhost:3000/api/jobs?page=2&limit=10')
      const response2 = await GET(request2)
      const data2 = await response2.json()

      // Assert: Pagination works correctly
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      expect(data1.jobs.length).toBeLessThanOrEqual(10)
      expect(data2.jobs.length).toBeGreaterThan(0)
      
      // Verify pagination metadata
      expect(data1.pagination).toBeDefined()
      expect(data1.pagination.page).toBe(1)
      expect(data1.pagination.limit).toBe(10)
      expect(data1.pagination.total).toBeGreaterThan(15)
    })

    it('should return empty array when no jobs match filters', async () => {
      // Act: Search for non-existent skill
      const request = createMockRequest('http://localhost:3000/api/jobs?search=NonExistentSkill123')
      const response = await GET(request)
      const data = await response.json()

      // Assert: Empty results
      expect(response.status).toBe(200)
      expect(data.jobs).toBeDefined()
      expect(data.jobs.length).toBe(0)
      expect(data.pagination.total).toBe(0)
    })
  })

  describe('POST /api/jobs', () => {
    it('should create job with real database persistence', async () => {
      // Arrange: Create test employer
      const testEmployer = await dbTestHelper.createTestUser({
        role: 'EMPLOYER',
        email: 'employer@integration-test.com',
      })

      const jobData = {
        title: 'TEST_Integration Full Stack Developer',
        company: 'Integration Test Company',
        location: 'Remote',
        job_type: 'CONTRACT',
        hourly_rate_min: 75,
        hourly_rate_max: 100,
        description: 'Full stack development role for testing',
        requirements: 'React, Node.js, PostgreSQL',
        skill_ids: ['test-skill-1', 'test-skill-2'],
      }

      // Mock authentication
      jest.doMock('@/lib/auth', () => ({
        getServerSession: jest.fn().mockResolvedValue({ user: testEmployer })
      }))

      // Act: Create job via API
      const request = createMockRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      // Assert: Job created successfully
      expect(response.status).toBe(201)
      expect(data.job).toBeDefined()
      expect(data.job.title).toBe(jobData.title)
      expect(data.job.poster_id).toBe(testEmployer.id)

      // Verify job exists in database
      const dbJob = await dbTestHelper.getJob(data.job.id)
      expect(dbJob).toBeDefined()
      expect(dbJob.title).toBe(jobData.title)
      expect(dbJob.company).toBe(jobData.company)
    })

    it('should validate required fields with database constraints', async () => {
      // Arrange: Create test employer
      const testEmployer = await dbTestHelper.createTestUser({
        role: 'EMPLOYER',
      })

      // Mock authentication
      jest.doMock('@/lib/auth', () => ({
        getServerSession: jest.fn().mockResolvedValue({ user: testEmployer })
      }))

      const incompleteJobData = {
        title: 'TEST_Incomplete Job',
        // Missing required fields like company, location, etc.
      }

      // Act: Attempt to create incomplete job
      const request = createMockRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(incompleteJobData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      // Assert: Validation error
      expect(response.status).toBe(400)
      
      // Verify no job was created in database
      const jobCount = await dbTestHelper.countJobs()
      // Should be same as seeded data, no new jobs
      expect(jobCount).toBeLessThanOrEqual(10) // Allowing for seeded data
    })

    it('should enforce employer role requirement', async () => {
      // Arrange: Create regular user (not employer)
      const testUser = await dbTestHelper.createTestUser({
        role: 'USER',
      })

      // Mock authentication with regular user
      jest.doMock('@/lib/auth', () => ({
        getServerSession: jest.fn().mockResolvedValue({ user: testUser })
      }))

      const jobData = {
        title: 'TEST_Unauthorized Job',
        company: 'Test Company',
        location: 'Remote',
        job_type: 'CONTRACT',
        description: 'Job posting by unauthorized user',
      }

      // Act: Attempt to create job as regular user
      const request = createMockRequest('http://localhost:3000/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)

      // Assert: Authorization error
      expect(response.status).toBe(403)
      
      // Verify no job was created
      const jobs = await dbTestHelper.countJobs()
      expect(jobs).toBeLessThanOrEqual(10) // Only seeded data
    })
  })

  describe('Database Consistency Tests', () => {
    it('should maintain referential integrity', async () => {
      // Arrange: Create employer and job
      const employer = await dbTestHelper.createTestUser({ role: 'EMPLOYER' })
      const job = await dbTestHelper.createTestJob({ poster_id: employer.id })
      const user = await dbTestHelper.createTestUser({ role: 'USER' })

      // Create application
      const application = await dbTestHelper.createTestApplication(job.id, user.id)

      // Act & Assert: Verify relationships exist
      const dbJob = await dbTestHelper.getJob(job.id)
      const dbUser = await dbTestHelper.getUser(user.id)
      const dbApplication = await dbTestHelper.getApplication(application.id)

      expect(dbJob.poster_id).toBe(employer.id)
      expect(dbApplication.job_id).toBe(job.id)
      expect(dbApplication.user_id).toBe(user.id)
    })

    it('should handle concurrent job applications', async () => {
      // Arrange: Create job and multiple users
      const job = await dbTestHelper.createTestJob()
      const users = await Promise.all([
        dbTestHelper.createTestUser({ email: 'user1@concurrent-test.com' }),
        dbTestHelper.createTestUser({ email: 'user2@concurrent-test.com' }),
        dbTestHelper.createTestUser({ email: 'user3@concurrent-test.com' }),
      ])

      // Act: Create applications concurrently
      const applicationPromises = users.map(user =>
        dbTestHelper.createTestApplication(job.id, user.id)
      )

      const applications = await Promise.all(applicationPromises)

      // Assert: All applications created successfully
      expect(applications).toHaveLength(3)
      applications.forEach(app => {
        expect(app.job_id).toBe(job.id)
        expect(app.id).toBeDefined()
      })

      // Verify in database
      const applicationCount = await dbTestHelper.countApplications()
      expect(applicationCount).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Performance Tests', () => {
    it('should handle large job queries efficiently', async () => {
      // Arrange: Create many test jobs
      const jobPromises = Array.from({ length: 100 }, (_, i) =>
        dbTestHelper.createTestJob({
          title: `TEST_Performance Job ${i}`,
          company: `Performance Company ${i}`,
        })
      )
      await Promise.all(jobPromises)

      // Act: Measure query performance
      const start = performance.now()
      
      const request = createMockRequest('http://localhost:3000/api/jobs?limit=50')
      const response = await GET(request)
      const data = await response.json()
      
      const duration = performance.now() - start

      // Assert: Performance within acceptable limits
      expect(response.status).toBe(200)
      expect(data.jobs.length).toBeLessThanOrEqual(50)
      expect(duration).toBeWithinPerformanceBudget(1000) // 1 second budget
    })
  })
})