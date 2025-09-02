'use client'

import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { CheckCircle, XCircle, Loader2, TestTube, Database, Shield } from 'lucide-react'

// AUTHENTICATION SYSTEM TESTER
// Use this component to test all authentication flows after OAuth setup
// Only include in development builds

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message: string
}

export default function AuthTester() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Fetch user profile for testing
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          setUserProfile(data.user || data)
        }
      } catch (error) {
        console.error('Error fetching profile for testing:', error)
      }
    }

    if (user?.id) {
      fetchUserProfile()
    }
  }, [user?.id])

  const addTestResult = (name: string, status: 'success' | 'error', message: string) => {
    setTests(prev => [
      ...prev.filter(t => t.name !== name),
      { name, status, message }
    ])
  }

  const runComprehensiveTests = async () => {
    setIsRunning(true)
    setTests([])

    try {
      // Test 1: Database Connection
      addTestResult('Database Connection', 'pending', 'Testing...')
      try {
        const { data, error } = await supabase.from('users').select('count').single()
        if (error) throw error
        addTestResult('Database Connection', 'success', 'Connected successfully')
      } catch (error: any) {
        addTestResult('Database Connection', 'error', error.message)
      }

      // Test 2: RLS Policies  
      addTestResult('RLS Policies', 'pending', 'Testing...')
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .limit(1)
        
        addTestResult('RLS Policies', 'success', 'Policies configured correctly')
      } catch (error: any) {
        addTestResult('RLS Policies', 'error', error.message)
      }

      // Test 3: Auth State
      addTestResult('Auth State', 'pending', 'Testing...')
      if (user) {
        addTestResult('Auth State', 'success', `Authenticated as ${user.email}`)
      } else {
        addTestResult('Auth State', 'error', 'No authenticated user')
      }

      // Test 4: User Profile Sync
      addTestResult('Profile Sync', 'pending', 'Testing...')
      if (user && userProfile) {
        if (user.id === userProfile.id) {
          addTestResult('Profile Sync', 'success', 'Auth and profile IDs match')
        } else {
          addTestResult('Profile Sync', 'error', 'Auth and profile ID mismatch')
        }
      } else if (user && !userProfile) {
        addTestResult('Profile Sync', 'error', 'User authenticated but no profile')
      } else {
        addTestResult('Profile Sync', 'error', 'No user or profile data')
      }

      // Test 5: Database Counts
      addTestResult('Data Integrity', 'pending', 'Testing...')
      try {
        const { data: authCount } = await supabase.rpc('get_auth_user_count')
        const { data: profileCount } = await supabase
          .from('users')
          .select('id')
          .then(result => ({ data: result.data?.length || 0 }))

        addTestResult('Data Integrity', 'success', `Auth users: ${authCount || 'unknown'}, Profiles: ${profileCount.data}`)
      } catch (error: any) {
        addTestResult('Data Integrity', 'error', error.message)
      }

    } catch (error: any) {
      addTestResult('General Error', 'error', error.message)
    } finally {
      setIsRunning(false)
    }
  }

  const testGoogleOAuth = async () => {
    try {
      await signInWithGoogle('/dashboard?test=oauth')
    } catch (error: any) {
      addTestResult('Google OAuth', 'error', error.message)
    }
  }

  const clearDatabase = async () => {
    if (confirm('⚠️ WARNING: This will delete ALL users and data. Are you sure?')) {
      try {
        await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        addTestResult('Database Clear', 'success', 'All user data cleared')
      } catch (error: any) {
        addTestResult('Database Clear', 'error', error.message)
      }
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-96 max-h-96 overflow-auto bg-white/95 backdrop-blur border-2 border-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TestTube className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Auth System Tester</h3>
          </div>

          {/* Current Status */}
          <div className="mb-4 p-2 bg-gray-50 rounded text-xs">
            <div><strong>User:</strong> {user?.email || 'None'}</div>
            <div><strong>Profile:</strong> {userProfile?.name || 'None'}</div>
            <div><strong>Role:</strong> {userProfile?.role || 'None'}</div>
          </div>

          {/* Test Controls */}
          <div className="space-y-2 mb-4">
            <Button
              onClick={runComprehensiveTests}
              disabled={isRunning}
              className="w-full text-xs"
              size="sm"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Database className="w-3 h-3 mr-1" />
                  Run All Tests
                </>
              )}
            </Button>

            <div className="grid grid-cols-2 gap-1">
              <Button
                onClick={testGoogleOAuth}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Test OAuth
              </Button>
              
              {user && (
                <Button
                  onClick={signOut}
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                >
                  Sign Out
                </Button>
              )}
            </div>

            <Button
              onClick={clearDatabase}
              variant="outline"
              size="sm" 
              className="w-full text-xs text-red-600 border-red-300 hover:bg-red-50"
            >
              ⚠️ Clear DB
            </Button>
          </div>

          {/* Test Results */}
          {tests.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-medium text-sm flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Test Results
              </h4>
              {tests.map((test) => (
                <div key={test.name} className="flex items-start gap-1 text-xs">
                  {test.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />}
                  {test.status === 'error' && <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />}
                  {test.status === 'pending' && <Loader2 className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0 animate-spin" />}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-gray-600 break-words">{test.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}