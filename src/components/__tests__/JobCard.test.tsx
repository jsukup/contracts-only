import { render, screen, fireEvent } from '@testing-library/react'
import { JobCard } from '../jobs/JobCard'

const mockJob = {
  id: 'job-1',
  title: 'Senior React Developer',
  company: 'Tech Corp',
  location: 'Remote',
  isRemote: true,
  jobType: 'CONTRACT',
  hourlyRateMin: 80,
  hourlyRateMax: 120,
  currency: 'USD',
  contractDuration: '6 months',
  hoursPerWeek: 40,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  expiresAt: '2024-12-31T00:00:00.000Z',
  isActive: true,
  postedBy: {
    id: 'user-1',
    name: 'Tech Corp HR',
    email: 'hr@techcorp.com'
  },
  jobSkills: [
    { skill: { id: 'skill-1', name: 'React' } },
    { skill: { id: 'skill-2', name: 'TypeScript' } }
  ],
  _count: {
    applications: 5
  }
}

describe('JobCard', () => {
  it('renders job information correctly', () => {
    render(<JobCard job={mockJob} />)
    
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
    expect(screen.getByText('Tech Corp')).toBeInTheDocument()
    expect(screen.getByText('Remote')).toBeInTheDocument()
    expect(screen.getByText('$80-$120/hr')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('displays skill badges', () => {
    render(<JobCard job={mockJob} />)
    
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('handles view details click', () => {
    render(<JobCard job={mockJob} />)
    
    const viewButton = screen.getByText('View Details')
    expect(viewButton.closest('a')).toHaveAttribute('href', `/jobs/${mockJob.id}`)
  })

  it('handles apply click', () => {
    render(<JobCard job={mockJob} />)
    
    const applyButton = screen.getByText('Apply Now')
    expect(applyButton.closest('a')).toHaveAttribute('href', `/jobs/${mockJob.id}/apply`)
  })

  it('shows application count when available', () => {
    render(<JobCard job={mockJob} />)
    
    expect(screen.getByText('5 applicants')).toBeInTheDocument()
  })

  it('handles missing optional fields gracefully', () => {
    const jobWithoutOptionalFields = {
      ...mockJob,
      hourlyRateMin: null,
      hourlyRateMax: null,
      _count: undefined
    }
    
    render(<JobCard job={jobWithoutOptionalFields} />)
    
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    expect(screen.queryByText('applicants')).not.toBeInTheDocument()
  })
})