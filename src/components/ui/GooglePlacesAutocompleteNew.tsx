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

// Extended global interface for the new PlaceAutocompleteElement
declare global {
  interface Window {
    google: typeof google
  }
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter location...',
  className = '',
  types = ['(cities)']
}: GooglePlacesAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteElementRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.error('⚠️ Google Maps API key not configured')
      setError('Google Maps API key not configured')
      setIsFallback(true)
      return
    }

    console.log('🌍 Initializing Google Places Autocomplete with API key')

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'core']
    })

    loader
      .load()
      .then(async (google) => {
        console.log('✅ Google Maps API loaded successfully')
        
        // Check if PlaceAutocompleteElement is available (newer API)
        if (google.maps.places.PlaceAutocompleteElement) {
          try {
            // Use the new PlaceAutocompleteElement API
            const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
              componentRestrictions: { country: ['us', 'ca'] }, // Limit to US and Canada
              types: types[0] === '(cities)' ? ['locality', 'administrative_area_level_3'] : ['geocode']
            })

            if (containerRef.current && inputRef.current) {
              // Hide the original input and replace with the new element
              inputRef.current.style.display = 'none'
              containerRef.current.appendChild(placeAutocomplete as unknown as HTMLElement)
              autocompleteElementRef.current = placeAutocomplete

              // Listen for place selection
              placeAutocomplete.addEventListener('gmp-placeselect', async (event: any) => {
                const place = event.place
                console.log('📍 Place selected:', place)
                
                if (place) {
                  try {
                    await place.fetchFields({ fields: ['displayName', 'formattedAddress'] })
                    const selectedLocation = place.formattedAddress || place.displayName || ''
                    onChange(selectedLocation)
                  } catch (err) {
                    console.error('Error fetching place details:', err)
                  }
                }
              })

              setIsLoaded(true)
              console.log('✅ Google Places PlaceAutocompleteElement initialized successfully')
            }
          } catch (err) {
            console.error('Error with PlaceAutocompleteElement, falling back to classic:', err)
            setIsFallback(true)
          }
        } else {
          // Fallback to classic Autocomplete if new API not available
          console.log('PlaceAutocompleteElement not available, using classic Autocomplete')
          setIsFallback(true)
          
          if (inputRef.current && google.maps.places.Autocomplete) {
            const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
              types: types,
              componentRestrictions: { country: ['us', 'ca'] },
              fields: ['formatted_address', 'geometry', 'name', 'place_id']
            })

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace()
              console.log('📍 Place selected (classic):', place)
              
              if (place?.formatted_address) {
                onChange(place.formatted_address)
              } else if (place?.name) {
                onChange(place.name)
              }
            })

            setIsLoaded(true)
            console.log('✅ Google Places Autocomplete (classic) initialized successfully')
          }
        }
      })
      .catch((loadError) => {
        console.error('❌ Error loading Google Maps:', loadError)
        setError('Failed to load Google Maps')
        setIsFallback(true)
        
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
      if (autocompleteElementRef.current) {
        const element = autocompleteElementRef.current
        if (element && element.parentNode) {
          element.parentNode.removeChild(element)
        }
      }
    }
  }, [onChange, types])

  // Handle manual input changes for fallback mode
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
  }

  if (error || isFallback) {
    // Fallback to regular input 
    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={className}
          ref={inputRef}
        />
        {error && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ Autocomplete unavailable - please type location manually
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        disabled={!isLoaded && !isFallback}
      />
      {!isLoaded && !isFallback && (
        <div className="text-xs text-gray-500 mt-1">
          Loading location search...
        </div>
      )}
    </div>
  )
}