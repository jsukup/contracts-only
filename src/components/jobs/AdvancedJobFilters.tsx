'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { 
  Search, 
  Filter, 
  X, 
  MapPin, 
  DollarSign, 
  Calendar,
  Clock,
  Briefcase,
  Users,
  Star
} from 'lucide-react'

interface FilterOptions {
  search: string
  location: string
  isRemote: boolean | null
  minRate: number | null
  maxRate: number | null
  currency: string
  jobType: string[]
  skills: string[]
  contractDuration: string[]
  hoursPerWeek: string[]
  postedWithin: string
  rating: number | null
}

interface AdvancedJobFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void
  availableSkills: string[]
  loading?: boolean
}

export function AdvancedJobFilters({ 
  onFiltersChange, 
  availableSkills = [],
  loading = false 
}: AdvancedJobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    location: '',
    isRemote: null,
    minRate: null,
    maxRate: null,
    currency: 'USD',
    jobType: [],
    skills: [],
    contractDuration: [],
    hoursPerWeek: [],
    postedWithin: 'all',
    rating: null
  })
  const [skillInput, setSkillInput] = useState('')

  const jobTypes = ['contract', 'freelance', 'temporary']
  const contractDurations = ['1-3 months', '3-6 months', '6-12 months', '12+ months']
  const hoursPerWeekOptions = ['Part-time (< 20h)', 'Part-time (20-30h)', 'Full-time (40h)', 'Full-time (40h+)']
  const postedWithinOptions = [
    { value: 'all', label: 'Any time' },
    { value: '1', label: 'Last 24 hours' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' }
  ]

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleArrayFilter = (key: 'jobType' | 'skills' | 'contractDuration' | 'hoursPerWeek', value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      return { ...prev, [key]: newArray }
    })
  }

  const addSkill = () => {
    if (skillInput.trim() && !filters.skills.includes(skillInput.trim())) {
      toggleArrayFilter('skills', skillInput.trim())
      setSkillInput('')
    }
  }

  const clearAllFilters = () => {
    setFilters({
      search: '',
      location: '',
      isRemote: null,
      minRate: null,
      maxRate: null,
      currency: 'USD',
      jobType: [],
      skills: [],
      contractDuration: [],
      hoursPerWeek: [],
      postedWithin: 'all',
      rating: null
    })
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.location) count++
    if (filters.isRemote !== null) count++
    if (filters.minRate || filters.maxRate) count++
    if (filters.jobType.length > 0) count++
    if (filters.skills.length > 0) count++
    if (filters.contractDuration.length > 0) count++
    if (filters.hoursPerWeek.length > 0) count++
    if (filters.postedWithin !== 'all') count++
    if (filters.rating) count++
    return count
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Find Jobs</span>
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary">
                {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getActiveFilterCount() > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {isExpanded ? 'Less filters' : 'More filters'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search Jobs</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Job title, company, or keywords..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="City, state, or country..."
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Remote Work Toggle */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Work Type:</span>
          <div className="flex space-x-2">
            <Button
              variant={filters.isRemote === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('isRemote', null)}
            >
              All
            </Button>
            <Button
              variant={filters.isRemote === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('isRemote', true)}
            >
              Remote
            </Button>
            <Button
              variant={filters.isRemote === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('isRemote', false)}
            >
              On-site
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t">
            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Hourly Rate
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  className="px-3 py-2 border rounded-md"
                  value={filters.currency}
                  onChange={(e) => updateFilter('currency', e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
                <Input
                  type="number"
                  placeholder="Min rate"
                  value={filters.minRate || ''}
                  onChange={(e) => updateFilter('minRate', e.target.value ? parseInt(e.target.value) : null)}
                />
                <Input
                  type="number"
                  placeholder="Max rate"
                  value={filters.maxRate || ''}
                  onChange={(e) => updateFilter('maxRate', e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <Briefcase className="inline h-4 w-4 mr-1" />
                Job Type
              </label>
              <div className="flex flex-wrap gap-2">
                {jobTypes.map(type => (
                  <Button
                    key={type}
                    variant={filters.jobType.includes(type) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter('jobType', type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium mb-3">Skills</label>
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button onClick={addSkill} size="sm">Add</Button>
                </div>
                
                {filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filters.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1">
                        {skill}
                        <button
                          onClick={() => toggleArrayFilter('skills', skill)}
                          className="ml-2 text-xs hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {availableSkills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Popular skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSkills.slice(0, 10).map(skill => (
                        <Button
                          key={skill}
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleArrayFilter('skills', skill)}
                          className="text-xs"
                        >
                          {skill}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contract Duration */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <Calendar className="inline h-4 w-4 mr-1" />
                Contract Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {contractDurations.map(duration => (
                  <Button
                    key={duration}
                    variant={filters.contractDuration.includes(duration) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter('contractDuration', duration)}
                  >
                    {duration}
                  </Button>
                ))}
              </div>
            </div>

            {/* Hours per Week */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <Clock className="inline h-4 w-4 mr-1" />
                Hours per Week
              </label>
              <div className="flex flex-wrap gap-2">
                {hoursPerWeekOptions.map(hours => (
                  <Button
                    key={hours}
                    variant={filters.hoursPerWeek.includes(hours) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleArrayFilter('hoursPerWeek', hours)}
                  >
                    {hours}
                  </Button>
                ))}
              </div>
            </div>

            {/* Posted Within */}
            <div>
              <label className="block text-sm font-medium mb-3">Posted Within</label>
              <div className="flex flex-wrap gap-2">
                {postedWithinOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={filters.postedWithin === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilter('postedWithin', option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <Star className="inline h-4 w-4 mr-1" />
                Employer Rating
              </label>
              <div className="flex space-x-2">
                {[4, 4.5, 5].map(rating => (
                  <Button
                    key={rating}
                    variant={filters.rating === rating ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateFilter('rating', filters.rating === rating ? null : rating)}
                  >
                    {rating}+ stars
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}