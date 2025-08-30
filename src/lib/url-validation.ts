// URL validation utilities for profile forms

/**
 * Validates if a string is a properly formatted URL
 * @param url - The URL string to validate
 * @returns boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  if (!url.trim()) return true // Empty URLs are allowed (optional fields)
  
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates if a URL is a valid LinkedIn profile URL
 * @param url - The LinkedIn URL string to validate
 * @returns boolean indicating if the LinkedIn URL is valid
 */
export function isValidLinkedInUrl(url: string): boolean {
  if (!url.trim()) return true // Empty URLs are allowed (optional fields)
  
  if (!isValidUrl(url)) return false
  
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Accept linkedin.com and country-specific domains like linkedin.fr
    const linkedInDomains = [
      'linkedin.com',
      'www.linkedin.com'
    ]
    
    // Check for country-specific LinkedIn domains (e.g., linkedin.fr, linkedin.de)
    const countryLinkedInRegex = /^(www\.)?linkedin\.[a-z]{2,3}$/
    
    const isLinkedInDomain = linkedInDomains.includes(hostname) || 
                            countryLinkedInRegex.test(hostname)
    
    if (!isLinkedInDomain) return false
    
    // Check if it's a profile URL pattern
    const pathname = urlObj.pathname.toLowerCase()
    const validPatterns = [
      /^\/in\/[a-zA-Z0-9-]+\/?$/, // /in/username
      /^\/pub\/[a-zA-Z0-9-\/]+\/?$/, // /pub/username (legacy)
      /^\/profile\/view\?id=[0-9]+$/ // /profile/view?id=123 (legacy)
    ]
    
    return validPatterns.some(pattern => pattern.test(pathname))
  } catch {
    return false
  }
}

/**
 * Formats a URL by adding https:// if no protocol is specified
 * @param url - The URL string to format
 * @returns formatted URL string with protocol
 */
export function formatUrl(url: string): string {
  if (!url.trim()) return url
  
  const trimmedUrl = url.trim()
  
  // If it already has a protocol, return as-is
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl
  }
  
  // Add https:// by default
  return `https://${trimmedUrl}`
}

/**
 * Gets user-friendly error messages for URL validation failures
 */
export const URL_VALIDATION_MESSAGES = {
  INVALID_URL: 'Please enter a valid URL (e.g., https://example.com)',
  INVALID_LINKEDIN: 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)',
  INVALID_FORMAT: 'URL must start with http:// or https://'
} as const