'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { MatchedJobCard } from '@/components/matching/MatchedJobCard'
import { 
  Sparkles,
  Filter,
  RefreshCw,
  Settings,
  TrendingUp,
  Clock,
  Target,
  Bell
} from 'lucide-react'
import Link from 'next/link'

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
  job: {
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
}

export default function MatchesPage() {
  const { user } = useUser()
  const [matches, setMatches] = useState<MatchScore[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [minScore, setMinScore] = useState(50)

  useEffect(() => {
    if (user?.id) {
      fetchMatches()
    }
  }, [user, minScore])

  const fetchMatches = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/matching/user/${user.id}?minScore=${minScore}&limit=20`
      )
      
      if (!response.ok) throw new Error('Failed to fetch matches')
      
      const data = await response.json()
      setMatches(data.matches || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMatches()
    setRefreshing(false)
  }

  const handleSaveJob = async (jobId: string) => {
    // Implement save job functionality
    console.log('Saving job:', jobId)
  }

  const handleShareJob = async (jobId: string) => {
    // Implement share job functionality
    navigator.clipboard.writeText(`${window.location.origin}/jobs/${jobId}`)
    // Show toast notification
  }

  const handleDismissJob = async (jobId: string) => {
    // Remove job from matches
    setMatches(prev => prev.filter(match => match.jobId !== jobId))
  }

  const filteredMatches = matches.filter(match => {
    if (filter === 'all') return true
    return match.confidence === filter
  })

  const getMatchStats = () => {
    const total = matches.length
    const high = matches.filter(m => m.confidence === 'high').length
    const medium = matches.filter(m => m.confidence === 'medium').length
    const avgScore = matches.length > 0 
      ? Math.round(matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length)
      : 0

    return { total, high, medium, avgScore }
  }

  const stats = getMatchStats()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Sparkles className="h-8 w-8 mr-3 text-blue-500" />
              Job Matches
            </h1>
            <p className="text-gray-600 mt-1">
              Personalized job recommendations based on your skills and preferences
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/matches/preferences">
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-600">Total Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-2xl font-bold">{stats.high}</p>
                  <p className="text-sm text-gray-600">High Matches</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-2xl font-bold">{stats.avgScore}%</p>
                  <p className="text-sm text-gray-600">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Bell className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-2xl font-bold">Daily</p>
                  <p className="text-sm text-gray-600">Updates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Confidence:</span>
                <div className="flex space-x-1">
                  {(['all', 'high', 'medium', 'low'] as const).map((level) => (
                    <Button
                      key={level}
                      variant={filter === level ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(level)}
                      className="capitalize"
                    >
                      {level}
                      {level !== 'all' && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {matches.filter(m => m.confidence === level).length}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Min Score:</span>
                <select
                  className="px-3 py-1 border rounded text-sm"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                >
                  <option value={30}>30%</option>
                  <option value={50}>50%</option>
                  <option value={70}>70%</option>
                  <option value={80}>80%</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Results */}
        {filteredMatches.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {filteredMatches.length} {filter === 'all' ? '' : `${filter} `}
                match{filteredMatches.length !== 1 ? 'es' : ''}
              </h2>
              <div className="text-sm text-gray-500">
                Sorted by match score
              </div>
            </div>
            
            {filteredMatches.map((match) => (
              <MatchedJobCard
                key={match.jobId}
                match={match}
                onSave={handleSaveJob}
                onShare={handleShareJob}
                onDismiss={handleDismissJob}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No matches found
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "We haven't found any jobs matching your preferences yet." 
                  : `No ${filter} confidence matches found. Try adjusting your filters.`
                }
              </p>
              <div className="space-x-3">
                <Button onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/matches/preferences">
                    Update Preferences
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matching Tips */}
        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Improve Your Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">📝 Complete Your Profile</h4>
                  <p className="text-gray-600">
                    A complete profile with skills, portfolio, and preferences 
                    helps us find better matches for you.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">⚙️ Update Preferences</h4>
                  <p className="text-gray-600">
                    Keep your job preferences, rates, and availability current 
                    for the most relevant matches.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🎯 Be Specific</h4>
                  <p className="text-gray-600">
                    Specific skills and clear rate expectations lead to 
                    higher quality job matches.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">📊 Check Daily</h4>
                  <p className="text-gray-600">
                    New matches are generated daily. Check regularly to 
                    not miss great opportunities.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}