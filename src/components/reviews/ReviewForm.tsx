'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ReviewFormProps {
  jobId: string
  targetUserId: string
  targetUserName: string
  reviewType: 'for_contractor' | 'for_employer'
  onReviewSubmitted?: () => void
}

export function ReviewForm({ 
  jobId, 
  targetUserId, 
  targetUserName, 
  reviewType,
  onReviewSubmitted 
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      alert('Please select a rating')
      return
    }

    if (!comment.trim()) {
      alert('Please write a review comment')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          jobId,
          type: reviewType,
          [reviewType === 'for_contractor' ? 'contractorId' : 'employerId']: targetUserId
        })
      })

      if (response.ok) {
        setRating(0)
        setComment('')
        onReviewSubmitted?.()
        alert('Review submitted successfully!')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to submit review')
      }
    } catch (error) {
      console.error('Error submitting review:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1
      const isActive = starValue <= (hoveredRating || rating)
      
      return (
        <button
          key={i}
          type="button"
          className="focus:outline-none"
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setRating(starValue)}
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              isActive
                ? 'text-yellow-400 fill-current hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          />
        </button>
      )
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Leave a Review for {targetUserName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-1">
              {renderStars()}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} star{rating !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Share your experience working with ${targetUserName}. How was their communication, work quality, and professionalism?`}
              maxLength={1000}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {comment.length}/1000 characters
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || rating === 0 || !comment.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}