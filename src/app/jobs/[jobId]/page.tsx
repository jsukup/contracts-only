'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Calendar, 
  Building, 
  ExternalLink,
  Mail,
  User,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  description: string
  company: string
  location?: string
  isRemote: boolean
  jobType: string
  hourlyRateMin: number
  hourlyRateMax: number
  currency: string
  contractDuration?: string
  hoursPerWeek?: number
  startDate?: string
  applicationUrl?: string
  applicationEmail?: string
  createdAt: string
  expiresAt: string
  isActive: boolean
  externalUrl?: string
  clickTrackingEnabled?: boolean
  postedBy: {
    id: string
    name: string
    email: string
    image?: string
    title?: string
    bio?: string
  }
  jobSkills?: Array<{
    skill: {
      id: string
      name: string
    }
  }>
  _count?: {
    applications: number
  }
}

export default function JobDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [trackingClick, setTrackingClick] = useState(false)

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.jobId}`)
      if (!response.ok) throw new Error('Job not found')
      
      const jobData = await response.json()
      setJob(jobData)
    } catch (error) {
      console.error('Error fetching job:', error)
      router.push('/jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleExternalLinkClick = async (externalUrl: string) => {
    try {
      setTrackingClick(true)
      
      // Track the click if tracking is enabled for this job
      if (job?.clickTrackingEnabled) {
        await fetch(`/api/jobs/${params.jobId}/track-click`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            externalUrl,
            referrerUrl: window.location.href,
          }),
        })
      }
      
      // Redirect to external URL
      window.open(externalUrl, '_blank')
    } catch (error) {
      console.error('Error tracking click:', error)
      // Still redirect even if tracking fails
      window.open(externalUrl, '_blank')
    } finally {
      setTrackingClick(false)
    }
  }

  const handleApply = async () => {
    if (!user) {
      router.push('/sign-in')
      return
    }

    setApplying(true)
    try {
      const response = await fetch(`/api/jobs/${params.jobId}/apply`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to apply')
      }

      const result = await response.json()
      setHasApplied(true)

      // If there's a redirect URL, open it in a new tab
      if (result.redirectUrl) {
        window.open(result.redirectUrl, '_blank')
      }

      alert(result.message || 'Application submitted successfully!')
    } catch (error: unknown) {
      console.error('Error applying:', error)
      alert(error instanceof Error ? error.message : 'Failed to submit application')
    } finally {
      setApplying(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job posting?')) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${params.jobId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete job')

      alert('Job deleted successfully')
      router.push('/jobs')
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job')
    }
  }

  useEffect(() => {
    fetchJob()
  }, [params.jobId])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Job not found</p>
            <Button asChild className="mt-4">
              <Link href="/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatRate = (min: number, max: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency
    return `${symbol}${min}-${symbol}${max}/hr`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isOwner = user?.email === job.postedBy.email
  const isExpired = new Date(job.expiresAt) < new Date()
  const canApply = user && !isOwner && !hasApplied && !isExpired && job.isActive

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 text-base">
                  <span className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {job.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {job.isRemote ? 'Remote' : job.location || 'Not specified'}
                  </span>
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Badge variant="default">
                  {(job.jobType || 'CONTRACT').replace('_', ' ')}
                </Badge>
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
                {!job.isActive && (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/jobs/${job.id}/edit`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {formatRate(job.hourlyRateMin, job.hourlyRateMax, job.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">Hourly Rate</p>
                </div>
              </div>
              
              {job.contractDuration && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{job.contractDuration}</p>
                    <p className="text-sm text-muted-foreground">Duration</p>
                  </div>
                </div>
              )}
              
              {job.hoursPerWeek && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{job.hoursPerWeek} hrs/week</p>
                    <p className="text-sm text-muted-foreground">Commitment</p>
                  </div>
                </div>
              )}
              
              {job._count && (
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{job._count.applications}</p>
                    <p className="text-sm text-muted-foreground">Applicants</p>
                  </div>
                </div>
              )}
            </div>

            {job.jobSkills && job.jobSkills.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.jobSkills.map((jobSkill) => (
                    <Badge key={jobSkill.skill.id} variant="secondary">
                      {jobSkill.skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {job.description.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Application & Contact */}
        <Card>
          <CardHeader>
            <CardTitle>How to Apply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canApply && (
              <Button 
                onClick={handleApply} 
                disabled={applying}
                className="w-full"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply for this Job'
                )}
              </Button>
            )}

            {hasApplied && (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">
                  ✓ You have applied for this job
                </p>
              </div>
            )}

            {!user && (
              <Button asChild className="w-full">
                <Link href="/sign-in">Sign in to Apply</Link>
              </Button>
            )}

            <div className="space-y-2">
              {job.externalUrl && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleExternalLinkClick(job.externalUrl!)}
                  disabled={trackingClick}
                >
                  {trackingClick ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Apply on Company Website
                    </>
                  )}
                </Button>
              )}

              {job.applicationUrl && !job.externalUrl && (
                <Button variant="outline" className="w-full" asChild>
                  <a 
                    href={job.applicationUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apply on Company Website
                  </a>
                </Button>
              )}

              {job.applicationEmail && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={`mailto:${job.applicationEmail}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email Application ({job.applicationEmail})
                  </a>
                </Button>
              )}
              
              {job.externalUrl && job.clickTrackingEnabled && (
                <p className="text-xs text-gray-500 text-center">
                  📊 This employer tracks link clicks to measure job posting performance
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posted By */}
        <Card>
          <CardHeader>
            <CardTitle>Posted By</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-medium">{job.postedBy.name}</h3>
                {job.postedBy.title && (
                  <p className="text-sm text-muted-foreground">
                    {job.postedBy.title}
                  </p>
                )}
                {job.postedBy.bio && (
                  <p className="text-sm mt-2">{job.postedBy.bio}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Posted on {formatDate(job.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}