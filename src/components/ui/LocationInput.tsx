'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { debounce } from 'lodash'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function LocationInput({
  value,
  onChange,
  placeholder = 'Enter city or region...',
  className = ''
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured - location autocomplete disabled')
      return
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    })

    loader
      .load()
      .then((google) => {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
        setGoogleLoaded(true)
        console.log('✅ Location autocomplete service initialized')
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error)
      })
  }, [])

  // Fetch suggestions using AutocompleteService
  const fetchSuggestions = useCallback(
    debounce((input: string) => {
      if (!autocompleteServiceRef.current || input.length < 2) {
        setSuggestions([])
        return
      }

      setIsLoading(true)

      const request = {
        input,
        types: ['(cities)'],
        componentRestrictions: { country: ['us', 'ca'] }
      }

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          setIsLoading(false)
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const locationSuggestions = predictions.map(p => p.description)
            setSuggestions(locationSuggestions)
            setShowSuggestions(true)
          } else {
            setSuggestions([])
          }
        }
      )
    }, 300),
    [googleLoaded]
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    if (googleLoaded && newValue) {
      fetchSuggestions(newValue)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}
    </div>
  )
}