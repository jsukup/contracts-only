import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "../../lib/auth"
import { prisma } from "../../lib/prisma"

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  
  // Get recent jobs from database
  const recentJobs = await prisma.job.findMany({
    where: {
      isActive: true,
      expiresAt: {
        gte: new Date()
      }
    },
    include: {
      jobSkills: {
        include: {
          skill: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 6
  })

  const totalJobs = await prisma.job.count({
    where: {
      isActive: true,
      expiresAt: {
        gte: new Date()
      }
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600">
                ContractsOnly
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/jobs" className="text-gray-700 hover:text-indigo-600">
                Browse Jobs
              </Link>
              {session ? (
                <>
                  <Link href="/jobs/new" className="text-gray-700 hover:text-indigo-600">
                    Post a Job
                  </Link>
                  <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600">
                    Dashboard
                  </Link>
                  <Link href="/api/auth/signout" className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300">
                    Sign Out
                  </Link>
                </>
              ) : (
                <Link href="/auth/signin" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Find Your Next <span className="text-indigo-600">Contract</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              The premier job board for contract and freelance opportunities with transparent hourly rates
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/jobs"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Browse {totalJobs} Jobs
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  href={session ? "/jobs/new" : "/auth/signin"}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Post a Job
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Why ContractsOnly</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Built for the Contract Economy
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white rounded-lg shadow px-6 py-8">
                <h3 className="text-lg font-medium text-gray-900">Transparent Rates</h3>
                <p className="mt-2 text-base text-gray-500">
                  All jobs show hourly rates upfront. No more guessing or wasted applications.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow px-6 py-8">
                <h3 className="text-lg font-medium text-gray-900">Contract-Focused</h3>
                <p className="mt-2 text-base text-gray-500">
                  Exclusively for contract, freelance, and temporary positions. No full-time noise.
                </p>
              </div>
              <div className="bg-white rounded-lg shadow px-6 py-8">
                <h3 className="text-lg font-medium text-gray-900">Quick Connections</h3>
                <p className="mt-2 text-base text-gray-500">
                  Connect directly with hiring managers. Apply with one click.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Recent Opportunities</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentJobs.map((job: any) => (
                <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-gray-600 mt-1">{job.company}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    {job.location} {job.isRemote && "• Remote"}
                  </div>
                  <div className="mt-3 text-lg font-semibold text-indigo-600">
                    ${job.hourlyRateMin}-${job.hourlyRateMax}/hr
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.jobSkills.slice(0, 3).map((js: any) => (
                      <span key={js.id} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {js.skill.name}
                      </span>
                    ))}
                  </div>
                  <Link 
                    href={`/jobs/${job.id}`}
                    className="mt-4 block text-center bg-indigo-50 text-indigo-600 py-2 rounded hover:bg-indigo-100"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/jobs" className="text-indigo-600 hover:text-indigo-500 font-medium">
                View all jobs →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-400">
            © 2025 ContractsOnly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
