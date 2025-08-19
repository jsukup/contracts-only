'use client'

import { Star, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

interface ReviewCardProps {
  review: {
    id: string
    rating: number
    comment: string
    createdAt: string
    contractor?: {
      id: string
      name: string
      email: string
    }
    employer?: {
      id: string
      name: string
      email: string
    }
    job: {
      id: string
      title: string
      company: string
    }
  }
  showJobInfo?: boolean
}

export function ReviewCard({ review, showJobInfo = false }: ReviewCardProps) {
  const reviewer = review.contractor || review.employer
  const isForContractor = !!review.contractor
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium">{reviewer?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {isForContractor ? 'Employer' : 'Contractor'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1 mb-1">
                {renderStars(review.rating)}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(review.createdAt)}
              </p>
            </div>
          </div>

          {/* Job Info */}
          {showJobInfo && (
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-sm font-medium">{review.job.title}</p>
              <p className="text-sm text-muted-foreground">{review.job.company}</p>
            </div>
          )}

          {/* Review Comment */}
          <div>
            <p className="text-sm leading-relaxed">{review.comment}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}