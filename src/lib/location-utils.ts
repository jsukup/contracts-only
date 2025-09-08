/**
 * Location parsing and normalization utilities for flexible job filtering
 */

export interface LocationComponents {
  city: string
  state: string
  country: string
  original: string
}

/**
 * Parse a location string into its components
 * Handles formats like:
 * - "New York, NY, USA"
 * - "New York, NY" 
 * - "San Francisco, CA, United States"
 * - "Toronto, ON, Canada"
 */
export function parseLocation(location: string): LocationComponents | null {
  if (!location || typeof location !== 'string') {
    return null
  }

  const trimmed = location.trim()
  if (!trimmed) {
    return null
  }

  // Split by comma and clean up each part
  const parts = trimmed.split(',').map(part => part.trim()).filter(Boolean)
  
  if (parts.length < 2) {
    // If no comma, treat as city only
    return {
      city: trimmed,
      state: '',
      country: '',
      original: trimmed
    }
  }

  const [city, state, ...rest] = parts
  const country = rest.length > 0 ? rest.join(', ') : ''

  return {
    city: city || '',
    state: state || '',
    country: country || '',
    original: trimmed
  }
}

/**
 * Generate location variations for flexible matching
 * Returns an array of location patterns to try, ordered from most to least specific
 */
export function generateLocationVariations(location: string): string[] {
  const parsed = parseLocation(location)
  if (!parsed) {
    return [location]
  }

  const variations: string[] = []
  
  // 1. Original exact match
  variations.push(parsed.original)
  
  // 2. Without country (most common case)
  if (parsed.country && parsed.city && parsed.state) {
    variations.push(`${parsed.city}, ${parsed.state}`)
  }
  
  // 3. City only
  if (parsed.city) {
    variations.push(parsed.city)
  }
  
  // 4. State only (for broader matches)
  if (parsed.state && parsed.state.length === 2) {
    variations.push(parsed.state)
  }

  // Remove duplicates while preserving order
  return [...new Set(variations)]
}

/**
 * Normalize location for search - main function to use in API endpoints
 * Returns SQL conditions for flexible location matching
 */
export function normalizeLocationForSearch(location: string) {
  const variations = generateLocationVariations(location)
  
  return {
    variations,
    // For Supabase queries - creates OR conditions with proper escaping
    supabaseOrConditions: variations,
    // For debugging
    debug: {
      original: location,
      parsed: parseLocation(location),
      variations
    }
  }
}

/**
 * Check if two locations might be the same (fuzzy matching)
 * Useful for deduplication or comparison
 */
export function locationsMatch(location1: string, location2: string): boolean {
  const parsed1 = parseLocation(location1)
  const parsed2 = parseLocation(location2)
  
  if (!parsed1 || !parsed2) {
    return location1.toLowerCase().trim() === location2.toLowerCase().trim()
  }

  // Check if city and state match (ignore country differences)
  return (
    parsed1.city.toLowerCase() === parsed2.city.toLowerCase() &&
    parsed1.state.toLowerCase() === parsed2.state.toLowerCase()
  )
}

/**
 * Extract just the city, state portion from a full location
 * Useful for consistent data normalization
 */
export function extractCityState(location: string): string {
  const parsed = parseLocation(location)
  if (!parsed) {
    return location
  }

  if (parsed.city && parsed.state) {
    return `${parsed.city}, ${parsed.state}`
  }
  
  return parsed.city || location
}