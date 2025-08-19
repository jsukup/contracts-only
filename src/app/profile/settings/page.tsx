'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github,
  Save,
  Loader2,
  Plus,
  X
} from 'lucide-react'
import { redirect } from 'next/navigation'

interface ProfileData {
  name: string
  email: string
  phone?: string
  location?: string
  bio?: string
  hourlyRate?: number
  currency: string
  website?: string
  linkedin?: string
  github?: string
  skills: string[]
  availability: 'available' | 'busy' | 'not_available'
}

export default function ProfileSettingsPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    currency: 'USD',
    skills: [],
    availability: 'available'
  })
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/profile/${session?.user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setProfile({
          name: data.name || session?.user?.name || '',
          email: data.email || session?.user?.email || '',
          phone: data.phone || '',
          location: data.location || '',
          bio: data.bio || '',
          hourlyRate: data.hourlyRate,
          currency: data.currency || 'USD',
          website: data.website || '',
          linkedin: data.linkedin || '',
          github: data.github || '',
          skills: data.skills || [],
          availability: data.availability || 'available'
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/profile/${session?.user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        alert('Profile updated successfully!')
      } else {
        alert('Failed to update profile. Please try again.')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <Input
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={profile.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Hourly Rate</label>
                  <div className="flex items-center space-x-2">
                    <select
                      className="px-3 py-2 border rounded-md"
                      value={profile.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                    <Input
                      type="number"
                      value={profile.hourlyRate || ''}
                      onChange={(e) => handleInputChange('hourlyRate', parseInt(e.target.value))}
                      placeholder="75"
                    />
                    <span className="text-muted-foreground">/hour</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Availability</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={profile.availability}
                    onChange={(e) => handleInputChange('availability', e.target.value)}
                  >
                    <option value="available">Available for work</option>
                    <option value="busy">Currently busy</option>
                    <option value="not_available">Not available</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Skills</label>
                <div className="flex items-center space-x-2 mb-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill..."
                  />
                  <Button onClick={addSkill} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-2 text-xs hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Website</label>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    value={profile.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn</label>
                <div className="flex items-center space-x-2">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={profile.linkedin}
                    onChange={(e) => handleInputChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">GitHub</label>
                <div className="flex items-center space-x-2">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={profile.github}
                    onChange={(e) => handleInputChange('github', e.target.value)}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}