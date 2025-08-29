'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { Input } from './Input'

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  error?: string
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "e.g., Chicago, IL, USA",
  className = "",
  disabled = false,
  required = false,
  error
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchLocations = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.locations || [])
        setIsOpen(data.locations?.length > 0)
      }
    } catch (error) {
      console.error('Location search error:', error)
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(newValue.trim())
    }, 300)
  }

  const handleSelectLocation = (location: string) => {
    setInputValue(location)
    onChange(location)
    setIsOpen(false)
    setSuggestions([])
  }

  const handleClear = () => {
    setInputValue('')
    onChange('')
    setSuggestions([])
    setIsOpen(false)
  }

  const handleFocus = () => {
    if (inputValue.length >= 2) {
      searchLocations(inputValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`pl-10 pr-10 ${className} ${error ? 'border-red-500' : ''}`}
          disabled={disabled}
          required={required}
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((location, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectLocation(location)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-md last:rounded-b-md flex items-center"
            >
              <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-sm">{location}</span>
            </button>
          ))}
          {suggestions.length === 10 && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t">
              Continue typing to see more results...
            </div>
          )}
        </div>
      )}

      {isOpen && !isLoading && suggestions.length === 0 && inputValue.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
            <Search className="h-4 w-4 mr-2" />
            No locations found matching "{inputValue}"
          </div>
        </div>
      )}
    </div>
  )
}