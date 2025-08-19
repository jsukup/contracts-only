'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface JobPostFormProps {
  skills?: Array<{ id: string; name: string; category?: string }>
  initialData?: any
}

export function JobPostForm({ skills = [], initialData }: JobPostFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    initialData?.jobSkills?.map((js: any) => js.skillId) || []
  )

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    company: initialData?.company || '',
    location: initialData?.location || '',
    isRemote: initialData?.isRemote || false,
    jobType: initialData?.jobType || 'CONTRACT',
    hourlyRateMin: initialData?.hourlyRateMin || '',
    hourlyRateMax: initialData?.hourlyRateMax || '',
    currency: initialData?.currency || 'USD',
    contractDuration: initialData?.contractDuration || '',
    hoursPerWeek: initialData?.hoursPerWeek || '',
    startDate: initialData?.startDate 
      ? new Date(initialData.startDate).toISOString().split('T')[0] 
      : '',
    applicationUrl: initialData?.applicationUrl || '',
    applicationEmail: initialData?.applicationEmail || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint = initialData 
        ? `/api/jobs/${initialData.id}` 
        : '/api/jobs'
      
      const method = initialData ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          hourlyRateMin: parseInt(formData.hourlyRateMin),
          hourlyRateMax: parseInt(formData.hourlyRateMax),
          hoursPerWeek: formData.hoursPerWeek ? parseInt(formData.hoursPerWeek) : null,
          startDate: formData.startDate || null,
          skills: selectedSkills
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save job')
      }

      const job = await response.json()
      router.push(`/jobs/${job.id}`)
    } catch (error) {
      console.error('Error saving job:', error)
      alert('Failed to save job. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    )
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(skill)
    return acc
  }, {} as Record<string, typeof skills>)

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Job Posting' : 'Post a New Job'}
        </CardTitle>
        <CardDescription>
          Fill out the details below to {initialData ? 'update your' : 'create a new'} job posting
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title *</label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g. Senior React Developer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Company *</label>
                <Input
                  required
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Company name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Job Description *</label>
              <textarea
                required
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the role, responsibilities, and requirements..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Type</label>
                <Select
                  value={formData.jobType}
                  onValueChange={(value) => handleInputChange('jobType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="TEMPORARY">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g. New York, NY"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Remote Work</label>
                <Select
                  value={formData.isRemote.toString()}
                  onValueChange={(value) => handleInputChange('isRemote', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">On-site</SelectItem>
                    <SelectItem value="true">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compensation & Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Compensation & Schedule</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Rate/Hour *</label>
                <Input
                  type="number"
                  required
                  value={formData.hourlyRateMin}
                  onChange={(e) => handleInputChange('hourlyRateMin', e.target.value)}
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Rate/Hour *</label>
                <Input
                  type="number"
                  required
                  value={formData.hourlyRateMax}
                  onChange={(e) => handleInputChange('hourlyRateMax', e.target.value)}
                  placeholder="80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contract Duration</label>
                <Input
                  value={formData.contractDuration}
                  onChange={(e) => handleInputChange('contractDuration', e.target.value)}
                  placeholder="e.g. 3 months"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hours/Week</label>
                <Input
                  type="number"
                  value={formData.hoursPerWeek}
                  onChange={(e) => handleInputChange('hoursPerWeek', e.target.value)}
                  placeholder="40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
              />
            </div>
          </div>

          {/* Application Process */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Application Process</h3>
            <p className="text-sm text-muted-foreground">
              Provide either an application URL or email address (or both)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Application URL</label>
                <Input
                  type="url"
                  value={formData.applicationUrl}
                  onChange={(e) => handleInputChange('applicationUrl', e.target.value)}
                  placeholder="https://company.com/apply"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Application Email</label>
                <Input
                  type="email"
                  value={formData.applicationEmail}
                  onChange={(e) => handleInputChange('applicationEmail', e.target.value)}
                  placeholder="jobs@company.com"
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Required Skills</h3>
            
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant={selectedSkills.includes(skill.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSkill(skill.id)}
                    >
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (initialData ? 'Update Job' : 'Post Job')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}