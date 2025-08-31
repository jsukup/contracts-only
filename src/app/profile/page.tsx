'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import LocationAutocomplete from '@/components/ui/LocationAutocomplete'
import ProfessionalTitleAutocomplete from '@/components/ui/ProfessionalTitleAutocomplete'
import { isValidUrl, isValidLinkedInUrl, formatUrl, URL_VALIDATION_MESSAGES } from '@/lib/url-validation'
import { User, Mail, Globe, MapPin, DollarSign, Clock, AlertTriangle, Loader2, Save, Camera } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileFormData {
  name: string
  title: string
  bio: string
  location: string
  website: string
  linkedin_url: string
  hourly_rate_min: string
  hourly_rate_max: string
  availability: string
  job_alerts_enabled: boolean
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    title: '',
    bio: '',
    location: '',
    website: '',
    linkedin_url: '',
    hourly_rate_min: '',
    hourly_rate_max: '',
    availability: 'AVAILABLE',
    job_alerts_enabled: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState({
    website: '',
    linkedin_url: ''
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/auth/signin?callbackUrl=/profile')
    }
  }, [user, isLoaded, router])

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/profile')
      
      if (!response.ok) {
        if (response.status === 404) {
          // User profile doesn't exist yet
          setUserProfile(null)
          return
        }
        throw new Error(`Failed to fetch profile: ${response.status}`)
      }
      
      const data = await response.json()
      setUserProfile(data.user || data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh user profile data
  const refreshUserProfile = async () => {
    await fetchUserProfile()
  }

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile()
    }
  }, [user?.id])

  // Load user data when available
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        title: userProfile.title || '',
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        website: userProfile.website || '',
        linkedin_url: userProfile.linkedin_url || '',
        hourly_rate_min: userProfile.hourly_rate_min?.toString() || '',
        hourly_rate_max: userProfile.hourly_rate_max?.toString() || '',
        availability: userProfile.availability || 'AVAILABLE',
        job_alerts_enabled: userProfile.job_alerts_enabled ?? true
      })
    }
  }, [userProfile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setHasChanges(true)

    // Clear validation errors when user starts typing for URL fields
    if (name === 'website' || name === 'linkedin_url') {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // Handle URL validation on blur
  const handleUrlBlur = (field: 'website' | 'linkedin_url', value: string) => {
    if (!value.trim()) {
      setErrors(prev => ({ ...prev, [field]: '' }))
      return
    }

    let isValid = false
    let errorMessage = ''
    let formattedValue = value

    // Auto-format URL if it doesn't start with http/https
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      formattedValue = formatUrl(value)
    }

    if (field === 'website') {
      isValid = isValidUrl(formattedValue)
      errorMessage = isValid ? '' : URL_VALIDATION_MESSAGES.INVALID_URL
    } else if (field === 'linkedin_url') {
      isValid = isValidLinkedInUrl(formattedValue)
      errorMessage = isValid ? '' : URL_VALIDATION_MESSAGES.INVALID_LINKEDIN
    }

    setErrors(prev => ({ ...prev, [field]: errorMessage }))

    // Auto-format URL if valid and different from original
    if (isValid && formattedValue !== value) {
      setFormData(prev => ({ ...prev, [field]: formattedValue }))
    }
  }

  // Validation function for rate fields
  const validateRates = () => {
    const minRate = parseInt(formData.hourly_rate_min) || 0
    const maxRate = parseInt(formData.hourly_rate_max) || 0
    
    if (minRate > 0 && maxRate > 0 && minRate > maxRate) {
      toast.error('Minimum rate cannot be higher than maximum rate')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate rates before submission
    if (!validateRates()) {
      return
    }

    // Validate URL fields before saving
    let hasErrors = false
    const newErrors = { website: '', linkedin_url: '' }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = URL_VALIDATION_MESSAGES.INVALID_URL
      hasErrors = true
    }

    if (formData.linkedin_url && !isValidLinkedInUrl(formData.linkedin_url)) {
      newErrors.linkedin_url = URL_VALIDATION_MESSAGES.INVALID_LINKEDIN
      hasErrors = true
    }

    setErrors(newErrors)

    if (hasErrors) {
      toast.error('Please fix the validation errors before saving')
      return
    }

    setIsSubmitting(true)
    try {
      const updates = {
        name: formData.name || null,
        title: formData.title || null,
        bio: formData.bio || null,
        location: formData.location || null,
        website: formData.website || null,
        linkedinUrl: formData.linkedin_url || null,
        hourlyRateMin: formData.hourly_rate_min ? parseInt(formData.hourly_rate_min) : null,
        hourlyRateMax: formData.hourly_rate_max ? parseInt(formData.hourly_rate_max) : null,
        availability: formData.availability,
        job_alerts_enabled: formData.job_alerts_enabled
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      await refreshUserProfile()
      setHasChanges(false)
      toast.success('Profile updated successfully!')
      
      // Redirect to Browse Jobs page after successful save
      setTimeout(() => {
        router.push('/jobs')
      }, 1500) // Give time for success toast to be seen
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  // Show redirect if not authenticated
  if (!user) {
    return null
  }

  const isRecruiter = userProfile?.role === 'RECRUITER'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your personal information and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1">
                    {isRecruiter ? 'Position at Company' : 'Professional Title'}
                  </label>
                  {isRecruiter ? (
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Senior Talent Acquisition Manager"
                    />
                  ) : (
                    <ProfessionalTitleAutocomplete
                      value={formData.title}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, title: value }))
                        setHasChanges(true)
                      }}
                      placeholder="e.g., Senior Software Engineer"
                      className="w-full"
                    />
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-900 mb-1">
                  {isRecruiter ? 'Company Description' : 'Bio'}
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={isRecruiter ? "Describe your company and what you're looking for in candidates..." : "Tell us about yourself and your experience..."}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-900 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location
                  </label>
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                    placeholder="e.g., Chicago, IL, USA"
                  />
                </div>
                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-gray-900 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Availability
                  </label>
                  <select
                    id="availability"
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="BUSY">Busy</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-900 mb-1">
                  {isRecruiter ? 'Recruitment Website' : 'Website'}
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  onBlur={(e) => handleUrlBlur('website', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.website ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={isRecruiter ? "https://company-careers.com" : "https://yourwebsite.com"}
                />
                {errors.website && (
                  <p className="text-sm text-red-500 mt-1">{errors.website}</p>
                )}
              </div>
              <div>
                <label htmlFor="linkedin_url" className="block text-sm font-medium text-gray-900 mb-1">
                  LinkedIn Profile
                </label>
                <input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  onBlur={(e) => handleUrlBlur('linkedin_url', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.linkedin_url ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                {errors.linkedin_url && (
                  <p className="text-sm text-red-500 mt-1">{errors.linkedin_url}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rate Information */}
          {!isRecruiter && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Rate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="hourly_rate_min" className="block text-sm font-medium text-gray-900 mb-1">
                      Desired Rate (Min/hr)
                    </label>
                    <input
                      id="hourly_rate_min"
                      name="hourly_rate_min"
                      type="number"
                      min="0"
                      value={formData.hourly_rate_min}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        parseInt(formData.hourly_rate_min) > parseInt(formData.hourly_rate_max) && 
                        parseInt(formData.hourly_rate_max) > 0 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                      }`}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label htmlFor="hourly_rate_max" className="block text-sm font-medium text-gray-900 mb-1">
                      Desired Rate (Max/hr)
                    </label>
                    <input
                      id="hourly_rate_max"
                      name="hourly_rate_max"
                      type="number"
                      min="0"
                      value={formData.hourly_rate_max}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        parseInt(formData.hourly_rate_min) > parseInt(formData.hourly_rate_max) && 
                        parseInt(formData.hourly_rate_min) > 0 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                      }`}
                      placeholder="100"
                    />
                  </div>
                </div>
                {parseInt(formData.hourly_rate_min) > parseInt(formData.hourly_rate_max) && 
                 parseInt(formData.hourly_rate_min) > 0 && parseInt(formData.hourly_rate_max) > 0 && (
                  <div className="flex items-center text-red-600 text-sm mt-2">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Minimum rate cannot be higher than maximum rate
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <input
                  id="job_alerts_enabled"
                  name="job_alerts_enabled"
                  type="checkbox"
                  checked={formData.job_alerts_enabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="job_alerts_enabled" className="ml-2 block text-sm text-gray-900">
                  Receive job alerts via email
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}