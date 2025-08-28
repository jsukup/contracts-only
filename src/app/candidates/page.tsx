'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  User, 
  MapPin, 
  Star, 
  Search, 
  Filter,
  Briefcase,
  Calendar,
  Mail,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface Candidate {
  id: string
  name: string
  email: string
  image?: string
  location?: string
  title?: string
  experience?: string
  skills: string[]
  rating?: number
  completedJobs: number
  joinedAt: string
  hourlyRate?: {
    min: number
    max: number
    currency: string
  }
}

export default function CandidatesPage() {
  const { user } = useUser()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState('')

  useEffect(() => {
    if (!user) {
      redirect('/auth/signin?callbackUrl=/candidates')
    }
    
    // Only recruiters should access this page
    if (userProfile && userProfile.role !== 'RECRUITER') {
      redirect('/dashboard')
    }
  }, [user, userProfile])

  useEffect(() => {
    if (user?.id && userProfile?.role === 'RECRUITER') {
      fetchCandidates()
    }
  }, [user, userProfile, searchQuery, skillFilter])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (skillFilter) params.append('skills', skillFilter)
      
      const response = await fetch(`/api/candidates?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCandidates(data.candidates || [])
      }
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    })
  }

  if (!user || !userProfile || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Browse Candidates</h1>
          <p className="text-muted-foreground mt-2">
            Find qualified contractors for your projects
          </p>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by skills..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button onClick={fetchCandidates} className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Candidates List */}
        {candidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No candidates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || skillFilter 
                  ? 'Try adjusting your search criteria' 
                  : 'Candidates will appear here as they join the platform'
                }
              </p>
              {(searchQuery || skillFilter) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('')
                    setSkillFilter('')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <Card key={candidate.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {candidate.image ? (
                          <img 
                            src={candidate.image} 
                            alt={candidate.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-indigo-600" />
                          </div>
                        )}
                      </div>
                      
                      {/* Candidate Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{candidate.name}</h3>
                          {candidate.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{candidate.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        
                        {candidate.title && (
                          <p className="text-muted-foreground mb-2">{candidate.title}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          {candidate.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{candidate.location}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{candidate.completedJobs} completed jobs</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Joined {formatJoinDate(candidate.joinedAt)}</span>
                          </div>
                        </div>
                        
                        {/* Skills */}
                        {candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {candidate.skills.slice(0, 5).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {candidate.skills.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{candidate.skills.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Hourly Rate */}
                        {candidate.hourlyRate && (
                          <div className="text-sm font-medium text-green-600">
                            {candidate.hourlyRate.currency} {candidate.hourlyRate.min}-{candidate.hourlyRate.max}/hour
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/profile/${candidate.id}`}>
                          View Profile
                        </Link>
                      </Button>
                      <Button size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}