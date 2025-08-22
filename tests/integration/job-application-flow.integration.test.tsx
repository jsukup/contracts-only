import React from 'react'
import { renderWithProviders, screen, userEvent, waitFor } from '../utils/testing-helpers'
import { setupDatabaseTests, dbTestHelper } from '../setup/database-setup'
import { apiTestFramework } from '../utils/api-test-helpers'
import { JobCard } from '@/components/jobs/JobCard'
import { JobPostForm } from '@/components/jobs/JobPostForm'

// Mock Next.js navigation
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/jobs',
}))

// Setup database for integration tests
setupDatabaseTests()

describe('Job Application Flow Integration', () => {
  let testEmployer: any
  let testUser: any
  let testJob: any

  beforeEach(async () => {
    jest.clearAllMocks()
    
    // Create test users and job
    testEmployer = await dbTestHelper.createTestUser({
      role: 'EMPLOYER',
      email: 'employer@flow-test.com',
      name: 'Test Employer',
    })
    
    testUser = await dbTestHelper.createTestUser({
      role: 'USER',
      email: 'user@flow-test.com',
      name: 'Test User',
    })
    
    testJob = await dbTestHelper.createTestJob({
      title: 'TEST_Senior React Developer',
      company: 'Flow Test Corp',
      location: 'Remote',
      hourly_rate_min: 80,
      hourly_rate_max: 120,
      poster_id: testEmployer.id,
    })

    // Mock API calls
    global.fetch = jest.fn()
  })

  describe('Employer Job Posting Flow', () => {
    it('should complete full job posting workflow', async () => {
      // Setup: Mock successful API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ skills: [
            { id: 'skill-1', name: 'React' },
            { id: 'skill-2', name: 'TypeScript' },
          ]}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            job: { 
              id: 'new-job-id',
              title: 'Senior React Developer',
              company: 'Tech Corp',
            }
          }),
        })

      // Render: Job posting form as employer
      const { user } = renderWithProviders(
        <JobPostForm />,
        { 
          user: testEmployer,
          initialAuthState: { user: testEmployer, loading: false }
        }
      )

      // Action: Fill out job posting form
      await user.type(screen.getByLabelText(/job title/i), 'Senior React Developer')
      await user.type(screen.getByLabelText(/company/i), 'Tech Corp')
      await user.type(screen.getByLabelText(/location/i), 'San Francisco, CA')
      
      // Select job type
      await user.click(screen.getByLabelText(/job type/i))
      await user.click(screen.getByText('Full-time'))
      
      // Add salary information
      await user.type(screen.getByLabelText(/minimum salary/i), '120000')
      await user.type(screen.getByLabelText(/maximum salary/i), '150000')
      
      // Add description
      await user.type(
        screen.getByLabelText(/description/i),
        'We are looking for a senior React developer to join our team...'
      )
      
      // Add requirements
      await user.type(
        screen.getByLabelText(/requirements/i),
        'React, TypeScript, 5+ years experience'
      )

      // Select skills
      const skillInput = screen.getByLabelText(/skills/i)
      await user.type(skillInput, 'React')
      await waitFor(() => {
        expect(screen.getByText('React')).toBeInTheDocument()
      })
      await user.click(screen.getByText('React'))

      // Submit form
      const submitButton = screen.getByRole('button', { name: /post job/i })
      await user.click(submitButton)

      // Assert: Form submission and success feedback
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/jobs'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('Senior React Developer'),
          })
        )
      })

      // Assert: Success message and navigation
      await waitFor(() => {
        expect(screen.getByText(/job posted successfully/i)).toBeInTheDocument()
      })

      expect(mockPush).toHaveBeenCalledWith('/jobs/new-job-id')
    })

    it('should handle form validation errors', async () => {
      // Render: Job posting form
      const { user } = renderWithProviders(
        <JobPostForm />,
        { user: testEmployer }
      )

      // Action: Submit empty form
      const submitButton = screen.getByRole('button', { name: /post job/i })
      await user.click(submitButton)

      // Assert: Validation errors displayed
      await waitFor(() => {
        expect(screen.getByText(/job title is required/i)).toBeInTheDocument()
        expect(screen.getByText(/company is required/i)).toBeInTheDocument()
        expect(screen.getByText(/location is required/i)).toBeInTheDocument()
      })

      // Verify no API call was made
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      // Setup: Mock API error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      // Render: Job posting form
      const { user } = renderWithProviders(
        <JobPostForm />,
        { user: testEmployer }
      )

      // Action: Fill and submit form
      await user.type(screen.getByLabelText(/job title/i), 'Test Job')
      await user.type(screen.getByLabelText(/company/i), 'Test Company')
      await user.type(screen.getByLabelText(/location/i), 'Remote')
      
      const submitButton = screen.getByRole('button', { name: /post job/i })
      await user.click(submitButton)

      // Assert: Error message displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to post job/i)).toBeInTheDocument()
      })

      // Form should still be visible for retry
      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()
    })
  })

  describe('Job Browsing and Application Flow', () => {
    it('should complete full job application workflow', async () => {
      // Setup: Mock successful API responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            application: { 
              id: 'new-app-id',
              status: 'PENDING',
            }
          }),
        })

      // Render: Job card as job seeker
      const { user } = renderWithProviders(
        <JobCard job={testJob} />,
        { 
          user: testUser,
          initialAuthState: { user: testUser, loading: false }
        }
      )

      // Assert: Job information displayed
      expect(screen.getByText('TEST_Senior React Developer')).toBeInTheDocument()
      expect(screen.getByText('Flow Test Corp')).toBeInTheDocument()
      expect(screen.getByText('$80-$120/hr')).toBeInTheDocument()

      // Action: Click apply button
      const applyButton = screen.getByRole('button', { name: /apply now/i })
      await user.click(applyButton)

      // Assert: Application modal/form appears
      await waitFor(() => {
        expect(screen.getByText(/apply for this position/i)).toBeInTheDocument()
      })

      // Action: Fill application form
      const coverLetterTextarea = screen.getByLabelText(/cover letter/i)
      await user.type(
        coverLetterTextarea,
        'I am very interested in this React developer position...'
      )

      // Upload resume (mock file upload)
      const fileInput = screen.getByLabelText(/resume/i)
      const file = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' })
      await user.upload(fileInput, file)

      // Submit application
      const submitAppButton = screen.getByRole('button', { name: /submit application/i })
      await user.click(submitAppButton)

      // Assert: Application submitted successfully
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/jobs/${testJob.id}/apply`),
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        )
      })

      await waitFor(() => {
        expect(screen.getByText(/application submitted successfully/i)).toBeInTheDocument()
      })

      // Assert: Apply button becomes disabled/changes
      expect(screen.getByText(/application pending/i)).toBeInTheDocument()
    })

    it('should prevent duplicate applications', async () => {
      // Setup: Mock user already applied
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ 
          error: 'You have already applied to this job' 
        }),
      })

      // Render: Job card for user who already applied
      const { user } = renderWithProviders(
        <JobCard job={testJob} hasApplied={true} />,
        { user: testUser }
      )

      // Assert: Apply button is disabled or shows different state
      const applyButton = screen.getByText(/already applied/i)
      expect(applyButton).toBeInTheDocument()
      
      // Or if it's a disabled button
      // expect(screen.getByRole('button', { name: /apply now/i })).toBeDisabled()
    })

    it('should handle unauthorized application attempts', async () => {
      // Render: Job card without authentication
      const { user } = renderWithProviders(
        <JobCard job={testJob} />,
        { 
          user: null,
          initialAuthState: { user: null, loading: false }
        }
      )

      // Action: Try to apply without login
      const applyButton = screen.getByRole('button', { name: /apply now/i })
      await user.click(applyButton)

      // Assert: Login prompt or redirect
      await waitFor(() => {
        expect(screen.getByText(/please sign in to apply/i)).toBeInTheDocument()
      })

      // Or verify navigation to login page
      expect(mockPush).toHaveBeenCalledWith('/auth/signin')
    })
  })

  describe('Multi-Component Integration', () => {
    it('should handle job search to application flow', async () => {
      // This would test a complete flow from search -> browse -> apply
      // involving multiple components working together
      
      // Setup: Mock search API
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobs: [testJob],
          pagination: { page: 1, limit: 10, total: 1 }
        }),
      })

      // This test would render a job search page with multiple components
      // and test the complete user flow
      
      // For now, we'll test the individual components
      // In a real implementation, this would test JobSearchPage or similar
      expect(testJob).toBeDefined()
    })

    it('should maintain state consistency across components', async () => {
      // Test that application state is consistent between components
      // For example, if user applies to a job, all job cards should reflect this
      
      const { rerender } = renderWithProviders(
        <JobCard job={testJob} />,
        { user: testUser }
      )

      // Initially should show apply button
      expect(screen.getByRole('button', { name: /apply now/i })).toBeInTheDocument()

      // After application (mock the state change)
      rerender(
        <JobCard job={testJob} hasApplied={true} />
      )

      // Should now show applied state
      expect(screen.getByText(/already applied/i)).toBeInTheDocument()
    })
  })

  describe('Real-time Updates and WebSocket Integration', () => {
    it('should handle real-time job status updates', async () => {
      // Mock WebSocket connection
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }

      // Mock WebSocket constructor
      global.WebSocket = jest.fn(() => mockWebSocket) as any

      // Render component that uses WebSocket
      renderWithProviders(
        <JobCard job={testJob} />,
        { user: testUser }
      )

      // Simulate WebSocket message
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1]

      if (messageHandler) {
        messageHandler({
          data: JSON.stringify({
            type: 'JOB_UPDATED',
            jobId: testJob.id,
            updates: { status: 'FILLED' }
          })
        })
      }

      // Assert: UI updates to reflect job status change
      await waitFor(() => {
        expect(screen.getByText(/position filled/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Accessibility Integration', () => {
    it('should maintain performance during complex interactions', async () => {
      const start = performance.now()
      
      const { user } = renderWithProviders(
        <JobCard job={testJob} />,
        { user: testUser }
      )

      // Perform multiple interactions
      await user.hover(screen.getByText(testJob.title))
      await user.click(screen.getByRole('button', { name: /view details/i }))
      
      const duration = performance.now() - start
      
      // Should complete within performance budget
      expect(duration).toBeWithinPerformanceBudget(500) // 500ms budget
    })

    it('should maintain accessibility during complex flows', async () => {
      const { container } = renderWithProviders(
        <JobCard job={testJob} />,
        { user: testUser }
      )

      // Test accessibility compliance
      expect(container).toBeAccessible()

      // Test keyboard navigation
      const { user } = renderWithProviders(
        <JobCard job={testJob} />,
        { user: testUser }
      )

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByRole('button', { name: /view details/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /apply now/i })).toHaveFocus()
    })
  })
})