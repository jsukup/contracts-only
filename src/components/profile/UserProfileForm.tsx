'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import LocationAutocomplete from '@/components/ui/LocationAutocomplete'
import ProfessionalTitleAutocomplete from '@/components/ui/ProfessionalTitleAutocomplete'
import { User, MapPin, Globe, Linkedin, DollarSign, Calendar, Save, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { isValidUrl, isValidLinkedInUrl, formatUrl, URL_VALIDATION_MESSAGES } from '@/lib/url-validation'

interface UserProfile {
  id: string
  email: string
  name: string | null
  title: string | null
  bio: string | null
  location: string | null
  website: string | null
  linkedinUrl: string | null
  hourlyRateMin: number | null
  hourlyRateMax: number | null
  availability: 'AVAILABLE' | 'BUSY' | 'NOT_LOOKING'
  userSkills: Array<{
    id: string
    skill: {
      id: string
      name: string
      category: string | null
    }
  }>
}

interface Skill {
  id: string
  name: string
  category: string | null
}

export default function UserProfileForm() {
  const { user } = useUser()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  
  // Form validation errors
  const [errors, setErrors] = useState({
    website: '',
    linkedinUrl: ''
  })

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    bio: '',
    location: '',
    website: '',
    linkedinUrl: '',
    hourlyRateMin: '',
    hourlyRateMax: '',
    availability: 'AVAILABLE' as const
  })

  useEffect(() => {
    if (!user?.email) return

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/profile')
        if (!response.ok) throw new Error('Failed to fetch profile')
        
        const data = await response.json()
        setProfile(data.profile)
        
        // Populate form data
        setFormData({
          name: data.profile.name || '',
          title: data.profile.title || '',
          bio: data.profile.bio || '',
          location: data.profile.location || '',
          website: data.profile.website || '',
          linkedinUrl: data.profile.linkedinUrl || '',
          hourlyRateMin: data.profile.hourlyRateMin?.toString() || '',
          hourlyRateMax: data.profile.hourlyRateMax?.toString() || '',
          availability: data.profile.availability || 'AVAILABLE'
        })
        
        // Set selected skills
        setSelectedSkills(data.profile.userSkills.map((us: any) => us.skill.id))
      } catch (err) {
        console.error('Profile fetch error:', err)
        toast.error('Failed to load profile. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills')
        if (response.ok) {
          const data = await response.json()
          setSkills(data.skills || [])
        }
      } catch (err) {
        console.error('Failed to fetch skills:', err)
      }
    }

    fetchProfile()
    fetchSkills()
  }, [user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear validation errors when user starts typing
    if (field === 'website' || field === 'linkedinUrl') {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  // Validate URL fields on blur
  const handleUrlBlur = (field: 'website' | 'linkedinUrl', value: string) => {
    if (!value.trim()) {
      setErrors(prev => ({ ...prev, [field]: '' }))
      return
    }

    let isValid = false
    let errorMessage = ''

    if (field === 'website') {
      isValid = isValidUrl(value)
      errorMessage = isValid ? '' : URL_VALIDATION_MESSAGES.INVALID_URL
    } else if (field === 'linkedinUrl') {
      isValid = isValidLinkedInUrl(value)
      errorMessage = isValid ? '' : URL_VALIDATION_MESSAGES.INVALID_LINKEDIN
    }

    setErrors(prev => ({ ...prev, [field]: errorMessage }))

    // Auto-format URL if valid but missing protocol
    if (isValid && value && !value.startsWith('http')) {
      const formattedUrl = formatUrl(value)
      setFormData(prev => ({ ...prev, [field]: formattedUrl }))
    }
  }

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    )
  }

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSkill.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setSkills(prev => [...prev, data.skill])
        setSelectedSkills(prev => [...prev, data.skill.id])
        setNewSkill('')
        toast.success('Skill added successfully')
      }
    } catch (err) {
      toast.error('Failed to add skill')
    }
  }

  const handleSave = async () => {
    if (!user?.email) return

    // Validate URL fields before saving
    let hasErrors = false
    const newErrors = { website: '', linkedinUrl: '' }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = URL_VALIDATION_MESSAGES.INVALID_URL
      hasErrors = true
    }

    if (formData.linkedinUrl && !isValidLinkedInUrl(formData.linkedinUrl)) {
      newErrors.linkedinUrl = URL_VALIDATION_MESSAGES.INVALID_LINKEDIN
      hasErrors = true
    }

    setErrors(newErrors)

    if (hasErrors) {
      toast.error('Please fix the validation errors before saving')
      return
    }

    try {
      setSaving(true)
      
      const profileData = {
        ...formData,
        hourlyRateMin: formData.hourlyRateMin ? parseInt(formData.hourlyRateMin) : null,
        hourlyRateMax: formData.hourlyRateMax ? parseInt(formData.hourlyRateMax) : null,
        skills: selectedSkills
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Profile update error:', errorData)
        throw new Error(errorData.error || 'Failed to update profile')
      }

      // Note: Session update handled by Supabase auth context
      const result = await response.json()
      console.log('Profile updated successfully:', result)

      toast.success('Profile updated successfully')
      
      // Redirect to Browse Jobs page after successful save
      setTimeout(() => {
        router.push('/jobs')
      }, 1500) // Give time for success toast to be seen
    } catch (err) {
      console.error('Profile save error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const availabilityOptions = [
    { value: 'AVAILABLE', label: 'Available', color: 'bg-green-100 text-green-800' },
    { value: 'BUSY', label: 'Busy', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'NOT_LOOKING', label: 'Not Looking', color: 'bg-red-100 text-red-800' }
  ]

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Professional Title</label>
              <ProfessionalTitleAutocomplete
                value={formData.title}
                onChange={(value) => handleInputChange('title', value)}
                placeholder="e.g., Full Stack Developer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself, your experience, and what you're looking for..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <LocationAutocomplete
                value={formData.location}
                onChange={(value) => handleInputChange('location', value)}
                placeholder="e.g., Chicago, IL, USA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Availability Status</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.availability}
                onChange={(e) => handleInputChange('availability', e.target.value)}
              >
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Website
              </label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                onBlur={(e) => handleUrlBlur('website', e.target.value)}
                placeholder="https://yourwebsite.com"
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-500 mt-1">{errors.website}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                <Linkedin className="h-4 w-4" />
                LinkedIn URL
              </label>
              <Input
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                onBlur={(e) => handleUrlBlur('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className={errors.linkedinUrl ? 'border-red-500' : ''}
              />
              {errors.linkedinUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.linkedinUrl}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Desired Hourly Rate Range (USD)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                value={formData.hourlyRateMin}
                onChange={(e) => handleInputChange('hourlyRateMin', e.target.value)}
                placeholder="Min desired rate"
                min="0"
              />
              <Input
                type="number"
                value={formData.hourlyRateMax}
                onChange={(e) => handleInputChange('hourlyRateMax', e.target.value)}
                placeholder="Max desired rate"
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a new skill"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
            />
            <Button onClick={handleAddSkill} disabled={!newSkill.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill.id}
                variant={selectedSkills.includes(skill.id) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => handleSkillToggle(skill.id)}
              >
                {skill.name}
                {selectedSkills.includes(skill.id) && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>

          {selectedSkills.length === 0 && (
            <p className="text-sm text-gray-500">
              Select skills that represent your expertise. Click on any skill to add or remove it.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  )
}