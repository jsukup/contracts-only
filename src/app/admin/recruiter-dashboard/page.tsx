'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  BarChart3,
  Users,
  Target,
  Download,
  RefreshCw,
  Award,
  MapPin,
  Activity
} from 'lucide-react'
import { RecruiterAnalytics } from '@/lib/analytics'

interface RecruiterDashboardData extends RecruiterAnalytics {
  summary: {
    headline: string
    keyMetrics: Array<{
      label: string
      value: string
      trend: string
    }>
    valueProposition: string[]
  }
  reportMetadata: {
    generatedAt: string
    dateRange: string
    reportVersion: string
  }
}

export default function RecruiterDashboard() {
  const { user } = useUser() // User authentication
  const [data, setData] = useState<RecruiterDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<string>('30days')

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      
      let url = '/api/analytics/recruiter'
      if (dateRange !== 'all') {
        const days = dateRange === '30days' ? 30 : dateRange === '7days' ? 7 : 90
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        
        url += `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Failed to fetch recruiter analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const exportCSV = async () => {
    try {
      let url = '/api/analytics/recruiter?format=csv'
      if (dateRange !== 'all') {
        const days = dateRange === '30days' ? 30 : dateRange === '7days' ? 7 : 90
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        
        url += `&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      }

      const response = await fetch(url)
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `recruiter-analytics-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(downloadUrl)
      }
    } catch (error) {
      console.error('Failed to export CSV:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Recruiter Value Dashboard</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Recruiter Value Dashboard</h1>
          <p className="text-gray-600 mb-4">Unable to load analytics data</p>
          <Button onClick={fetchAnalytics}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruiter Value Dashboard</h1>
          <p className="text-gray-600 mt-1">{data.summary.headline}</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.summary.keyMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <p className="text-sm text-green-600 mt-1">{metric.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Reach */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Platform Reach & Contractor Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {data.platformReach.totalActiveContractors.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Total Active Contractors</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {data.platformReach.monthlyActiveContractors.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Monthly Active Users</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {data.platformReach.contractorsInTargetSkills.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Skilled Contractors</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">
                {data.platformReach.averageProfileCompletionRate}%
              </div>
              <p className="text-sm text-gray-600">Profile Completion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Volume */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Application Volume & Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {data.applicationVolume.totalMonthlyApplications.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Monthly Applications</p>
              <div className="mt-2">
                <Badge variant="secondary">
                  +{data.applicationVolume.applicationGrowthRate}% growth
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                {data.applicationVolume.averageApplicationsPerJob}
              </div>
              <p className="text-sm text-gray-600">Avg Applications per Job</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Application Sources:</p>
              {data.applicationVolume.topApplicationSources.map((source, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{source.source}</span>
                  <span className="text-sm font-medium">{source.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contractor Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Contractor Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Experience</span>
                <span className="font-bold text-lg">
                  {data.contractorQuality.averageExperienceYears} years
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Skill Certification Rate</span>
                <span className="font-bold text-lg">
                  {data.contractorQuality.skillCertificationRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Hourly Rate</span>
                <span className="font-bold text-lg">
                  ${data.contractorQuality.averageHourlyRate}/hr
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Rating Distribution:</p>
                {data.contractorQuality.contractorRatings.map((rating, index) => (
                  <div key={index} className="flex justify-between items-center mb-1">
                    <span className="text-sm">{rating.rating}★</span>
                    <span className="text-sm">{rating.count.toLocaleString()} contractors</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Conversion Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">View-to-Application Rate</span>
                <span className="font-bold text-lg text-blue-600">
                  {Math.round(data.conversionMetrics.jobViewToApplicationRate * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Application-to-Hire Rate</span>
                <span className="font-bold text-lg text-green-600">
                  {Math.round(data.conversionMetrics.applicationToHireRate * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Time to Hire</span>
                <span className="font-bold text-lg">
                  {data.conversionMetrics.averageTimeToHire} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Recruiter Satisfaction</span>
                <span className="font-bold text-lg text-purple-600">
                  {data.conversionMetrics.recruiterSatisfactionScore}/5.0
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Skills in Demand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Skills in Demand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.marketIntelligence.demandBySkill.slice(0, 10).map((skill, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-lg text-blue-600">{skill.demandScore}%</div>
                <div className="text-sm text-gray-700">{skill.skill}</div>
                <div className="text-xs text-gray-500">${Math.round(skill.avgRate)}/hr</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Location Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.marketIntelligence.locationTrends.map((location, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{location.location}</div>
                  <div className="text-sm text-gray-600">
                    {location.contractorCount.toLocaleString()} contractors
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">${location.avgRate}/hr</div>
                  <div className="text-xs text-gray-500">avg rate</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Value Proposition Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">ContractsOnly Value Proposition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.summary.valueProposition.map((point, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                <p className="text-blue-800">{point}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600">
              Report generated on {new Date(data.reportMetadata.generatedAt).toLocaleString()} • 
              Data range: {data.reportMetadata.dateRange} • 
              Version {data.reportMetadata.reportVersion}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}