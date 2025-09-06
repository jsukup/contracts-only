'use client'

import { useState, useCallback } from 'react'
import { Search, MapPin, DollarSign, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import LocationInput from '@/components/ui/LocationInput'
import { debounce } from 'lodash'

export interface JobFilterValues {
  search?: string
  location?: string
  hourlyRate?: number
}

interface HomeJobFiltersProps {
  onFiltersChange: (filters: JobFilterValues) => void
  loading?: boolean
}

export function HomeJobFilters({ onFiltersChange, loading = false }: HomeJobFiltersProps) {
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [isActive, setIsActive] = useState(false)

  // Debounced filter update
  const debouncedFilterUpdate = useCallback(
    debounce((filters: JobFilterValues) => {
      onFiltersChange(filters)
    }, 500),
    [onFiltersChange]
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    updateFilters({ search: value, location, hourlyRate })
  }

  const handleLocationChange = (value: string) => {
    setLocation(value)
    updateFilters({ search, location: value, hourlyRate })
  }

  const handleHourlyRateChange = (value: string) => {
    setHourlyRate(value)
    updateFilters({ search, location, hourlyRate: value })
  }

  const updateFilters = (values: { search: string; location: string; hourlyRate: string }) => {
    const filters: JobFilterValues = {}
    
    if (values.search.trim()) {
      filters.search = values.search.trim()
    }
    
    if (values.location.trim()) {
      filters.location = values.location.trim()
    }
    
    if (values.hourlyRate && !isNaN(Number(values.hourlyRate))) {
      filters.hourlyRate = Number(values.hourlyRate)
    }

    const hasActiveFilters = Object.keys(filters).length > 0
    setIsActive(hasActiveFilters)
    
    debouncedFilterUpdate(filters)
  }

  const handleClearFilters = () => {
    setSearch('')
    setLocation('')
    setHourlyRate('')
    setIsActive(false)
    onFiltersChange({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const filters: JobFilterValues = {}
    
    if (search.trim()) filters.search = search.trim()
    if (location.trim()) filters.location = location.trim()
    if (hourlyRate && !isNaN(Number(hourlyRate))) {
      filters.hourlyRate = Number(hourlyRate)
    }
    
    onFiltersChange(filters)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Job Title Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search job titles..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-10"
              disabled={loading}
            />
          </div>

          {/* Location Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            <LocationInput
              value={location}
              onChange={handleLocationChange}
              placeholder="Enter city or region..."
              className="pl-10 h-10 w-full rounded-md border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Hourly Rate Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="number"
              placeholder="Hourly rate (e.g., 75)"
              value={hourlyRate}
              onChange={(e) => handleHourlyRateChange(e.target.value)}
              className="pl-10 h-10"
              min="0"
              disabled={loading}
            />
            {hourlyRate && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-sm text-gray-500">/hr</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Actions */}
        {isActive && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-gray-600">
              {loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600 mr-2"></div>
                  Searching...
                </span>
              ) : (
                <span>Filters active</span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              disabled={loading}
              className="flex items-center"
            >
              <X className="h-3 w-3 mr-1" />
              Clear filters
            </Button>
          </div>
        )}
      </form>

      {/* Help Text */}
      <div className="mt-3 text-xs text-gray-500">
        <p>Search by job title keywords, filter by location, or find jobs that match your hourly rate.</p>
      </div>
    </div>
  )
}