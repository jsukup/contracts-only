'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle, CheckCircle, Loader2, RefreshCw, User, Briefcase, AlertTriangle } from 'lucide-react'
import { createProfileWithFallbacks } from '@/lib/profile-creation-utils'
import { useSessionVerification } from '@/lib/auth-helpers'

interface ManualProfileCreationProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  defaultRole?: 'USER' | 'RECRUITER'
  className?: string
}

type CreationStep = 'idle' | 'verifying_auth' | 'creating_profile' | 'success' | 'error'

interface CreationAttempt {
  id: string
  method: string
  status: 'success' | 'failed' | 'running'
  error?: string
  duration?: number
  timestamp: Date
}

export default function ManualProfileCreation({
  onSuccess,
  onError,
  defaultRole = 'USER',
  className = ''
}: ManualProfileCreationProps) {
  const { user } = useUser()
  const { verifySession, isVerifying } = useSessionVerification()
  
  const [selectedRole, setSelectedRole] = useState<'USER' | 'RECRUITER'>(defaultRole)
  const [currentStep, setCurrentStep] = useState<CreationStep>('idle')
  const [attempts, setAttempts] = useState<CreationAttempt[]>([])
  const [lastError, setLastError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const addAttempt = (method: string, status: 'success' | 'failed' | 'running', error?: string, duration?: number) => {
    const attempt: CreationAttempt = {
      id: Math.random().toString(36).substring(7),
      method,
      status,
      error,
      duration,
      timestamp: new Date()
    }
    
    setAttempts(prev => [attempt, ...prev])
    return attempt.id
  }

  const updateAttempt = (id: string, status: 'success' | 'failed', error?: string, duration?: number) => {
    setAttempts(prev => prev.map(attempt => 
      attempt.id === id 
        ? { ...attempt, status, error, duration }
        : attempt
    ))
  }

  const handleManualCreation = async () => {
    console.log(`[MANUAL-PROFILE] Starting manual profile creation for role: ${selectedRole}`)
    setCurrentStep('verifying_auth')
    setLastError(null)
    
    try {
      // Step 1: Verify authentication
      console.log(`[MANUAL-PROFILE] Verifying authentication...`)
      const authVerification = await verifySession()
      
      if (!authVerification.isValid) {
        setCurrentStep('error')
        setLastError(`Authentication failed: ${authVerification.error}`)
        onError?.(authVerification.error || 'Authentication failed')
        return
      }
      
      console.log(`[MANUAL-PROFILE] Authentication verified successfully`)
      
      // Step 2: Create profile with all fallback methods
      setCurrentStep('creating_profile')
      
      const creationStartTime = Date.now()
      const creationResult = await createProfileWithFallbacks(selectedRole, 'ManualProfileCreation')
      const creationDuration = Date.now() - creationStartTime
      
      if (creationResult.success) {
        console.log(`[MANUAL-PROFILE] Profile creation successful via ${creationResult.method}`)
        
        addAttempt(
          creationResult.method || 'unknown',
          'success',
          undefined,
          creationDuration
        )
        
        setCurrentStep('success')
        onSuccess?.()
      } else {
        console.error(`[MANUAL-PROFILE] Profile creation failed:`, creationResult.error)
        
        addAttempt(
          'all_methods',
          'failed',
          creationResult.error,
          creationDuration
        )
        
        setCurrentStep('error')
        setLastError(creationResult.error || 'Profile creation failed')
        onError?.(creationResult.error || 'Profile creation failed')
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error(`[MANUAL-PROFILE] Manual creation error:`, error)
      
      setCurrentStep('error')
      setLastError(errorMessage)
      onError?.(errorMessage)
    }
  }

  const handleRetry = () => {
    setCurrentStep('idle')
    setLastError(null)
  }

  const getStepIcon = () => {
    switch (currentStep) {
      case 'idle':
        return <User className="h-6 w-6 text-blue-500" />
      case 'verifying_auth':
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
      case 'creating_profile':
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />
    }
  }

  const getStepMessage = () => {
    switch (currentStep) {
      case 'idle':
        return 'Ready to create your profile'
      case 'verifying_auth':
        return 'Verifying your authentication...'
      case 'creating_profile':
        return 'Creating your profile with fallback methods...'
      case 'success':
        return 'Profile created successfully!'
      case 'error':
        return `Failed to create profile: ${lastError}`
    }
  }

  const isLoading = currentStep === 'verifying_auth' || currentStep === 'creating_profile' || isVerifying

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStepIcon()}
          <span>Manual Profile Setup</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User Info */}
        {user && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Signed in as:</p>
            <p className="font-medium">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        )}

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select your role:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedRole('USER')}
              disabled={isLoading}
              className={`p-3 border rounded-lg text-left transition-colors ${
                selectedRole === 'USER'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <div>
                  <div className="font-medium text-sm">Contractor</div>
                  <div className="text-xs text-gray-500">Find work</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedRole('RECRUITER')}
              disabled={isLoading}
              className={`p-3 border rounded-lg text-left transition-colors ${
                selectedRole === 'RECRUITER'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center space-x-2">
                <Briefcase className="h-4 w-4" />
                <div>
                  <div className="font-medium text-sm">Employer</div>
                  <div className="text-xs text-gray-500">Hire talent</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div className={`p-3 rounded-lg ${
          currentStep === 'success' ? 'bg-green-50 text-green-800' :
          currentStep === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          <p className="text-sm">{getStepMessage()}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {currentStep === 'idle' && (
            <Button
              onClick={handleManualCreation}
              disabled={isLoading || !user}
              className="w-full"
            >
              Create Profile
            </Button>
          )}
          
          {currentStep === 'error' && (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>

        {/* Debug Information */}
        {attempts.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{showDetails ? 'Hide' : 'Show'} Debug Info</span>
            </button>
            
            {showDetails && (
              <div className="mt-2 space-y-2 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="font-medium text-gray-700 mb-1">Creation Attempts:</p>
                  {attempts.map(attempt => (
                    <div key={attempt.id} className="flex items-center justify-between py-1">
                      <span className="text-gray-600">
                        {attempt.method} 
                        {attempt.duration && ` (${attempt.duration}ms)`}
                      </span>
                      <Badge variant={attempt.status === 'success' ? 'default' : 'destructive'}>
                        {attempt.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Help Text */}
        <div className="text-xs text-gray-500">
          <p>This will create your profile using multiple fallback methods to ensure success.</p>
          {currentStep === 'error' && (
            <p className="mt-1 text-red-600">
              If issues persist, please contact support with the debug information above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}