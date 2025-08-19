'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  Calendar, 
  Users,
  Bookmark,
  Share,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface MobileJobCardProps {
  job: {
    id: string
    title: string
    company: string
    location?: string
    isRemote: boolean
    hourlyRateMin: number
    hourlyRateMax: number
    currency: string
    jobType: string
    contractDuration?: string
    description: string
    createdAt: string
    skills: string[]
    applicationCount: number
  }
  onSave?: () => void
  onShare?: () => void
  isSaved?: boolean
}

export function MobileJobCard({ 
  job, 
  onSave, 
  onShare, 
  isSaved = false 
}: MobileJobCardProps) {
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just posted'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}w ago`
  }

  return (
    <Card className="w-full mb-4 shadow-sm border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight mb-1 pr-2">
              <Link 
                href={`/jobs/${job.id}`}
                className="text-gray-900 hover:text-blue-600 transition-colors"
              >
                {job.title}
              </Link>
            </h3>
            <p className="text-sm text-gray-600 font-medium">{job.company}</p>
            <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(job.createdAt)}</p>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-1 ml-2">
            <button
              onClick={onSave}
              className={`p-2 rounded-full transition-colors ${
                isSaved 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Bookmark className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onShare}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Share className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Key details */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
          <div className="flex items-center text-gray-600">
            <DollarSign className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {job.currency} {job.hourlyRateMin}-{job.hourlyRateMax}/hr
            </span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {job.isRemote ? 'Remote' : job.location || 'Location not specified'}
            </span>
          </div>
          
          {job.contractDuration && (
            <div className="flex items-center text-gray-600">
              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{job.contractDuration}</span>
            </div>
          )}
          
          <div className="flex items-center text-gray-600">
            <Users className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{job.applicationCount} applied</span>
          </div>
        </div>

        {/* Job type badge */}
        <div className="mb-3">
          <Badge variant="secondary" className="text-xs">
            {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {job.description}
        </p>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {job.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs px-2 py-0.5">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{job.skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className="flex-1"
            asChild
          >
            <Link href={`/jobs/${job.id}`}>
              View Details
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="px-3"
            asChild
          >
            <Link href={`/jobs/${job.id}/apply`}>
              Apply
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton loader for mobile job cards
export function MobileJobCardSkeleton() {
  return (
    <Card className="w-full mb-4 shadow-sm">
      <CardContent className="p-4">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
              <div className="h-2 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="flex space-x-1 ml-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            </div>
          </div>

          {/* Details skeleton */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>

          {/* Badge skeleton */}
          <div className="h-5 bg-gray-200 rounded w-16 mb-3"></div>

          {/* Description skeleton */}
          <div className="space-y-2 mb-3">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>

          {/* Skills skeleton */}
          <div className="flex space-x-1 mb-4">
            <div className="h-5 bg-gray-200 rounded w-12"></div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
            <div className="h-5 bg-gray-200 rounded w-14"></div>
          </div>

          {/* Actions skeleton */}
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-200 rounded flex-1"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}