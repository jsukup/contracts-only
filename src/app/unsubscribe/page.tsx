'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle, XCircle } from 'lucide-react'

interface UnsubscribePreferences {
  newsletter: boolean
  marketing: boolean
  jobAlerts: boolean
  applicationUpdates: boolean
}

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'preferences'>('loading')
  const [message, setMessage] = useState('')
  const [preferences, setPreferences] = useState<UnsubscribePreferences>({
    newsletter: true,
    marketing: true,
    jobAlerts: true,
    applicationUpdates: true
  })
  const [userEmail, setUserEmail] = useState('')

  const token = searchParams?.get('token')
  const type = searchParams?.get('type') // 'all' or 'marketing'

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid unsubscribe link. Please contact support if you continue to receive unwanted emails.')
      return
    }

    // Load current preferences or process immediate unsubscribe
    loadUserPreferences()
  }, [token])

  const loadUserPreferences = async () => {
    try {
      setLoading(true)
      
      // In a real implementation, this would validate the token and load user preferences
      // For now, we'll simulate the process
      
      // Decode basic token (in production, use proper JWT validation)
      try {
        const decoded = atob(token || '')
        const [userId] = decoded.split(':')
        
        if (!userId) {
          throw new Error('Invalid token format')
        }
        
        // Simulate API call to get user preferences
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock user data
        setUserEmail('user@example.com')
        setPreferences({
          newsletter: true,
          marketing: true,
          jobAlerts: true,
          applicationUpdates: true
        })
        
        if (type === 'all') {
          // Immediate unsubscribe from everything
          await processUnsubscribe({
            newsletter: false,
            marketing: false,
            jobAlerts: false,
            applicationUpdates: false
          })
        } else {
          setStatus('preferences')
        }
        
      } catch (error) {
        throw new Error('Invalid or expired unsubscribe link')
      }
      
    } catch (error) {
      console.error('Error loading preferences:', error)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Failed to load unsubscribe preferences')
    } finally {
      setLoading(false)
    }
  }

  const processUnsubscribe = async (newPreferences: UnsubscribePreferences) => {
    try {
      setLoading(true)
      
      // Simulate API call to update preferences
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // In production, this would call your API:
      // const response = await fetch('/api/unsubscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, preferences: newPreferences })
      // })
      
      setStatus('success')
      setMessage('Your email preferences have been updated successfully.')
      
    } catch (error) {
      console.error('Error updating preferences:', error)
      setStatus('error')
      setMessage('Failed to update preferences. Please try again or contact support.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = () => {
    processUnsubscribe(preferences)
  }

  const handleUnsubscribeAll = () => {
    processUnsubscribe({
      newsletter: false,
      marketing: false,
      jobAlerts: false,
      applicationUpdates: false
    })
  }

  const updatePreference = (key: keyof UnsubscribePreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  if (loading && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center space-y-4 pt-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading your preferences...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Email Preferences</h1>
          <p className="text-gray-600 mt-2">
            Manage your email subscriptions and notifications
          </p>
        </div>

        {status === 'error' && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {status === 'success' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-green-700">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-medium">Preferences Updated</p>
                  <p className="text-sm text-green-600">{message}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button 
                  onClick={() => router.push('/')} 
                  variant="outline"
                  className="w-full"
                >
                  Return to ContractsOnly
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'preferences' && (
          <Card>
            <CardHeader>
              <CardTitle>Email Subscription Preferences</CardTitle>
              <CardDescription>
                Choose which emails you'd like to receive from ContractsOnly.
                {userEmail && (
                  <span className="block mt-1 font-medium text-gray-700">
                    Account: {userEmail}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="newsletter"
                    checked={preferences.newsletter}
                    onCheckedChange={(checked) => updatePreference('newsletter', !!checked)}
                  />
                  <label htmlFor="newsletter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Newsletter & Updates
                  </label>
                  <p className="text-xs text-gray-500">Weekly newsletter with platform updates and industry insights</p>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="marketing"
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => updatePreference('marketing', !!checked)}
                  />
                  <label htmlFor="marketing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Marketing & Promotions
                  </label>
                  <p className="text-xs text-gray-500">Feature announcements and special offers</p>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="jobAlerts"
                    checked={preferences.jobAlerts}
                    onCheckedChange={(checked) => updatePreference('jobAlerts', !!checked)}
                  />
                  <label htmlFor="jobAlerts" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Job Alerts
                  </label>
                  <p className="text-xs text-gray-500">Personalized job recommendations based on your profile</p>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="applicationUpdates"
                    checked={preferences.applicationUpdates}
                    onCheckedChange={(checked) => updatePreference('applicationUpdates', !!checked)}
                  />
                  <label htmlFor="applicationUpdates" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Application Updates
                  </label>
                  <p className="text-xs text-gray-500">Status updates on your job applications</p>
                </div>
              </div>

              <div className="border-t pt-6 space-y-3">
                <Button 
                  onClick={handleSavePreferences} 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </Button>
                
                <Button 
                  onClick={handleUnsubscribeAll}
                  variant="outline" 
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  disabled={loading}
                >
                  Unsubscribe from All Emails
                </Button>
              </div>

              <div className="text-xs text-gray-500 pt-4 border-t">
                <p><strong>Note:</strong> Some transactional emails (like password resets) cannot be disabled for security reasons.</p>
                <p className="mt-2">Questions? Contact us at <a href="mailto:support@contracts-only.com" className="text-blue-600 hover:underline">support@contracts-only.com</a></p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}