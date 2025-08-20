import { render, screen, fireEvent } from '@testing-library/react'
import { JobCard } from '../jobs/JobCard'

const mockJob = {
  id: 'job-1',
  title: 'Senior React Developer',
  company: 'Tech Corp',
  location: 'Remote',
  type: 'FULL_TIME',
  hourlyRateMin: 80,
  hourlyRateMax: 120,
  description: 'We are looking for a senior React developer...',
  requirements: 'React, TypeScript, Node.js',
  skills: [
    { id: 'skill-1', name: 'React' },
    { id: 'skill-2', name: 'TypeScript' }
  ],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  expiresAt: new Date('2024-12-31'),
  userId: 'user-1',
  applicationUrl: 'https://company.com/apply',
  isActive: true,
  user: {
    id: 'user-1',
    name: 'Tech Corp HR',
    email: 'hr@techcorp.com',
    companyName: 'Tech Corp'
  },
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
    expect(screen.getByText('$80 - $120/hr')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('displays skill badges', () => {
    render(<JobCard job={mockJob} />)
    
    const skillBadges = screen.getAllByTestId('skill-badge')
    expect(skillBadges).toHaveLength(2)
  })

  it('handles view details click', () => {
    const mockOnView = jest.fn()
    render(<JobCard job={mockJob} onView={mockOnView} />)
    
    const viewButton = screen.getByText('View Details')
    fireEvent.click(viewButton)
    
    expect(mockOnView).toHaveBeenCalledWith(mockJob.id)
  })

  it('handles apply click', () => {
    render(<JobCard job={mockJob} />)
    
    const applyButton = screen.getByText('Apply Now')
    fireEvent.click(applyButton)
    
    // Should open external application URL
    expect(applyButton).toHaveAttribute('href', mockJob.applicationUrl)
  })

  it('shows application count when available', () => {
    render(<JobCard job={mockJob} />)
    
    expect(screen.getByText('5 applications')).toBeInTheDocument()
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
    expect(screen.queryByText('applications')).not.toBeInTheDocument()
  })
})