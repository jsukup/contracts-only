'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Loader2, ArrowLeft, Calendar, DollarSign, MapPin, Clock, User, Building } from 'lucide-react'
import Link from 'next/link'

interface ApplicationDetails {
  id: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  appliedAt: string
  coverLetter?: string
  expectedRate?: number
  availableStartDate?: string
  job: {
    id: string
    title: string
    company: string
    description: string
    location?: string
    isRemote: boolean
    jobType: string
    hourlyRateMin: number
    hourlyRateMax: number
    currency: string
    contractDuration?: string
    hoursPerWeek?: number
    requirements: string
    benefits?: string
    createdAt: string
    jobSkills: Array<{
      skill: {
        name: string
      }
    }>
  }
  employer?: {
    id: string
    name: string
    email: string
  }
}

export default function ApplicationDetailsPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const applicationId = params.applicationId as string
  
  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => {
    if (applicationId && user) {
      fetchApplicationDetails()
    }
  }, [applicationId, user])

  const fetchApplicationDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}`)
      if (response.ok) {
        const data = await response.json()
        setApplication(data)
      } else {
        console.error('Failed to fetch application details')
      }
    } catch (error) {
      console.error('Error fetching application details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawApplication = async () => {
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return
    }

    setWithdrawing(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'withdrawn' })
      })

      if (response.ok) {
        setApplication(prev => prev ? { ...prev, status: 'withdrawn' } : null)
      } else {
        alert('Failed to withdraw application. Please try again.')
      }
    } catch (error) {
      console.error('Error withdrawing application:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted': return 'success'
      case 'rejected': return 'destructive'
      case 'withdrawn': return 'secondary'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Under Review'
      case 'accepted': return 'Accepted'
      case 'rejected': return 'Not Selected'
      case 'withdrawn': return 'Withdrawn'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-lg font-medium mb-2">Application Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The application you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Application Details</h1>
          <p className="text-muted-foreground">
            Applied {new Date(application.appliedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(application.status)} className="text-sm">
          {getStatusLabel(application.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Job Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{application.job.title}</h2>
                <p className="text-muted-foreground">{application.job.company}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {application.job.currency} {application.job.hourlyRateMin}-{application.job.hourlyRateMax}/hour
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {application.job.isRemote ? 'Remote' : application.job.location || 'Location not specified'}
                  </span>
                </div>

                {application.job.contractDuration && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{application.job.contractDuration}</span>
                  </div>
                )}

                {application.job.hoursPerWeek && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{application.job.hoursPerWeek} hours/week</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Job Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application.job.description}
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Requirements</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {application.job.requirements}
                </p>
              </div>

              {application.job.benefits && (
                <div>
                  <h3 className="font-medium mb-2">Benefits</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {application.job.benefits}
                  </p>
                </div>
              )}

              {application.job.jobSkills.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {application.job.jobSkills.map((jobSkill, index) => (
                      <Badge key={index} variant="outline">
                        {jobSkill.skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Application Details Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Your Application</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.coverLetter && (
                <div>
                  <h3 className="font-medium mb-2">Cover Letter</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {application.coverLetter}
                  </p>
                </div>
              )}

              {application.expectedRate && (
                <div>
                  <h3 className="font-medium mb-2">Expected Rate</h3>
                  <p className="text-sm text-muted-foreground">
                    {application.job.currency} {application.expectedRate}/hour
                  </p>
                </div>
              )}

              {application.availableStartDate && (
                <div>
                  <h3 className="font-medium mb-2">Available Start Date</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(application.availableStartDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {application.status === 'pending' && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleWithdrawApplication}
                  disabled={withdrawing}
                >
                  {withdrawing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Withdrawing...
                    </>
                  ) : (
                    'Withdraw Application'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Contact Info */}
          {application.employer && application.status === 'accepted' && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium">{application.employer.name}</p>
                    <p className="text-sm text-muted-foreground">{application.employer.email}</p>
                  </div>
                  <p className="text-sm text-green-600">
                    Your application has been accepted! You can now contact the employer directly.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}