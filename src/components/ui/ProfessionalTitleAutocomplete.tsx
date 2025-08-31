'use client'

import { useState, useEffect, useRef } from 'react'
import { Briefcase, Search, X } from 'lucide-react'
import { Input } from './Input'

interface ProfessionalTitleAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  error?: string
}

export default function ProfessionalTitleAutocomplete({
  value,
  onChange,
  placeholder = "e.g., Full Stack Developer",
  className = "",
  disabled = false,
  required = false,
  error
}: ProfessionalTitleAutocompleteProps) {
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

  const searchTitles = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    console.log('Professional title search starting for:', query)
    
    try {
      const url = `/api/professional-titles/search?q=${encodeURIComponent(query)}`
      console.log('Fetching from URL:', url)
      
      const response = await fetch(url)
      console.log('Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Response data:', data)
        
        const titles = data.titles || []
        setSuggestions(titles)
        setIsOpen(titles.length > 0)
        
        console.log('Setting suggestions:', titles, 'dropdown open:', titles.length > 0)
      } else {
        console.error('API response not ok:', response.status, response.statusText)
        setSuggestions([])
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Professional title search error:', error)
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
      searchTitles(newValue.trim())
    }, 300)
  }

  const handleSelectTitle = (title: string) => {
    setInputValue(title)
    onChange(title)
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
      searchTitles(inputValue)
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
        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-1">
          Debug: isOpen={isOpen.toString()}, suggestions={suggestions.length}, loading={isLoading.toString()}
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((title, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectTitle(title)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-md last:rounded-b-md flex items-center"
            >
              <Briefcase className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-sm">{title}</span>
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
            No professional titles found matching "{inputValue}"
          </div>
        </div>
      )}
    </div>
  )
}