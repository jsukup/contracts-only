'use client'

import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import ManualProfileCreation from '@/components/auth/ManualProfileCreation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useSessionVerification } from '@/lib/auth-helpers'
import { useEffect, useState } from 'react'

export default function ProfileCreationDebugPage() {
  const { user, isLoaded } = useUser()
  const { verifySession, verificationState } = useSessionVerification()
  const [hasVerified, setHasVerified] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      redirect('/sign-in')
    }
  }, [user, isLoaded])

  // Auto-verify session on page load
  useEffect(() => {
    if (user && !hasVerified) {
      verifySession()
      setHasVerified(true)
    }
  }, [user, verifySession, hasVerified])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  const handleSuccess = () => {
    alert('Profile created successfully! You can now close this page.')
  }

  const handleError = (error: string) => {
    console.error('Profile creation failed:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Profile Creation Debug Tool
            </h1>
            <p className="text-gray-600">
              Use this tool to manually create your profile if automatic creation failed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Authentication Status */}
            <Card>
              <CardHeader>
                <CardTitle>Authentication Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">User Authenticated</span>
                  <Badge variant={user ? 'default' : 'destructive'}>
                    {user ? 'Yes' : 'No'}
                  </Badge>
                </div>
                
                {user && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm font-medium">
                        {user.primaryEmailAddress?.emailAddress}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">User ID</span>
                      <span className="text-sm font-mono">
                        {user.id.substring(0, 12)}...
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Role</span>
                      <Badge variant="outline">
                        {user.publicMetadata?.role as string || 'Not Set'}
                      </Badge>
                    </div>
                  </>
                )}

                {verificationState && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Session Valid</span>
                      <Badge variant={verificationState.isValid ? 'default' : 'destructive'}>
                        {verificationState.isValid ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    
                    {verificationState.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                        {verificationState.error}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Profile Creation */}
            <ManualProfileCreation
              onSuccess={handleSuccess}
              onError={handleError}
              defaultRole={user.publicMetadata?.role === 'RECRUITER' ? 'RECRUITER' : 'USER'}
            />
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use This Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Verify your authentication status is showing as valid above</li>
                <li>Select your role (Contractor for finding work, Employer for hiring)</li>
                <li>Click "Create Profile" to attempt profile creation with all fallback methods</li>
                <li>If creation fails, check the debug information and try again</li>
                <li>Contact support if issues persist, including the debug information</li>
              </ol>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This tool uses multiple fallback methods including server actions 
                  and API calls with retry logic to ensure profile creation succeeds.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Debug Links */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Debug Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/api/debug/auth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">Auth Debug API</div>
                  <div className="text-xs text-gray-600">Test authentication endpoint</div>
                </a>
                
                <a
                  href="/api/webhooks/clerk/test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">Webhook Test</div>
                  <div className="text-xs text-gray-600">Test webhook endpoint</div>
                </a>
                
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-left"
                >
                  <div className="text-sm font-medium text-gray-900">Go to Dashboard</div>
                  <div className="text-xs text-gray-600">Return to main app</div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}