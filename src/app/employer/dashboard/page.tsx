'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Briefcase, 
  Users, 
  Eye, 
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Loader2,
  MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface JobPosting {
  id: string
  title: string
  company: string
  location?: string
  isRemote: boolean
  hourlyRateMin: number
  hourlyRateMax: number
  currency: string
  status: 'active' | 'draft' | 'closed'
  createdAt: string
  _count: {
    applications: number
  }
}

interface DashboardStats {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  viewsThisMonth: number
}

export default function EmployerDashboardPage() {
  const { user } = useUser()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'closed'>('all')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!user) {
      redirect('/sign-in?callbackUrl=/employer/dashboard')
    }
  }, [user])

  useEffect(() => {
    // Cancel any pending requests when component unmounts or dependencies change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (user?.id) {
      fetchDashboardData()
    }

    // Cleanup function to cancel requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [user, filter])

  const fetchDashboardData = async () => {
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setLoading(true)
    try {
      // Fetch job postings
      const jobsParams = new URLSearchParams()
      if (filter !== 'all') jobsParams.append('status', filter)
      
      const jobsResponse = await fetch(`/api/jobs/employer?${jobsParams}`, { signal })
      if (jobsResponse.ok && !signal.aborted) {
        const jobsData = await jobsResponse.json()
        setJobs(jobsData.jobs || [])
      }

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/jobs/employer/stats', { signal })
      if (statsResponse.ok && !signal.aborted) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name !== 'AbortError') {
        console.error('Error fetching dashboard data:', error)
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }

  const handleJobStatusChange = async (jobId: string, newStatus: 'active' | 'closed') => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setJobs(prevJobs =>
          prevJobs.map(job =>
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        )
      }
    } catch (error) {
      console.error('Error updating job status:', error)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId))
      }
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'closed': return 'secondary'
      case 'draft': return 'outline'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'closed': return 'Closed'
      case 'draft': return 'Draft'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredJobs = jobs.filter(job => filter === 'all' || job.status === filter)

  if (!user || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Employer Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your job postings and applications
            </p>
          </div>
          <Button asChild>
            <Link href="/jobs/post">
              <Plus className="h-4 w-4 mr-2" />
              Post New Job
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">{stats.totalJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                    <p className="text-2xl font-bold">{stats.activeJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Applications</p>
                    <p className="text-2xl font-bold">{stats.totalApplications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Views This Month</p>
                    <p className="text-2xl font-bold">{stats.viewsThisMonth}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Job Listings */}
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Your Job Postings</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({jobs.length})
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Active ({jobs.filter(j => j.status === 'active').length})
              </Button>
              <Button
                variant={filter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('draft')}
              >
                Draft ({jobs.filter(j => j.status === 'draft').length})
              </Button>
              <Button
                variant={filter === 'closed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('closed')}
              >
                Closed ({jobs.filter(j => j.status === 'closed').length})
              </Button>
            </div>
          </div>

          {/* Job Cards */}
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {filter === 'all' ? 'No job postings yet' : `No ${filter} jobs`}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {filter === 'all' 
                    ? 'Create your first job posting to start finding contractors'
                    : `You don't have any ${filter} job postings at the moment`
                  }
                </p>
                {filter === 'all' && (
                  <Button asChild>
                    <Link href="/jobs/post">Post Your First Job</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            <Link 
                              href={`/jobs/${job.id}`}
                              className="hover:text-blue-600 transition-colors"
                            >
                              {job.title}
                            </Link>
                          </h3>
                          <Badge variant={getStatusBadgeVariant(job.status)}>
                            {getStatusLabel(job.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{job.currency} {job.hourlyRateMin}-{job.hourlyRateMax}/hour</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{job._count.applications} applications</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Posted {formatDate(job.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{job.isRemote ? 'Remote' : job.location}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/employer/jobs/${job.id}/applications`}>
                            View Applications ({job._count.applications})
                          </Link>
                        </Button>
                        
                        <div className="relative group">
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          
                          <div className="absolute right-0 mt-2 w-48 bg-background border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div className="py-1">
                              <Link
                                href={`/jobs/${job.id}/edit`}
                                className="flex items-center px-4 py-2 text-sm hover:bg-muted transition-colors"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Job
                              </Link>
                              
                              {job.status === 'active' ? (
                                <button
                                  onClick={() => handleJobStatusChange(job.id, 'closed')}
                                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
                                >
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  Close Job
                                </button>
                              ) : job.status === 'closed' ? (
                                <button
                                  onClick={() => handleJobStatusChange(job.id, 'active')}
                                  className="flex items-center w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
                                >
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  Reopen Job
                                </button>
                              ) : null}
                              
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Job
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}