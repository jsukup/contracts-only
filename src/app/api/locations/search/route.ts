import { NextRequest, NextResponse } from 'next/server'

// TODO: Replace with Google Places Autocomplete API integration
// For now using enhanced static data - Google Places API requires API key configuration
const globalLocations = [
  // United States
  'New York, NY, USA',
  'Los Angeles, CA, USA', 
  'Chicago, IL, USA',
  'Houston, TX, USA',
  'Phoenix, AZ, USA',
  'Philadelphia, PA, USA',
  'San Antonio, TX, USA',
  'San Diego, CA, USA',
  'Dallas, TX, USA',
  'Austin, TX, USA',
  'San Jose, CA, USA',
  'Fort Worth, TX, USA',
  'Jacksonville, FL, USA',
  'Columbus, OH, USA',
  'Charlotte, NC, USA',
  'San Francisco, CA, USA',
  'Indianapolis, IN, USA',
  'Seattle, WA, USA',
  'Denver, CO, USA',
  'Boston, MA, USA',
  'Nashville, TN, USA',
  'Miami, FL, USA',
  'Atlanta, GA, USA',
  'Portland, OR, USA',
  'Las Vegas, NV, USA',
  
  // Canada  
  'Toronto, ON, Canada',
  'Montreal, QC, Canada',
  'Vancouver, BC, Canada',
  'Calgary, AB, Canada',
  'Ottawa, ON, Canada',
  'Edmonton, AB, Canada',
  'Winnipeg, MB, Canada',
  'Quebec City, QC, Canada',
  'Hamilton, ON, Canada',
  
  // United Kingdom
  'London, England, UK',
  'Manchester, England, UK',
  'Birmingham, England, UK',
  'Glasgow, Scotland, UK',
  'Edinburgh, Scotland, UK',
  'Leeds, England, UK',
  'Liverpool, England, UK',
  'Bristol, England, UK',
  'Sheffield, England, UK',
  'Cardiff, Wales, UK',
  
  // Europe
  'Berlin, Germany',
  'Munich, Germany',
  'Hamburg, Germany',
  'Frankfurt, Germany',
  'Paris, France',
  'Lyon, France',
  'Marseille, France',
  'Nice, France',
  'Amsterdam, Netherlands',
  'Rotterdam, Netherlands',
  'Madrid, Spain',
  'Barcelona, Spain',
  'Valencia, Spain',
  'Rome, Italy',
  'Milan, Italy',
  'Naples, Italy',
  'Stockholm, Sweden',
  'Copenhagen, Denmark',
  'Oslo, Norway',
  'Helsinki, Finland',
  'Vienna, Austria',
  'Zurich, Switzerland',
  'Geneva, Switzerland',
  'Brussels, Belgium',
  'Prague, Czech Republic',
  'Warsaw, Poland',
  'Budapest, Hungary',
  'Dublin, Ireland',
  'Lisbon, Portugal',
  
  // Asia Pacific
  'Tokyo, Japan',
  'Osaka, Japan',
  'Kyoto, Japan',
  'Seoul, South Korea',
  'Busan, South Korea',
  'Beijing, China',
  'Shanghai, China',
  'Guangzhou, China',
  'Shenzhen, China',
  'Hong Kong, China',
  'Singapore, Singapore',
  'Kuala Lumpur, Malaysia',
  'Bangkok, Thailand',
  'Manila, Philippines',
  'Jakarta, Indonesia',
  'Mumbai, India',
  'Delhi, India',
  'Bangalore, India',
  'Chennai, India',
  'Hyderabad, India',
  'Pune, India',
  'Sydney, Australia',
  'Melbourne, Australia',
  'Brisbane, Australia',
  'Perth, Australia',
  'Auckland, New Zealand',
  'Wellington, New Zealand',
  
  // Middle East & Africa
  'Dubai, UAE',
  'Abu Dhabi, UAE',
  'Tel Aviv, Israel',
  'Istanbul, Turkey',
  'Ankara, Turkey',
  'Cairo, Egypt',
  'Cape Town, South Africa',
  'Johannesburg, South Africa',
  'Nairobi, Kenya',
  'Lagos, Nigeria',
  
  // Latin America
  'Mexico City, Mexico',
  'Guadalajara, Mexico',
  'Monterrey, Mexico',
  'São Paulo, Brazil',
  'Rio de Janeiro, Brazil',
  'Brasília, Brazil',
  'Buenos Aires, Argentina',
  'Santiago, Chile',
  'Lima, Peru',
  'Bogotá, Colombia',
  'Medellín, Colombia',
  'Caracas, Venezuela',
]

// Simple in-memory cache to avoid repeated filtering
const locationCache = new Map<string, string[]>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim().toLowerCase()
    
    if (!query || query.length < 2) {
      return NextResponse.json({ locations: [] })
    }
    
    // Check cache
    const cacheKey = query
    const cached = locationCache.get(cacheKey)
    if (cached) {
      return NextResponse.json({ locations: cached })
    }
    
    // Filter locations based on query
    const filteredLocations = globalLocations
      .filter(location => 
        location.toLowerCase().includes(query)
      )
      .slice(0, 10) // Limit to 10 results for performance
      .sort((a, b) => {
        // Prioritize matches that start with the query
        const aStartsWith = a.toLowerCase().startsWith(query)
        const bStartsWith = b.toLowerCase().startsWith(query)
        
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        
        // Then sort alphabetically
        return a.localeCompare(b)
      })
    
    // Cache the result
    locationCache.set(cacheKey, filteredLocations)
    
    // Clean up cache if it gets too large
    if (locationCache.size > 100) {
      const oldestKeys = Array.from(locationCache.keys()).slice(0, 50)
      oldestKeys.forEach(key => locationCache.delete(key))
    }
    
    return NextResponse.json({ locations: filteredLocations })
  } catch (error) {
    console.error('Location search error:', error)
    return NextResponse.json(
      { error: 'Failed to search locations' }, 
      { status: 500 }
    )
  }
}