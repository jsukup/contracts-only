'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { UserCheck, Briefcase, X } from 'lucide-react'

interface RoleSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRole: (role: 'USER' | 'RECRUITER') => void
  userEmail: string
}

export default function RoleSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectRole, 
  userEmail 
}: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<'USER' | 'RECRUITER' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleRoleSelect = (role: 'USER' | 'RECRUITER') => {
    setSelectedRole(role)
  }

  const handleConfirm = async () => {
    if (!selectedRole) return
    
    setIsSubmitting(true)
    try {
      await onSelectRole(selectedRole)
    } catch (error) {
      console.error('Error selecting role:', error)
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    // Default to USER role if user skips
    setIsSubmitting(true)
    onSelectRole('USER')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="bg-white w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Welcome to ContractsOnly!</h2>
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Skip role selection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-2">
              Hi {userEmail}! Please tell us what brings you here:
            </p>
            <p className="text-sm text-gray-500">
              This helps us customize your experience
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleRoleSelect('USER')}
              className={`w-full flex items-center p-4 border rounded-lg transition-all text-left ${
                selectedRole === 'USER'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <UserCheck className="w-6 h-6 mr-4 flex-shrink-0" />
              <div>
                <div className="font-semibold">I'm a Contractor</div>
                <div className="text-sm opacity-75">
                  Looking for contract work and freelance opportunities
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect('RECRUITER')}
              className={`w-full flex items-center p-4 border rounded-lg transition-all text-left ${
                selectedRole === 'RECRUITER'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <Briefcase className="w-6 h-6 mr-4 flex-shrink-0" />
              <div>
                <div className="font-semibold">I'm a Recruiter</div>
                <div className="text-sm opacity-75">
                  Posting jobs and hiring contractors for projects
                </div>
              </div>
            </button>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleConfirm}
              disabled={!selectedRole || isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Setting up...' : 'Continue'}
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              disabled={isSubmitting}
              className="px-6 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Skip
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            You can always change this later in your profile settings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}