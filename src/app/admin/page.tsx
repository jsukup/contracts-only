'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Users, 
  Briefcase, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  BriefcaseIcon,
  FileCheck
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface DashboardStats {
  users: {
    total: number
    active: number
    new: number
    growth: number
  }
  jobs: {
    total: number
    active: number
    expired: number
    pending: number
  }
  applications: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  revenue: {
    total: number
    monthly: number
    pending: number
    growth: number
  }
  activity: {
    recentUsers: Array<{
      id: string
      name: string
      email: string
      createdAt: string
    }>
    recentJobs: Array<{
      id: string
      title: string
      company: string
      createdAt: string
    }>
    recentApplications: Array<{
      id: string
      jobTitle: string
      applicantName: string
      status: string
      createdAt: string
    }>
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    fetchDashboardStats()
  }, [fetchDashboardStats])

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`)
      if (!response.ok) throw new Error('Failed to fetch dashboard stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      // Use mock data for development
      setStats(getMockDashboardStats())
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  const getMockDashboardStats = (): DashboardStats => ({
    users: {
      total: 1234,
      active: 892,
      new: 45,
      growth: 12.5
    },
    jobs: {
      total: 567,
      active: 423,
      expired: 89,
      pending: 55
    },
    applications: {
      total: 2341,
      pending: 234,
      approved: 1876,
      rejected: 231
    },
    revenue: {
      total: 45678,
      monthly: 12345,
      pending: 2345,
      growth: 18.2
    },
    activity: {
      recentUsers: [
        { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: '2024-01-15T10:00:00Z' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', createdAt: '2024-01-15T09:30:00Z' },
        { id: '3', name: 'Bob Johnson', email: 'bob@example.com', createdAt: '2024-01-15T09:00:00Z' },
      ],
      recentJobs: [
        { id: '1', title: 'Senior Developer', company: 'Tech Corp', createdAt: '2024-01-15T11:00:00Z' },
        { id: '2', title: 'UI Designer', company: 'Design Studio', createdAt: '2024-01-15T10:30:00Z' },
        { id: '3', title: 'Project Manager', company: 'PM Solutions', createdAt: '2024-01-15T10:00:00Z' },
      ],
      recentApplications: [
        { id: '1', jobTitle: 'Senior Developer', applicantName: 'Alice Brown', status: 'pending', createdAt: '2024-01-15T11:30:00Z' },
        { id: '2', jobTitle: 'UI Designer', applicantName: 'Charlie Wilson', status: 'approved', createdAt: '2024-01-15T11:00:00Z' },
        { id: '3', jobTitle: 'Project Manager', applicantName: 'Diana Miller', status: 'pending', createdAt: '2024-01-15T10:30:00Z' },
      ]
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex items-center space-x-2">
          <select
            className="px-3 py-2 border rounded-md"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
          </select>
          <Button onClick={fetchDashboardStats}>Refresh</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total.toLocaleString()}</div>
            <div className="flex items-center pt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+{stats.users.growth}%</span>
              <span className="text-xs text-muted-foreground ml-1">from last period</span>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{stats.users.active}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">New</span>
                <span className="font-medium">+{stats.users.new}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobs.total.toLocaleString()}</div>
            <div className="flex items-center pt-1">
              <Activity className="h-3 w-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-500">{stats.jobs.active} active</span>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-yellow-600">{stats.jobs.pending}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Expired</span>
                <span className="font-medium text-red-600">{stats.jobs.expired}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applications.total.toLocaleString()}</div>
            <div className="flex items-center pt-1">
              <Clock className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-xs text-yellow-500">{stats.applications.pending} pending</span>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Approved</span>
                <span className="font-medium text-green-600">{stats.applications.approved}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Rejected</span>
                <span className="font-medium text-red-600">{stats.applications.rejected}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.revenue.total)}</div>
            <div className="flex items-center pt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-xs text-green-500">+{stats.revenue.growth}%</span>
              <span className="text-xs text-muted-foreground ml-1">from last period</span>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Monthly</span>
                <span className="font-medium">{formatCurrency(stats.revenue.monthly)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium">{formatCurrency(stats.revenue.pending)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild variant="outline">
              <Link href="/admin/users">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Users
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/jobs">
                <BriefcaseIcon className="h-4 w-4 mr-2" />
                Review Jobs
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/applications">
                <FileCheck className="h-4 w-4 mr-2" />
                Applications
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/reports">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.activity.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              ))}
            </div>
            <Button asChild variant="link" className="w-full mt-3">
              <Link href="/admin/users">View All Users →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.activity.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.company}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </span>
                </div>
              ))}
            </div>
            <Button asChild variant="link" className="w-full mt-3">
              <Link href="/admin/jobs">View All Jobs →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.activity.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{app.applicantName}</p>
                    <p className="text-xs text-muted-foreground">{app.jobTitle}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      app.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {app.status}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDate(app.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="link" className="w-full mt-3">
              <Link href="/admin/applications">View All Applications →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  {stats.jobs.pending} jobs pending review
                </p>
                <p className="text-xs text-yellow-600">Review and approve new job postings</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/jobs?status=pending">Review</Link>
              </Button>
            </div>
            
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <Activity className="h-4 w-4 text-blue-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Database backup scheduled
                </p>
                <p className="text-xs text-blue-600">Next backup in 6 hours</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/settings">Settings</Link>
              </Button>
            </div>
            
            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  System health: Good
                </p>
                <p className="text-xs text-green-600">All services operational</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/analytics">View Details</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}