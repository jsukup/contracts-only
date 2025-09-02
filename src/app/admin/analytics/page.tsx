'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  BarChart3,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Eye,
  Target,
  Activity,
  Globe
} from 'lucide-react'

interface AnalyticsData {
  kpis: {
    totalJobs: number
    totalUsers: number
    averageHourlyRate: number
    totalRevenuePotential: number
    userEngagementScore: number
    marketHealthScore: number
  }
  trends: {
    jobGrowth: string
    userGrowth: string
    applicationGrowth: string
  }
  insights: string[]
}

// interface DetailedAnalytics {
//   jobsByCategory: Array<{ category: string; count: number }>
//   rateDistribution: Array<{ range: string; count: number }>
//   userGrowth: Array<{ date: string; count: number }>
//   skillDistribution: Array<{ skill: string; count: number }>
// }

export default function AnalyticsPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  // const [detailedData, setDetailedData] = useState<DetailedAnalytics>()
  const [selectedView, setSelectedView] = useState<'summary' | 'jobs' | 'users' | 'platform'>('summary')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: selectedView,
        start: dateRange.start,
        end: dateRange.end
      })

      const response = await fetch(`/api/analytics?${params}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')

      const result = await response.json()
      
      setAnalyticsData(result.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedView, dateRange])

  useEffect(() => {
    if (user?.publicMetadata?.role === 'ADMIN') {
      fetchAnalytics()
    }
  }, [user, selectedView, dateRange, fetchAnalytics])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams({
        type: selectedView,
        format,
        start: dateRange.start,
        end: dateRange.end
      })

      const response = await fetch(`/api/analytics/export?${params}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `analytics-${selectedView}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  if (user?.publicMetadata?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to view analytics.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <BarChart3 className="h-8 w-8 mr-3 text-blue-500" />
              Platform Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive insights into platform performance and user behavior
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
              >
                <Download className="h-4 w-4 mr-1" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </div>

        {/* View Selector and Date Range */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Analytics Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* View Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">View:</span>
                <div className="flex space-x-1">
                  {([
                    { key: 'summary', label: 'Executive Summary', icon: Target },
                    { key: 'jobs', label: 'Job Analytics', icon: Briefcase },
                    { key: 'users', label: 'User Analytics', icon: Users },
                    { key: 'platform', label: 'Platform Metrics', icon: Globe }
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant={selectedView === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedView(key)}
                      className="flex items-center"
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-1 border rounded text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-1 border rounded text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : selectedView === 'summary' && analyticsData ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Briefcase className="h-8 w-8 text-blue-500" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold">{analyticsData.kpis.totalJobs.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Total Jobs</p>
                      <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                        {analyticsData.trends.jobGrowth} growth
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold">{analyticsData.kpis.totalUsers.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <Badge className="bg-blue-100 text-blue-800 text-xs mt-1">
                        {analyticsData.trends.userGrowth} growth
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-purple-500" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold">${analyticsData.kpis.averageHourlyRate}</p>
                      <p className="text-sm text-gray-600">Avg Hourly Rate</p>
                      <Badge className="bg-purple-100 text-purple-800 text-xs mt-1">
                        Market Rate
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold">${analyticsData.kpis.totalRevenuePotential.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Revenue Potential</p>
                      <Badge className="bg-orange-100 text-orange-800 text-xs mt-1">
                        Estimated
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-red-500" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold">{analyticsData.kpis.userEngagementScore}%</p>
                      <p className="text-sm text-gray-600">Engagement Score</p>
                      <Badge className={`text-xs mt-1 ${
                        analyticsData.kpis.userEngagementScore >= 70 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {analyticsData.kpis.userEngagementScore >= 70 ? 'Good' : 'Needs Work'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Target className="h-8 w-8 text-indigo-500" />
                    <div className="ml-3">
                      <p className="text-2xl font-bold">{analyticsData.kpis.marketHealthScore}%</p>
                      <p className="text-sm text-gray-600">Market Health</p>
                      <Badge className={`text-xs mt-1 ${
                        analyticsData.kpis.marketHealthScore >= 75 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {analyticsData.kpis.marketHealthScore >= 75 ? 'Healthy' : 'Monitor'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analyticsData.insights.map((insight, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                      <div className="bg-blue-100 p-1 rounded-full flex-shrink-0 mt-0.5">
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                      </div>
                      <p className="text-sm text-blue-800">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Detailed Analytics View
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedView === 'jobs' ? 'Job posting and application analytics' :
                 selectedView === 'users' ? 'User registration and engagement metrics' :
                 'Platform-wide performance metrics'}
              </p>
              <p className="text-sm text-gray-500">
                This detailed view is available in the full analytics dashboard
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}