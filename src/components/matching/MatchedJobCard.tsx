'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Star,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Heart,
  Share2
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface MatchedJob {
  id: string
  title: string
  company: string
  location: string
  hourlyRateMin: number
  hourlyRateMax: number
  contractDuration: string
  postedAt: Date
  applicationsCount: number
}

interface MatchScore {
  userId: string
  jobId: string
  overallScore: number
  skillsScore: number
  rateScore: number
  locationScore: number
  preferenceScore: number
  availabilityScore: number
  competitionScore: number
  profileScore: number
  reasonsMatched: string[]
  reasonsNotMatched: string[]
  confidence: 'low' | 'medium' | 'high'
  job: MatchedJob
}

interface MatchedJobCardProps {
  match: MatchScore
  onSave?: (jobId: string) => void
  onShare?: (jobId: string) => void
  onDismiss?: (jobId: string) => void
}

export function MatchedJobCard({ match, onSave, onShare, onDismiss }: MatchedJobCardProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const handleSave = () => {
    setIsSaved(!isSaved)
    onSave?.(match.jobId)
  }

  const handleShare = () => {
    onShare?.(match.jobId)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.(match.jobId)
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just posted'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800">High Match</Badge>
      case 'medium':
        return <Badge variant="secondary">Good Match</Badge>
      default:
        return <Badge variant="outline">Potential Match</Badge>
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    return 'text-gray-600'
  }

  if (isDismissed) {
    return null
  }

  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{match.job.title}</h3>
              {getConfidenceBadge(match.confidence)}
            </div>
            
            <div className="flex items-center text-gray-600 text-sm space-x-4">
              <span className="font-medium">{match.job.company}</span>
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {match.job.location}
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(match.job.postedAt)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`text-2xl font-bold ${getScoreColor(match.overallScore)}`}>
              {match.overallScore}%
            </div>
            <TrendingUp className={`h-5 w-5 ${getScoreColor(match.overallScore)}`} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Job Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-500 mr-2" />
            <span className="font-medium">
              ${match.job.hourlyRateMin}-${match.job.hourlyRateMax}/hr
            </span>
          </div>
          
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-gray-500 mr-2" />
            <span>{match.job.contractDuration}</span>
          </div>
          
          <div className="flex items-center">
            <Star className="h-4 w-4 text-gray-500 mr-2" />
            <span>{match.job.applicationsCount} applicants</span>
          </div>
        </div>

        {/* Match Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Match Breakdown:</span>
            <span className="text-gray-500">Individual Scores</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Skills:</span>
              <span className={`font-medium ${getScoreColor(match.skillsScore)}`}>
                {match.skillsScore}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Rate:</span>
              <span className={`font-medium ${getScoreColor(match.rateScore)}`}>
                {match.rateScore}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className={`font-medium ${getScoreColor(match.locationScore)}`}>
                {match.locationScore}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Preference:</span>
              <span className={`font-medium ${getScoreColor(match.preferenceScore)}`}>
                {match.preferenceScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Match Reasons */}
        {match.reasonsMatched.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Why this matches:</div>
            <div className="flex flex-wrap gap-2">
              {match.reasonsMatched.map((reason, index) => (
                <div key={index} className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Areas of Concern */}
        {match.reasonsNotMatched.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Consider:</div>
            <div className="flex flex-wrap gap-2">
              {match.reasonsNotMatched.map((reason, index) => (
                <div key={index} className="flex items-center bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={isSaved ? 'text-red-600' : 'text-gray-600'}
            >
              <Heart className={`h-4 w-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-gray-400">
              Dismiss
            </Button>
          </div>
          
          <div className="space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/jobs/${match.jobId}`}>
                View Details
              </Link>
            </Button>
            
            <Button size="sm" asChild>
              <Link href={`/jobs/${match.jobId}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Apply Now
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}