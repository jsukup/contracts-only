'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

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
}

export function ExpandableJobsList({ initialJobs, totalJobs }: ExpandableJobsListProps) {
  const [expanded, setExpanded] = useState(false)
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loadingMore, setLoadingMore] = useState(false)

  const handleToggleExpanded = async () => {
    if (!expanded && allJobs.length === 0) {
      // First time expanding - fetch all jobs
      setLoadingMore(true)
      try {
        const response = await fetch('/api/jobs?limit=1000') // Fetch all jobs
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setAllJobs(data.jobs || [])
      } catch (error) {
        console.error('Error fetching all jobs:', error)
      } finally {
        setLoadingMore(false)
      }
    }
    setExpanded(!expanded)
  }

  return (
    <>
      {/* Initial Jobs Display */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {initialJobs.length > 0 ? (
          initialJobs.map((job) => (
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
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">No jobs available at the moment. Check back soon!</p>
          </div>
        )}
      </div>

      {/* Expanded Jobs Section */}
      {expanded && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-500">
          {loadingMore ? (
            Array.from({ length: 6 }).map((_, index) => (
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
          ) : (
            allJobs.slice(6).map((job) => ( // Skip first 6 as they're already shown
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
            ))
          )}
        </div>
      )}

      {/* Show More/Less Button */}
      {initialJobs.length > 0 && totalJobs > 6 && (
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
            ) : expanded ? (
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