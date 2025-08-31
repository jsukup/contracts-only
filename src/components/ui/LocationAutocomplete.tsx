'use client'

import GooglePlacesAutocomplete from './GooglePlacesAutocomplete'

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
  // Use the proper Google Places Autocomplete component
  // This provides the REAL Google Maps autocomplete experience
  return (
    <>
      <GooglePlacesAutocomplete
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className} ${error ? 'border-red-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        types={['(cities)']} // Restrict to cities only
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </>
  )
}