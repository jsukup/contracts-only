'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Clock, MapPin, DollarSign, Building } from 'lucide-react'

interface JobApplication {
  id: string
  jobId: string
  userId: string
  status: 'PENDING' | 'VIEWED' | 'REJECTED' | 'ACCEPTED'
  appliedAt: Date
  job: {
    id: string
    title: string
    company: string
    location: string | null
    isRemote: boolean
    hourlyRateMin: number
    hourlyRateMax: number
    currency: string
    postedBy: {
      name: string | null
      email: string
    }
  }
}

interface ApplicationsListProps {
  type?: 'sent' | 'received'
  status?: 'PENDING' | 'VIEWED' | 'REJECTED' | 'ACCEPTED'
  limit?: number
}

export default function ApplicationsList({ 
  type = 'sent', 
  status, 
  limit = 10 
}: ApplicationsListProps) {
  const { user } = useAuth()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.email) return

    const fetchApplications = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          type,
          ...(status && { status }),
          limit: limit.toString()
        })

        const response = await fetch(`/api/applications?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch applications')
        }

        const data = await response.json()
        setApplications(data.applications || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [user, type, status, limit])

  const getStatusBadgeVariant = (status: JobApplication['status']) => {
    switch (status) {
      case 'PENDING': return 'default'
      case 'VIEWED': return 'secondary'
      case 'ACCEPTED': return 'default' // Would be 'success' if available
      case 'REJECTED': return 'destructive'
      default: return 'default'
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatRate = (min: number, max: number, currency: string) => {
    return `${currency} ${min}-${max}/hr`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 mb-2">
            {type === 'sent' ? 'No applications sent yet' : 'No applications received yet'}
          </p>
          <p className="text-sm text-gray-400">
            {type === 'sent' 
              ? 'Start applying to jobs to see your applications here'
              : 'Applications for your job postings will appear here'
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <Card key={application.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {application.job.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {application.job.company}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {application.job.isRemote ? 'Remote' : application.job.location || 'Location TBD'}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatRate(
                      application.job.hourlyRateMin,
                      application.job.hourlyRateMax,
                      application.job.currency
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Applied {formatDate(application.appliedAt)}
                  {type === 'received' && (
                    <span className="ml-2">
                      by {application.job.postedBy.name || application.job.postedBy.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={getStatusBadgeVariant(application.status)}>
                  {application.status.toLowerCase()}
                </Badge>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {applications.length >= limit && (
        <Card>
          <CardContent className="p-4 text-center">
            <Button variant="outline">
              Load More Applications
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}