'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { 
  Briefcase, 
  DollarSign, 
  MapPin, 
  Clock, 
  Calendar,
  Plus,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { redirect } from 'next/navigation'

interface JobFormData {
  title: string
  company: string
  description: string
  requirements: string
  benefits?: string
  location?: string
  isRemote: boolean
  jobType: 'contract' | 'freelance' | 'temporary'
  hourlyRateMin: number
  hourlyRateMax: number
  currency: string
  contractDuration?: string
  hoursPerWeek?: number
  skills: string[]
  applicationDeadline?: string
}

export default function PostJobPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    company: '',
    description: '',
    requirements: '',
    benefits: '',
    location: '',
    isRemote: false,
    jobType: 'contract',
    hourlyRateMin: 0,
    hourlyRateMax: 0,
    currency: 'USD',
    contractDuration: '',
    hoursPerWeek: 40,
    skills: [],
    applicationDeadline: ''
  })

  if (!user) {
    redirect('/auth/signin?callbackUrl=/jobs/post')
  }

  const handleInputChange = (field: keyof JobFormData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) newErrors.title = 'Job title is required'
    if (!formData.company.trim()) newErrors.company = 'Company name is required'
    if (!formData.description.trim()) newErrors.description = 'Job description is required'
    if (!formData.requirements.trim()) newErrors.requirements = 'Requirements are required'
    
    if (formData.hourlyRateMin <= 0) newErrors.hourlyRateMin = 'Minimum rate must be greater than 0'
    if (formData.hourlyRateMax <= 0) newErrors.hourlyRateMax = 'Maximum rate must be greater than 0'
    if (formData.hourlyRateMin > formData.hourlyRateMax) {
      newErrors.hourlyRateMax = 'Maximum rate must be greater than minimum rate'
    }
    
    if (!formData.isRemote && !formData.location?.trim()) {
      newErrors.location = 'Location is required for non-remote jobs'
    }

    if (formData.skills.length === 0) {
      newErrors.skills = 'At least one skill is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const job = await response.json()
        router.push(`/jobs/${job.id}`)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to post job. Please try again.')
      }
    } catch (error) {
      console.error('Error posting job:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Post a Contract Job</h1>
          <p className="text-muted-foreground mt-2">
            Find talented contractors for your short-term needs
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>Job Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Senior React Developer"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="e.g., Tech Solutions Inc."
                  className={errors.company ? 'border-red-500' : ''}
                />
                {errors.company && (
                  <p className="text-sm text-red-500 mt-1">{errors.company}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.jobType}
                  onChange={(e) => handleInputChange('jobType', e.target.value)}
                >
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`w-full px-3 py-2 border rounded-md ${errors.description ? 'border-red-500' : ''}`}
                  rows={6}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the role, responsibilities, and what makes this opportunity unique..."
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Requirements <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`w-full px-3 py-2 border rounded-md ${errors.requirements ? 'border-red-500' : ''}`}
                  rows={4}
                  value={formData.requirements}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  placeholder="List the required skills, experience, and qualifications..."
                />
                {errors.requirements && (
                  <p className="text-sm text-red-500 mt-1">{errors.requirements}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Benefits (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  value={formData.benefits}
                  onChange={(e) => handleInputChange('benefits', e.target.value)}
                  placeholder="List any additional benefits or perks..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Location & Remote */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isRemote"
                  checked={formData.isRemote}
                  onChange={(e) => handleInputChange('isRemote', e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="isRemote" className="text-sm font-medium">
                  This is a remote position
                </label>
              </div>

              {!formData.isRemote && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    className={errors.location ? 'border-red-500' : ''}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500 mt-1">{errors.location}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Compensation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Currency</label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Min Rate/Hour <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.hourlyRateMin}
                    onChange={(e) => handleInputChange('hourlyRateMin', parseInt(e.target.value))}
                    placeholder="50"
                    className={errors.hourlyRateMin ? 'border-red-500' : ''}
                  />
                  {errors.hourlyRateMin && (
                    <p className="text-sm text-red-500 mt-1">{errors.hourlyRateMin}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Rate/Hour <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.hourlyRateMax}
                    onChange={(e) => handleInputChange('hourlyRateMax', parseInt(e.target.value))}
                    placeholder="100"
                    className={errors.hourlyRateMax ? 'border-red-500' : ''}
                  />
                  {errors.hourlyRateMax && (
                    <p className="text-sm text-red-500 mt-1">{errors.hourlyRateMax}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contract Duration (Optional)
                  </label>
                  <Input
                    value={formData.contractDuration}
                    onChange={(e) => handleInputChange('contractDuration', e.target.value)}
                    placeholder="e.g., 3-6 months"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hours per Week (Optional)
                  </label>
                  <Input
                    type="number"
                    value={formData.hoursPerWeek}
                    onChange={(e) => handleInputChange('hoursPerWeek', parseInt(e.target.value))}
                    placeholder="40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add a required skill..."
                  />
                  <Button type="button" onClick={addSkill} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {errors.skills && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.skills}
                  </p>
                )}

                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-2 text-xs hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Application Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Application Deadline (Optional)
                </label>
                <Input
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => handleInputChange('applicationDeadline', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Job'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}