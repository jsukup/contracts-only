'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { User, Mail, Globe, MapPin, DollarSign, Clock, AlertTriangle, Loader2, Save, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
  desired_rate_min: string
  desired_rate_max: string
  availability: string
  job_alerts_enabled: boolean
}

export default function ProfilePage() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    title: '',
    bio: '',
    location: '',
    website: '',
    linkedin_url: '',
    hourly_rate_min: '',
    hourly_rate_max: '',
    desired_rate_min: '',
    desired_rate_max: '',
    availability: 'AVAILABLE',
    job_alerts_enabled: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?callbackUrl=/profile')
    }
  }, [user, loading, router])

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
        desired_rate_min: userProfile.desired_rate_min?.toString() || '',
        desired_rate_max: userProfile.desired_rate_max?.toString() || '',
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      const updates = {
        name: formData.name || null,
        title: formData.title || null,
        bio: formData.bio || null,
        location: formData.location || null,
        website: formData.website || null,
        linkedin_url: formData.linkedin_url || null,
        hourly_rate_min: formData.hourly_rate_min ? parseInt(formData.hourly_rate_min) : null,
        hourly_rate_max: formData.hourly_rate_max ? parseInt(formData.hourly_rate_max) : null,
        desired_rate_min: formData.desired_rate_min ? parseInt(formData.desired_rate_min) : null,
        desired_rate_max: formData.desired_rate_max ? parseInt(formData.desired_rate_max) : null,
        availability: formData.availability,
        job_alerts_enabled: formData.job_alerts_enabled,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      await refreshUserProfile()
      setHasChanges(false)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state
  if (loading) {
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
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Senior Software Engineer"
                  />
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
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., San Francisco, CA"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={isRecruiter ? "https://company-careers.com" : "https://yourwebsite.com"}
                />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
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
                      Current Rate (Min/hr)
                    </label>
                    <input
                      id="hourly_rate_min"
                      name="hourly_rate_min"
                      type="number"
                      min="0"
                      value={formData.hourly_rate_min}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label htmlFor="hourly_rate_max" className="block text-sm font-medium text-gray-900 mb-1">
                      Current Rate (Max/hr)
                    </label>
                    <input
                      id="hourly_rate_max"
                      name="hourly_rate_max"
                      type="number"
                      min="0"
                      value={formData.hourly_rate_max}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="desired_rate_min" className="block text-sm font-medium text-gray-900 mb-1">
                      Desired Rate (Min/hr)
                    </label>
                    <input
                      id="desired_rate_min"
                      name="desired_rate_min"
                      type="number"
                      min="0"
                      value={formData.desired_rate_min}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <label htmlFor="desired_rate_max" className="block text-sm font-medium text-gray-900 mb-1">
                      Desired Rate (Max/hr)
                    </label>
                    <input
                      id="desired_rate_max"
                      name="desired_rate_max"
                      type="number"
                      min="0"
                      value={formData.desired_rate_max}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="120"
                    />
                  </div>
                </div>
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
              className="bg-indigo-600 hover:bg-indigo-700"
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