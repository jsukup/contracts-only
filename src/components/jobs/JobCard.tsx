'use client'

import { useState } from 'react'
import { Clock, MapPin, DollarSign, Users, Calendar, Building, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface JobCardProps {
  job: {
    id: string
    title: string
    description?: string
    company: string
    location?: string
    isRemote: boolean
    jobType: string
    hourlyRateMin: number | null
    hourlyRateMax: number | null
    currency: string
    contractDuration?: string
    hoursPerWeek?: number
    createdAt: string
    externalUrl?: string
    clickTrackingEnabled?: boolean
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
  showActions?: boolean
}

export function JobCard({ job, showActions = true }: JobCardProps) {
  const [expanded, setExpanded] = useState(false)
  const formatRate = (min: number, max: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency
    return `${symbol}${min}-${symbol}${max}/hr`
  }

  const formatDate = (date: string) => {
    const daysAgo = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (daysAgo === 0) return 'Today'
    if (daysAgo === 1) return 'Yesterday'
    if (daysAgo < 7) return `${daysAgo} days ago`
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`
    return `${Math.floor(daysAgo / 30)} months ago`
  }

  const getJobTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'CONTRACT':
        return 'default'
      case 'FREELANCE':
        return 'secondary'
      case 'PART_TIME':
        return 'outline'
      case 'TEMPORARY':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <Card 
      className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]" 
      data-job-id={job.id}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">
              <Link 
                href={`/jobs/${job.id}`} 
                className="hover:text-primary"
                data-track="view-job"
                data-job-title
              >
                {job.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1" data-job-company>
                <Building className="h-4 w-4" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.isRemote ? 'Remote' : job.location || 'Not specified'}
              </span>
            </CardDescription>
          </div>
          <Badge variant={getJobTypeBadgeVariant(job.jobType || 'CONTRACT')}>
            {(job.jobType || 'CONTRACT').replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {job.hourlyRateMin && job.hourlyRateMax && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium" data-job-rate>
                {formatRate(job.hourlyRateMin, job.hourlyRateMax, job.currency)}
              </span>
            </div>
          )}
          
          {job.contractDuration && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{job.contractDuration}</span>
            </div>
          )}
          
          {job.hoursPerWeek && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{job.hoursPerWeek} hrs/week</span>
            </div>
          )}
          
          {job._count && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{job._count.applications} applicants</span>
            </div>
          )}
        </div>

        {job.jobSkills && job.jobSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.jobSkills.slice(0, 5).map((jobSkill) => (
              <Badge key={jobSkill.skill.id} variant="secondary">
                {jobSkill.skill.name}
              </Badge>
            ))}
            {job.jobSkills.length > 5 && (
              <Badge variant="outline">+{job.jobSkills.length - 5} more</Badge>
            )}
          </div>
        )}

        {/* Expandable Description Section */}
        {expanded && job.description && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-sm text-gray-900 mb-2">Job Description</h4>
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {job.description.substring(0, 1500)}
              {job.description.length > 1500 && '...'}
            </div>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            Posted {formatDate(job.createdAt)}
          </span>
          <div className="flex gap-2">
            {job.description && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show More
                  </>
                )}
              </Button>
            )}
            {job.externalUrl ? (
              <Button size="sm" asChild>
                <a 
                  href={job.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="apply-external-job"
                >
                  Apply on Indeed
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link 
                  href={`/jobs/${job.id}/apply`} 
                  data-track="apply-job"
                >
                  Apply Now
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}