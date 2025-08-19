'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface JobFiltersProps {
  onFiltersChange: (filters: any) => void
  skills?: Array<{ id: string; name: string; category?: string }>
}

export function JobFilters({ onFiltersChange, skills = [] }: JobFiltersProps) {
  const [search, setSearch] = useState('')
  const [jobType, setJobType] = useState('')
  const [isRemote, setIsRemote] = useState('')
  const [minRate, setMinRate] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    
    const filters: any = {}
    if (search) filters.search = search
    if (jobType) filters.jobType = jobType
    if (isRemote !== '') filters.isRemote = isRemote
    if (minRate) filters.minRate = parseInt(minRate)
    if (maxRate) filters.maxRate = parseInt(maxRate)
    if (selectedSkills.length > 0) filters.skills = selectedSkills.join(',')
    
    onFiltersChange(filters)
  }

  const clearFilters = () => {
    setSearch('')
    setJobType('')
    setIsRemote('')
    setMinRate('')
    setMaxRate('')
    setSelectedSkills([])
    onFiltersChange({})
  }

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    )
  }

  const activeFilterCount = [
    search,
    jobType,
    isRemote,
    minRate,
    maxRate,
    ...selectedSkills
  ].filter(Boolean).length

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search jobs by title, company, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 px-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </form>

      {showAdvanced && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Advanced Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Type</label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="FREELANCE">Freelance</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="TEMPORARY">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={isRemote} onValueChange={setIsRemote}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All locations</SelectItem>
                  <SelectItem value="true">Remote only</SelectItem>
                  <SelectItem value="false">On-site only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hourly Rate</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {skills.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Skills</label>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 20).map((skill) => (
                  <Badge
                    key={skill.id}
                    variant={selectedSkills.includes(skill.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleSkill(skill.id)}
                  >
                    {skill.name}
                    {selectedSkills.includes(skill.id) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSubmit()}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}