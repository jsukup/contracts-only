'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  Briefcase,
  Search,
  Star,
  ExternalLink,
  Target,
  Clock,
  DollarSign,
  Heart
} from 'lucide-react'
import Link from 'next/link'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
}

interface UserRole {
  id: 'contractor' | 'employer'
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
}

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedRole, setSelectedRole] = useState<'contractor' | 'employer' | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)

  const userRoles: UserRole[] = [
    {
      id: 'contractor',
      title: 'I\'m looking for contract work',
      description: 'Find short-term contract opportunities with transparent hourly rates',
      icon: <Users className="h-8 w-8 text-blue-500" />,
      features: [
        'Browse contract jobs with clear hourly rates',
        'Filter by skills, rate, and duration',
        'Apply directly to company applications',
        'Build your reputation through ratings'
      ]
    },
    {
      id: 'employer',
      title: 'I need to hire contractors',
      description: 'Post contract positions and connect with skilled professionals',
      icon: <Briefcase className="h-8 w-8 text-green-500" />,
      features: [
        'Post contract jobs with transparent rates',
        'Reach qualified contractor candidates',
        'Manage applications through your own process',
        'Rate contractors after project completion'
      ]
    }
  ]

  const contractorSteps: OnboardingStep[] = [
    {
      id: 'role-selection',
      title: 'Choose Your Role',
      description: 'Let us know how you plan to use ContractsOnly',
      icon: <Target className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'how-it-works',
      title: 'How ContractsOnly Works',
      description: 'Learn about our job board platform',
      icon: <Search className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'profile-setup',
      title: 'Complete Your Profile',
      description: 'Add skills, rate, and experience to get discovered',
      icon: <Users className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'first-search',
      title: 'Find Your First Opportunity',
      description: 'Explore contract jobs matching your skills',
      icon: <Briefcase className="h-6 w-6" />,
      completed: false
    }
  ]

  const employerSteps: OnboardingStep[] = [
    {
      id: 'role-selection',
      title: 'Choose Your Role',
      description: 'Let us know how you plan to use ContractsOnly',
      icon: <Target className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'how-it-works',
      title: 'How ContractsOnly Works',
      description: 'Learn about our job board platform',
      icon: <Search className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'company-setup',
      title: 'Set Up Company Profile',
      description: 'Add company information and hiring preferences',
      icon: <Briefcase className="h-6 w-6" />,
      completed: false
    },
    {
      id: 'first-job',
      title: 'Post Your First Job',
      description: 'Create a contract job posting with transparent rates',
      icon: <DollarSign className="h-6 w-6" />,
      completed: false
    }
  ]

  const steps = selectedRole === 'contractor' ? contractorSteps : employerSteps

  useEffect(() => {
    if (!isLoaded) return
    
    // Check if user has already completed onboarding or has a role set
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
    const userRole = user?.publicMetadata?.role
    
    if (hasCompletedOnboarding || userRole) {
      router.push('/dashboard')
    }
  }, [user, isLoaded, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const handleRoleSelection = async (role: 'contractor' | 'employer') => {
    if (!user || isUpdating) return
    
    setIsUpdating(true)
    setSelectedRole(role)
    
    try {
      // Update user metadata with selected role
      await user.update({
        publicMetadata: {
          role: role === 'contractor' ? 'USER' : 'RECRUITER'
        }
      })

      // Create user profile in Supabase
      await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: role === 'contractor' ? 'USER' : 'RECRUITER'
        })
      })

      setCompletedSteps(prev => new Set([...prev, 'role-selection']))
      setCurrentStep(1)
    } catch (error) {
      console.error('Error updating user role:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]))
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    if (selectedRole) {
      localStorage.setItem('user_role', selectedRole)
    }
    router.push(selectedRole === 'contractor' ? '/jobs' : '/dashboard')
  }

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true')
    router.push('/dashboard')
  }

  const renderStepContent = () => {
    const step = steps[currentStep]

    switch (step.id) {
      case 'role-selection':
        return (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Welcome to ContractsOnly!</h2>
              <p className="text-gray-600">Let's get you started. How do you plan to use our platform?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRoles.map((role) => (
                <Card 
                  key={role.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedRole === role.id ? 'ring-2 ring-blue-500' : ''
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isUpdating && handleRoleSelection(role.id)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      {role.icon}
                      <div>
                        <CardTitle className="text-lg">{role.title}</CardTitle>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {role.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 'how-it-works':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">How ContractsOnly Works</h2>
              <p className="text-gray-600">
                ContractsOnly is a specialized job board connecting {selectedRole === 'contractor' ? 'contractors with opportunities' : 'companies with contractors'}
              </p>
            </div>

            {selectedRole === 'contractor' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Search className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">1. Browse Jobs</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Search contract opportunities with transparent hourly rates, clear durations, and detailed requirements.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 p-2 rounded-full">
                        <ExternalLink className="h-5 w-5 text-green-600" />
                      </div>
                      <CardTitle className="text-lg">2. Apply Directly</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Click "Apply Now" to go directly to the company's application process. We don't manage the hiring - companies do.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                      </div>
                      <CardTitle className="text-lg">3. Work & Deliver</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Complete your contract work directly with the client. All negotiations, payments, and project management happen between you and them.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <Star className="h-5 w-5 text-yellow-600" />
                      </div>
                      <CardTitle className="text-lg">4. Get Rated</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      After contract completion, return to ContractsOnly to exchange ratings and reviews with your client.
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">1. Post Jobs</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Create contract job listings with transparent hourly rates, clear requirements, and your application URL.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <CardTitle className="text-lg">2. Get Discovered</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Qualified contractors browse jobs and click through to your application process when they find a good match.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                      </div>
                      <CardTitle className="text-lg">3. Manage Process</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Handle applications, interviews, and hiring through your own systems. ContractsOnly brings you candidates.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <Star className="h-5 w-5 text-yellow-600" />
                      </div>
                      <CardTitle className="text-lg">4. Leave Reviews</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      After successful contracts, return to rate contractors and help build the community's trust network.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )

      case 'profile-setup':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
              <p className="text-gray-600">
                A complete profile helps companies find and trust you for their projects
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-dashed border-2 border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Professional headline</span>
                    <Badge variant="outline">Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Skills & expertise</span>
                    <Badge variant="outline">Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hourly rate range</span>
                    <Badge variant="outline">Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Location & remote preference</span>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Portfolio/work samples</span>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <Heart className="h-5 w-5 mr-2" />
                    Profile Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-blue-700">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Use a professional headline that clearly states what you do</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>List your most relevant and in-demand skills</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Set competitive but realistic hourly rates</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Include work samples that demonstrate your expertise</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Button asChild>
                <Link href="/profile">
                  Complete Profile Now
                </Link>
              </Button>
            </div>
          </div>
        )

      case 'company-setup':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Set Up Company Profile</h2>
              <p className="text-gray-600">
                Help contractors learn about your company and build trust
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-dashed border-2 border-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Company name & description</span>
                    <Badge variant="outline">Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Industry & company size</span>
                    <Badge variant="outline">Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Location & remote policy</span>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Website & social links</span>
                    <Badge variant="secondary">Optional</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <Target className="h-5 w-5 mr-2" />
                    Company Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-green-700">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Write a clear company description that attracts talent</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Specify your industry and company culture</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Be clear about remote work policies</span>
                  </div>
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
                    <span>Link to your website for credibility</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Button asChild>
                <Link href="/profile">
                  Complete Company Profile
                </Link>
              </Button>
            </div>
          </div>
        )

      case 'first-search':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Find Your First Opportunity</h2>
              <p className="text-gray-600">
                Let's explore contract jobs that match your skills and preferences
              </p>
            </div>

            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium mb-2">Browse & Filter</h3>
                    <p className="text-sm text-gray-600">Use our advanced filters to find jobs matching your skills, rate, and preferences</p>
                  </div>
                  
                  <div>
                    <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-medium mb-2">Check Details</h3>
                    <p className="text-sm text-gray-600">Review hourly rates, duration, requirements, and company information</p>
                  </div>
                  
                  <div>
                    <div className="bg-purple-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <ExternalLink className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-medium mb-2">Apply Direct</h3>
                    <p className="text-sm text-gray-600">Click "Apply Now" to go to the company's application process</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-4">
              <Button size="lg" asChild>
                <Link href="/jobs">
                  <Search className="h-5 w-5 mr-2" />
                  Explore Contract Jobs
                </Link>
              </Button>
              <p className="text-sm text-gray-500">
                Pro tip: Save interesting jobs and set up job alerts to never miss opportunities
              </p>
            </div>
          </div>
        )

      case 'first-job':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Post Your First Job</h2>
              <p className="text-gray-600">
                Create a compelling job listing to attract qualified contractors
              </p>
            </div>

            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                      Job Posting Essentials
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Clear job title and detailed description</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Transparent hourly rate range</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Contract duration and time commitment</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Required skills and experience level</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                        <span>Your application URL or process</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center">
                      <Target className="h-5 w-5 mr-2 text-blue-600" />
                      Best Practices
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                        <span>Be specific about deliverables and expectations</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                        <span>Mention your team, culture, or project details</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                        <span>Set competitive rates to attract quality talent</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="h-4 w-4 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                        <span>Include remote work details if applicable</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center space-y-4">
              <Button size="lg" asChild>
                <Link href="/jobs/post">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Create Job Posting
                </Link>
              </Button>
              <p className="text-sm text-gray-500">
                Jobs stay active for 30 days and can be renewed as needed
              </p>
            </div>
          </div>
        )

      default:
        return <div>Step content not found</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Get Started</h1>
              <Button variant="ghost" onClick={handleSkip} className="text-gray-500">
                Skip for now
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${index <= currentStep 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                    }
                    ${completedSteps.has(step.id) 
                      ? 'bg-green-500 text-white' 
                      : ''
                    }
                  `}>
                    {completedSteps.has(step.id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      w-12 h-1 mx-2
                      ${index < currentStep ? 'bg-blue-500' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </div>
          </div>

          {/* Step Content */}
          <Card className="mb-8">
            <CardContent className="p-8">
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button onClick={handleComplete} className="flex items-center">
                Complete Setup
                <Check className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={steps[currentStep].id === 'role-selection' && !selectedRole}
                className="flex items-center"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}