import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase"
import type { SupabaseJob } from "@/lib/supabase"
import { ExpandableJobsList } from "@/components/jobs/ExpandableJobsList"

export default async function HomePage() {
  const supabase = createServerSupabaseClient()
  
  let recentJobs: any[] = []
  let totalJobs: number = 0
  
  // Get recent jobs from database with error handling
  try {
    // First get the count
    const { count, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    
    if (countError) {
      console.error('Error fetching job count:', countError)
    } else {
      totalJobs = count || 0
      console.log('Total active jobs found:', totalJobs)
    }

    // Then get recent jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)

    if (jobsError) {
      console.error('Error fetching recent jobs:', jobsError)
    } else {
      // Transform database fields to match client interface
      recentJobs = (jobs || []).map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.is_remote,
        jobType: job.job_type,
        hourlyRateMin: job.hourly_rate_min,
        hourlyRateMax: job.hourly_rate_max,
        externalUrl: job.external_url
      }))
      console.log('Recent jobs found:', recentJobs.length)
    }
  } catch (error) {
    console.error('Database connection error:', error)
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
          
          {/* Use the expandable jobs list component */}
          <ExpandableJobsList 
            initialJobs={recentJobs} 
            totalJobs={totalJobs} 
          />
        </div>
      </section>

    </div>
  )
}