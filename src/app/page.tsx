import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase"
import type { SupabaseJob } from "@/lib/supabase"

export default async function HomePage() {
  const supabase = createServerSupabaseClient()
  
  let recentJobs: SupabaseJob[] = []
  let totalJobs: number = 0
  
  // Get recent jobs from database with error handling
  try {
    const [jobsResult, countResult] = await Promise.all([
      supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
    ])

    recentJobs = jobsResult.data || []
    totalJobs = countResult.count || 0
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
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/jobs"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Browse Jobs
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  href="/jobs/post"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Post a Job
                </Link>
              </div>
            </div>
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
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-3xl font-bold text-indigo-600">{totalJobs}</div>
                <div className="text-sm text-gray-500">Active Jobs</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-3xl font-bold text-indigo-600">10K+</div>
                <div className="text-sm text-gray-500">Registered Users</div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-3xl font-bold text-indigo-600">500+</div>
                <div className="text-sm text-gray-500">Companies</div>
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
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => (
                <div key={job.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
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
                      ${job.hourly_rate_min}-${job.hourly_rate_max}/{job.currency === 'USD' ? 'hr' : job.currency}
                    </span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No jobs available at the moment. Check back soon!</p>
              </div>
            )}
          </div>

          {recentJobs.length > 0 && (
            <div className="mt-8 text-center">
              <Link
                href="/jobs"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
              >
                View All Jobs
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-indigo-200">Join ContractsOnly today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
              >
                Sign Up
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                href="/jobs/post"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-500 hover:bg-indigo-400"
              >
                Post a Job
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}