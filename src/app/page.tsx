'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { createClerkSupabaseClient } from "@/lib/supabase-client"
import type { SupabaseJob } from "@/lib/supabase"
import { Button } from "@/components/ui/Button"
import { ChevronDown, ChevronUp } from 'lucide-react'

export default function HomePage() {
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [totalJobs, setTotalJobs] = useState<number>(0)
  const [expanded, setExpanded] = useState(false)
  const [allJobs, setAllJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const supabase = createClerkSupabaseClient()

  // Initial data fetching
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Get job count
        const { count, error: countError } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
        
        if (countError) {
          console.error('Error fetching job count:', countError)
        } else {
          setTotalJobs(count || 0)
        }

        // Get recent jobs (first 6)
        const { data: jobs, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6)

        if (jobsError) {
          console.error('Error fetching recent jobs:', jobsError)
        } else {
          setRecentJobs(jobs || [])
        }
      } catch (error) {
        console.error('Database connection error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Fetch all jobs when expanded
  const handleToggleExpanded = async () => {
    if (!expanded) {
      setLoadingMore(true)
      try {
        const { data: jobs, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50) // Get more jobs, but not all

        if (error) {
          console.error('Error fetching all jobs:', error)
        } else {
          setAllJobs(jobs || [])
        }
      } catch (error) {
        console.error('Database connection error:', error)
      } finally {
        setLoadingMore(false)
      }
    }
    setExpanded(!expanded)
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Find Your Next 
              <span className="text-indigo-600"> Contract Job</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Connect with top companies looking for skilled contractors. Browse thousands of freelance and contract opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Join Thousands of Professionals
            </h2>
            <div className="mt-8 flex justify-center">
              <div className="bg-white rounded-lg p-8 shadow-lg">
                <div className="text-4xl font-bold text-indigo-600">{totalJobs}</div>
                <div className="text-lg text-gray-500 mt-2">Active Jobs</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Jobs Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Latest Opportunities</h2>
            <p className="mt-2 text-gray-600">Fresh contract jobs posted this week</p>
          </div>
          
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
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
            ) : recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {job.title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {job.job_type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{job.company}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {job.location || (job.is_remote ? 'Remote' : 'Location TBD')}
                  </p>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-lg font-bold text-indigo-600">
                      ${job.hourly_rate_min}-${job.hourly_rate_max}/hr
                    </span>
                    {job.external_url ? (
                      <a
                        href={job.external_url}
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
                        {job.job_type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{job.company}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {job.location || (job.is_remote ? 'Remote' : 'Location TBD')}
                    </p>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-lg font-bold text-indigo-600">
                        ${job.hourly_rate_min}-${job.hourly_rate_max}/hr
                      </span>
                      {job.external_url ? (
                        <a
                          href={job.external_url}
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

          {(recentJobs.length > 0 || loading) && totalJobs > 6 && (
            <div className="mt-8 text-center">
              <Button
                onClick={handleToggleExpanded}
                disabled={loading || loadingMore}
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
        </div>
      </section>

    </div>
  )
}