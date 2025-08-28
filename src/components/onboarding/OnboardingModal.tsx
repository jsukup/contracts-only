'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  X,
  Users,
  Briefcase,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user } = useUser()
  const [selectedRole, setSelectedRole] = useState<'contractor' | 'employer' | null>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleRoleSelection = (role: 'contractor' | 'employer') => {
    setSelectedRole(role)
    localStorage.setItem('user_role', role)
    localStorage.setItem('onboarding_shown', 'true')
    onClose()
  }

  const handleSkip = () => {
    localStorage.setItem('onboarding_shown', 'true')
    onClose()
  }

  const handleFullOnboarding = () => {
    localStorage.setItem('onboarding_shown', 'true')
    onClose()
    // Navigation will be handled by the Link component
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Welcome to ContractsOnly!</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Let's get you started with the right experience
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-2">How do you plan to use ContractsOnly?</h2>
            <p className="text-gray-600 text-sm">
              This helps us customize your dashboard and recommendations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contractor Option */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                selectedRole === 'contractor' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedRole('contractor')}
            >
              <CardContent className="p-6 text-center">
                <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">I'm looking for contract work</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Find short-term opportunities with transparent rates
                </p>
                <ul className="text-xs text-left space-y-1 text-gray-500">
                  <li className="flex items-center">
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Browse contract jobs
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Apply directly to companies
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Build your reputation
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Employer Option */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                selectedRole === 'employer' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedRole('employer')}
            >
              <CardContent className="p-6 text-center">
                <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">I need to hire contractors</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Post jobs and connect with skilled professionals
                </p>
                <ul className="text-xs text-left space-y-1 text-gray-500">
                  <li className="flex items-center">
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Post contract positions
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Reach qualified candidates
                  </li>
                  <li className="flex items-center">
                    <Check className="h-3 w-3 mr-1 text-green-500" />
                    Manage your own hiring
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {selectedRole && (
              <Button 
                className="w-full" 
                onClick={() => handleRoleSelection(selectedRole)}
                size="lg"
              >
                Continue as {selectedRole === 'contractor' ? 'Contractor' : 'Employer'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            <div className="text-center space-x-4 text-sm">
              <Button variant="ghost" size="sm" asChild onClick={handleFullOnboarding}>
                <Link href="/onboarding">
                  Take full tour
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip for now
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Quick Start Tip</p>
                <p className="text-blue-700">
                  ContractsOnly is a job board - we connect you but don't manage contracts or payments. 
                  Companies handle their own application processes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}