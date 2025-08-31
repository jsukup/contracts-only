'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import toast from 'react-hot-toast'

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  types?: string[] // ['(cities)'] for cities only
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter location...',
  className = '',
  types = ['(cities)']
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.error('⚠️ Google Maps API key not configured')
      setError('Google Maps API key not configured')
      toast.error('Location search requires Google Maps API configuration. Please contact support.')
      return
    }

    console.log('🌍 Initializing Google Places Autocomplete with API key')

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places']
    })

    loader
      .load()
      .then((google) => {
        console.log('✅ Google Maps API loaded successfully')
        
        if (!inputRef.current) {
          console.error('❌ Input ref not available')
          return
        }

        // Create a new session token for billing optimization
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()

        // Initialize autocomplete with session token
        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            types,
            fields: ['formatted_address', 'geometry', 'name', 'place_id'],
            sessionToken: sessionTokenRef.current
          }
        )

        // Add place changed listener
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace()
          console.log('📍 Place selected:', place)
          
          if (place?.formatted_address) {
            onChange(place.formatted_address)
            // Create new session token after place selection for next search
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
          } else if (place?.name) {
            onChange(place.name)
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
          }
        })

        setIsLoaded(true)
        console.log('✅ Google Places Autocomplete initialized successfully')
      })
      .catch((loadError) => {
        console.error('❌ Error loading Google Maps:', loadError)
        setError('Failed to load Google Maps')
        
        // Provide detailed error message to user
        if (loadError.message?.includes('InvalidKeyMapError')) {
          toast.error('Invalid Google Maps API key. Please check configuration.')
        } else if (loadError.message?.includes('RefererNotAllowedMapError')) {
          toast.error('This domain is not authorized for the Google Maps API key.')
        } else {
          toast.error('Location search temporarily unavailable. Please enter manually.')
        }
      })

    // Cleanup function
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [onChange, types])

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // If user clears the field, reset session token
    if (!newValue) {
      if (window.google?.maps?.places) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
      }
    }
  }

  if (error) {
    console.warn('⚠️ Falling back to manual input due to error:', error)
    // Fallback to regular input when Google Maps fails
    // But notify user that autocomplete is not available
    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <div className="text-xs text-orange-600 mt-1">
          ⚠️ Autocomplete unavailable - please type location manually
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        disabled={!isLoaded}
      />
      {!isLoaded && (
        <div className="text-xs text-gray-500 mt-1">
          Loading location search...
        </div>
      )}
    </div>
  )
}