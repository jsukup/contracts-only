'use client'

import { useState, useEffect } from 'react'
import { JobCard } from '@/components/jobs/JobCard'
import { JobFilters } from '@/components/jobs/JobFilters'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Loader2, Plus } from 'lucide-react'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  company: string
  location?: string
  isRemote: boolean
  jobType: string
  hourlyRateMin: number
  hourlyRateMax: number
  currency: string
  contractDuration?: string
  hoursPerWeek?: number
  createdAt: string
  jobSkills?: Array<{
    skill: {
      id: string
      name: string
    }
  }>
  _count?: {
    applications: number
  }
}

interface Skill {
  id: string
  name: string
  category?: string
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<any>({})
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchJobs = async (newFilters = filters, page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...newFilters
      })

      const response = await fetch(`/api/jobs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch jobs')
      
      const data = await response.json()
      setJobs(data.jobs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSkills = async () => {
    try {
      const response = await fetch('/api/skills')
      if (!response.ok) throw new Error('Failed to fetch skills')
      const data = await response.json()
      setSkills(data)
    } catch (error) {
      console.error('Error fetching skills:', error)
    }
  }

  useEffect(() => {
    fetchSkills()
  }, [])

  useEffect(() => {
    fetchJobs(filters, 1)
  }, [filters, sortBy, sortOrder])

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    fetchJobs(filters, newPage)
  }

  const handleSortChange = (newSortBy: string) => {
    const newSortOrder = newSortBy === sortBy && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Contract Jobs</h1>
          <p className="text-muted-foreground mt-2">
            {pagination.total > 0 
              ? `${pagination.total} job${pagination.total === 1 ? '' : 's'} available`
              : 'Find your next contract opportunity'
            }
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/post">
            <Plus className="h-4 w-4 mr-2" />
            Post a Job
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <JobFilters onFiltersChange={handleFiltersChange} skills={skills} />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'createdAt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('createdAt')}
            >
              Most Recent
              {sortBy === 'createdAt' && (
                <span className="ml-1">
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </Button>
            <Button
              variant={sortBy === 'hourlyRateMax' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('hourlyRateMax')}
            >
              Highest Pay
              {sortBy === 'hourlyRateMax' && (
                <span className="ml-1">
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </Button>
            <Button
              variant={sortBy === 'applications' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('applications')}
            >
              Most Popular
              {sortBy === 'applications' && (
                <span className="ml-1">
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </Button>
          </div>
          
          {pagination.total > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} jobs
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No jobs found matching your criteria.
              </p>
              <Button variant="outline" onClick={() => handleFiltersChange({})}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(
                pagination.totalPages - 4,
                pagination.page - 2
              )) + i
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === pagination.page ? 'default' : 'outline'}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
            
            <Button
              variant="outline"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}