'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { AdPlaceholder } from '@/components/ads/AdPlaceholder'
import { HomeJobFilters, JobFilterValues } from './HomeJobFilters'

interface Job {
  id: string
  title: string
  company: string
  location: string | null
  isRemote: boolean
  jobType: string
  hourlyRateMin: number
  hourlyRateMax: number
  externalUrl?: string
}

interface ExpandableJobsListProps {
  initialJobs: Job[]
  totalJobs: number
  showFilters?: boolean
}

export function ExpandableJobsList({ initialJobs, totalJobs, showFilters = false }: ExpandableJobsListProps) {
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [filters, setFilters] = useState<JobFilterValues>({})
  const [filterLoading, setFilterLoading] = useState(false)
  const [filteredTotal, setFilteredTotal] = useState(totalJobs)

  // Check if auth is disabled to show all jobs by default
  const authDisabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'false'

  useEffect(() => {
    // If auth is disabled, load all jobs automatically
    if (authDisabled && allJobs.length === 0 && Object.keys(filters).length === 0) {
      fetchAllJobs()
    }
  }, [authDisabled])

  const buildQueryString = (filters: JobFilterValues, limit: number = 1000) => {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    
    if (filters.search) {
      params.append('search', filters.search)
    }
    if (filters.location) {
      params.append('location', filters.location)
    }
    if (filters.hourlyRate) {
      params.append('hourlyRate', filters.hourlyRate.toString())
    }
    
    return params.toString()
  }

  const fetchAllJobs = async (applyFilters?: JobFilterValues) => {
    setLoadingMore(true)
    try {
      const queryString = buildQueryString(applyFilters || {})
      const response = await fetch(`/api/jobs?${queryString}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (applyFilters && Object.keys(applyFilters).length > 0) {
        setFilteredJobs(data.jobs || [])
        setFilteredTotal(data.pagination?.total || 0)
      } else {
        setAllJobs(data.jobs || [])
        setFilteredJobs([])
        setFilteredTotal(totalJobs)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleToggleExpanded = async () => {
    if (!showAll && allJobs.length === 0 && filteredJobs.length === 0) {
      await fetchAllJobs(filters)
    }
    setShowAll(!showAll)
  }

  const handleFiltersChange = useCallback(async (newFilters: JobFilterValues) => {
    setFilters(newFilters)
    setFilterLoading(true)
    
    // If filters are applied, fetch filtered results
    if (Object.keys(newFilters).length > 0) {
      await fetchAllJobs(newFilters)
      setShowAll(true) // Auto-expand when filtering
    } else {
      // Clear filters - reset to initial state
      setFilteredJobs([])
      setFilteredTotal(totalJobs)
      setShowAll(false)
      if (authDisabled) {
        await fetchAllJobs()
      }
    }
    
    setFilterLoading(false)
  }, [authDisabled, totalJobs])

  // Determine which jobs to display
  const hasActiveFilters = Object.keys(filters).length > 0
  const jobsToShow = hasActiveFilters 
    ? filteredJobs 
    : (authDisabled ? allJobs : (showAll ? allJobs : initialJobs))
  const currentTotal = hasActiveFilters ? filteredTotal : totalJobs
  const isInitialLoad = authDisabled && loadingMore && allJobs.length === 0 && !hasActiveFilters

  // Function to create job cards with ads interspersed
  const createJobsWithAds = (jobs: Job[]) => {
    const elements: React.ReactElement[] = []
    
    jobs.forEach((job, index) => {
      // Add job card
      elements.push(
        <div key={job.id} className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {job.title}
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {job.jobType}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{job.company}</p>
          <p className="mt-1 text-sm text-gray-500">
            {job.location || (job.isRemote ? 'Remote' : 'Location TBD')}
          </p>
          <div className="mt-4 flex justify-between items-center">
            <span className="text-lg font-bold text-indigo-600">
              ${job.hourlyRateMin}-${job.hourlyRateMax}/hr
            </span>
            {job.externalUrl ? (
              <a
                href={job.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
              >
                Apply on Indeed →
              </a>
            ) : (
              <Link
                href={`/jobs/${job.id}`}
                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
              >
                View Details →
              </Link>
            )}
          </div>
        </div>
      )
      
      // Add ad after every 9 jobs (0-based index, so after index 8, 17, 26, etc.)
      if ((index + 1) % 9 === 0 && index < jobs.length - 1) {
        elements.push(
          <div key={`ad-${index}`} className="col-span-full">
            <AdPlaceholder 
              className="my-4"
              adSlot={`ad-slot-${Math.floor(index / 9) + 1}`}
            />
          </div>
        )
      }
    })
    
    return elements
  }

  return (
    <>
      {/* Filters Section */}
      {showFilters && (
        <HomeJobFilters 
          onFiltersChange={handleFiltersChange}
          loading={filterLoading || loadingMore}
        />
      )}

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="mb-4 text-sm text-gray-600">
          {filteredTotal === 0 ? (
            <span>No jobs found matching your filters</span>
          ) : (
            <span>Found {filteredTotal} job{filteredTotal !== 1 ? 's' : ''} matching your filters</span>
          )}
        </div>
      )}

      {/* Jobs Display */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isInitialLoad ? (
          // Loading state for auth-disabled mode
          Array.from({ length: 12 }).map((_, index) => (
            <div key={`loading-${index}`} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex justify-between items-start mb-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mt-1"></div>
              <div className="mt-4 flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))
        ) : jobsToShow.length > 0 ? (
          // Render jobs with ads interspersed
          createJobsWithAds(jobsToShow)
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No jobs available at the moment. Check back soon!</p>
          </div>
        )}
      </div>


      {/* Show More/Less Button - only show when auth is enabled and no filters active */}
      {!authDisabled && !hasActiveFilters && initialJobs.length > 0 && totalJobs > 6 && (
        <div className="mt-8 text-center">
          <Button
            onClick={handleToggleExpanded}
            disabled={loadingMore}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Loading...
              </>
            ) : showAll ? (
              <>
                Show Fewer Jobs
                <ChevronUp className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Show More Jobs
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </>
  )
}