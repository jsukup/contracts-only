import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Places Autocomplete API Integration
 * This endpoint integrates with Google Places API to provide worldwide location autocomplete
 * as specifically requested by the user for city/town level location search
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    
    if (!query || query.length < 2) {
      return NextResponse.json({ locations: [] })
    }

    // Check if Google Places API key is configured
    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.error('⚠️ Google Places API key not configured')
      console.log('Please set GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in environment variables')
      
      // Return error response instead of silent fallback
      return NextResponse.json({ 
        locations: [],
        source: 'error',
        error: 'Google Places API key not configured. Please contact support.',
        note: 'API key required for location search functionality'
      }, { status: 503 })
    }

    console.log('✅ Google Places API key found, making API request')

    try {
      // Use Google Places Autocomplete API as specifically requested
      const googleApiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${apiKey}`
      
      const response = await fetch(googleApiUrl)
      
      if (!response.ok) {
        throw new Error(`Google API responded with ${response.status}`)
      }

      const data = await response.json()

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google API error: ${data.status}`)
      }

      // Transform Google Places response to our format
      const locations = (data.predictions || [])
        .map((prediction: any) => prediction.description)
        .slice(0, 10) // Limit to 10 results

      return NextResponse.json({ 
        locations,
        source: 'google-places-api',
        status: data.status
      })

    } catch (apiError) {
      console.error('Google Places API error:', apiError)
      
      // Fallback to static list on API error
      console.warn('Falling back to static locations due to API error')
      return fallbackLocationSearch(query)
    }

  } catch (error) {
    console.error('Location search error:', error)
    return NextResponse.json(
      { error: 'Failed to search locations' }, 
      { status: 500 }
    )
  }
}

/**
 * Fallback location search using comprehensive static list
 * Used when Google Places API is unavailable or not configured
 */
function fallbackLocationSearch(query: string) {
  // Comprehensive static list including the missing cities mentioned by user
  const enhancedGlobalLocations = [
    // United States - Enhanced with missing cities
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
    
    // MISSING CITIES SPECIFICALLY MENTIONED BY USER
    'Detroit, MI, USA',
    'Kansas City, MO, USA', 
    'St. Louis, MO, USA',
    
    // Additional Major US Cities
    'Milwaukee, WI, USA',
    'Albuquerque, NM, USA',
    'Tucson, AZ, USA',
    'Fresno, CA, USA',
    'Sacramento, CA, USA',
    'Long Beach, CA, USA',
    'Kansas City, KS, USA',
    'Mesa, AZ, USA',
    'Virginia Beach, VA, USA',
    'Omaha, NE, USA',
    'Colorado Springs, CO, USA',
    'Raleigh, NC, USA',
    'Miami Gardens, FL, USA',
    'Oakland, CA, USA',
    'Minneapolis, MN, USA',
    'Tulsa, OK, USA',
    'Cleveland, OH, USA',
    'Wichita, KS, USA',
    'Arlington, TX, USA',
    'New Orleans, LA, USA',
    'Bakersfield, CA, USA',
    'Tampa, FL, USA',
    'Honolulu, HI, USA',
    'Aurora, CO, USA',
    'Anaheim, CA, USA',
    'Santa Ana, CA, USA',
    'St. Paul, MN, USA',
    'Riverside, CA, USA',
    'Cincinnati, OH, USA',
    'Lexington, KY, USA',
    'Anchorage, AK, USA',
    'Stockton, CA, USA',
    'Toledo, OH, USA',
    'St. Petersburg, FL, USA',
    'Newark, NJ, USA',
    'Greensboro, NC, USA',
    'Plano, TX, USA',
    'Henderson, NV, USA',
    'Lincoln, NE, USA',
    'Buffalo, NY, USA',
    'Jersey City, NJ, USA',
    'Chula Vista, CA, USA',
    'Fort Wayne, IN, USA',
    'Orlando, FL, USA',
    'St. Louis, MO, USA',
    'Chandler, AZ, USA',
    'Pittsburgh, PA, USA',
    'Laredo, TX, USA',
    'Durham, NC, USA',
    'Lubbock, TX, USA',
    'Madison, WI, USA',
    'Gilbert, AZ, USA',
    'Reno, NV, USA',
    'Hialeah, FL, USA',
    'Garland, TX, USA',
    'Chesapeake, VA, USA',
    'Irving, TX, USA',
    'North Las Vegas, NV, USA',
    'Fremont, CA, USA',
    'Baton Rouge, LA, USA',
    'Richmond, VA, USA',
    'Boise, ID, USA',
    'San Bernardino, CA, USA',
    
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
    'Kitchener, ON, Canada',
    'London, ON, Canada',
    'Victoria, BC, Canada',
    'Halifax, NS, Canada',
    'Oshawa, ON, Canada',
    'Windsor, ON, Canada',
    'Saskatoon, SK, Canada',
    'St. Catharines, ON, Canada',
    'Regina, SK, Canada',
    'Sherbrooke, QC, Canada',
    'Kelowna, BC, Canada',
    
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
    'Leicester, England, UK',
    'Coventry, England, UK',
    'Bradford, England, UK',
    'Belfast, Northern Ireland, UK',
    'Nottingham, England, UK',
    'Plymouth, England, UK',
    'Wolverhampton, England, UK',
    'Southampton, England, UK',
    'Reading, England, UK',
    'Derby, England, UK',
    
    // Europe
    'Berlin, Germany',
    'Munich, Germany',
    'Hamburg, Germany',
    'Frankfurt, Germany',
    'Cologne, Germany',
    'Stuttgart, Germany',
    'Düsseldorf, Germany',
    'Dortmund, Germany',
    'Essen, Germany',
    'Leipzig, Germany',
    'Paris, France',
    'Lyon, France',
    'Marseille, France',
    'Nice, France',
    'Toulouse, France',
    'Nantes, France',
    'Montpellier, France',
    'Strasbourg, France',
    'Bordeaux, France',
    'Lille, France',
    'Amsterdam, Netherlands',
    'Rotterdam, Netherlands',
    'The Hague, Netherlands',
    'Utrecht, Netherlands',
    'Eindhoven, Netherlands',
    'Madrid, Spain',
    'Barcelona, Spain',
    'Valencia, Spain',
    'Seville, Spain',
    'Zaragoza, Spain',
    'Málaga, Spain',
    'Rome, Italy',
    'Milan, Italy',
    'Naples, Italy',
    'Turin, Italy',
    'Florence, Italy',
    'Bologna, Italy',
    'Stockholm, Sweden',
    'Gothenburg, Sweden',
    'Malmö, Sweden',
    'Copenhagen, Denmark',
    'Aarhus, Denmark',
    'Oslo, Norway',
    'Bergen, Norway',
    'Helsinki, Finland',
    'Espoo, Finland',
    'Vienna, Austria',
    'Graz, Austria',
    'Zurich, Switzerland',
    'Geneva, Switzerland',
    'Basel, Switzerland',
    'Brussels, Belgium',
    'Antwerp, Belgium',
    'Prague, Czech Republic',
    'Brno, Czech Republic',
    'Warsaw, Poland',
    'Kraków, Poland',
    'Łódź, Poland',
    'Budapest, Hungary',
    'Dublin, Ireland',
    'Cork, Ireland',
    'Lisbon, Portugal',
    'Porto, Portugal',
    
    // Asia Pacific
    'Tokyo, Japan',
    'Osaka, Japan',
    'Kyoto, Japan',
    'Yokohama, Japan',
    'Kobe, Japan',
    'Nagoya, Japan',
    'Sapporo, Japan',
    'Fukuoka, Japan',
    'Seoul, South Korea',
    'Busan, South Korea',
    'Incheon, South Korea',
    'Daegu, South Korea',
    'Beijing, China',
    'Shanghai, China',
    'Guangzhou, China',
    'Shenzhen, China',
    'Tianjin, China',
    'Wuhan, China',
    'Hong Kong, China',
    'Singapore, Singapore',
    'Kuala Lumpur, Malaysia',
    'George Town, Malaysia',
    'Bangkok, Thailand',
    'Chiang Mai, Thailand',
    'Manila, Philippines',
    'Cebu City, Philippines',
    'Jakarta, Indonesia',
    'Surabaya, Indonesia',
    'Bandung, Indonesia',
    'Mumbai, India',
    'Delhi, India',
    'Bangalore, India',
    'Chennai, India',
    'Hyderabad, India',
    'Pune, India',
    'Kolkata, India',
    'Ahmedabad, India',
    'Sydney, Australia',
    'Melbourne, Australia',
    'Brisbane, Australia',
    'Perth, Australia',
    'Adelaide, Australia',
    'Auckland, New Zealand',
    'Wellington, New Zealand',
    'Christchurch, New Zealand',
    
    // Middle East & Africa
    'Dubai, UAE',
    'Abu Dhabi, UAE',
    'Sharjah, UAE',
    'Tel Aviv, Israel',
    'Jerusalem, Israel',
    'Istanbul, Turkey',
    'Ankara, Turkey',
    'Izmir, Turkey',
    'Cairo, Egypt',
    'Alexandria, Egypt',
    'Cape Town, South Africa',
    'Johannesburg, South Africa',
    'Durban, South Africa',
    'Nairobi, Kenya',
    'Lagos, Nigeria',
    'Abuja, Nigeria',
    'Casablanca, Morocco',
    'Rabat, Morocco',
    
    // Latin America
    'Mexico City, Mexico',
    'Guadalajara, Mexico',
    'Monterrey, Mexico',
    'Tijuana, Mexico',
    'São Paulo, Brazil',
    'Rio de Janeiro, Brazil',
    'Brasília, Brazil',
    'Salvador, Brazil',
    'Fortaleza, Brazil',
    'Belo Horizonte, Brazil',
    'Buenos Aires, Argentina',
    'Córdoba, Argentina',
    'Rosario, Argentina',
    'Santiago, Chile',
    'Valparaíso, Chile',
    'Lima, Peru',
    'Arequipa, Peru',
    'Bogotá, Colombia',
    'Medellín, Colombia',
    'Cali, Colombia',
    'Caracas, Venezuela',
    'Maracaibo, Venezuela'
  ]

  // Normalize query for better matching (handle common abbreviations)
  const normalizedQuery = query.toLowerCase()
    .replace(/\bst\b/g, 'st.') // "st" -> "st."
    .replace(/\bft\b/g, 'ft.') // "ft" -> "ft."
    .replace(/\bmt\b/g, 'mt.') // "mt" -> "mt."

  // Filter based on query
  const filteredLocations = enhancedGlobalLocations
    .filter(location => {
      const locationLower = location.toLowerCase()
      const queryLower = query.toLowerCase()
      
      // Direct match
      if (locationLower.includes(queryLower)) return true
      
      // Match with normalized abbreviations
      if (locationLower.includes(normalizedQuery)) return true
      
      return false
    })
    .slice(0, 10)
    .sort((a, b) => {
      // Prioritize matches that start with the query
      const queryLower = query.toLowerCase()
      const aStartsWith = a.toLowerCase().startsWith(queryLower)
      const bStartsWith = b.toLowerCase().startsWith(queryLower)
      
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      
      return a.localeCompare(b)
    })

  return NextResponse.json({ 
    locations: filteredLocations,
    source: 'static-fallback',
    note: 'Google Places API not configured, using enhanced static list'
  })
}