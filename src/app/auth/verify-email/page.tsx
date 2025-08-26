'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth()

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        console.log('Starting email verification process...')
        
        // Check if we have token_hash and type parameters from Supabase
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')

        console.log('Verification params:', { 
          hasTokenHash: !!tokenHash, 
          type, 
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken 
        })

        if (!tokenHash && !accessToken) {
          setStatus('error')
          setMessage('Invalid verification link. Please try signing up again.')
          return
        }

        // Handle different verification methods
        if (tokenHash && type === 'email') {
          // Method 1: Token hash verification (most common)
          console.log('Using token hash verification...')
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email'
          })

          if (error) {
            console.error('Token verification error:', error)
            setStatus('error')
            setMessage(`Verification failed: ${error.message}`)
            return
          }

          console.log('Token verification successful:', data.user?.id?.substring(0, 8) + '...')
        } else if (accessToken && refreshToken) {
          // Method 2: Direct session establishment
          console.log('Using access token session establishment...')
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('Session establishment error:', error)
            setStatus('error')
            setMessage(`Session failed: ${error.message}`)
            return
          }

          console.log('Session established successfully:', data.user?.id?.substring(0, 8) + '...')
        } else {
          setStatus('error')
          setMessage('Invalid verification parameters. Please try signing up again.')
          return
        }

        // Wait for AuthContext to process the auth state change
        console.log('Waiting for auth context to update...')
        
        // Wait up to 5 seconds for auth state to update
        let attempts = 0
        const maxAttempts = 10
        
        const checkAuthState = async () => {
          attempts++
          console.log(`Auth state check attempt ${attempts}/${maxAttempts}...`)
          
          // Get current session to check if verification worked
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user?.email_confirmed_at) {
            console.log('Email verification confirmed in session')
            
            // Force refresh user profile to ensure it exists
            await refreshUserProfile()
            
            setStatus('success')
            setMessage('Your email has been verified successfully!')
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              router.push('/dashboard?welcome=true')
            }, 2000)
            
            return
          }
          
          if (attempts < maxAttempts) {
            setTimeout(checkAuthState, 500)
          } else {
            console.log('Auth state check timed out')
            setStatus('error')
            setMessage('Email verification timed out. Please try signing in manually.')
          }
        }
        
        // Start checking auth state
        await checkAuthState()
        
      } catch (error) {
        console.error('Email verification error:', error)
        setStatus('error')
        setMessage('An error occurred during verification. Please try again.')
      }
    }

    // Only run verification if we have parameters
    const tokenHash = searchParams.get('token_hash')
    const accessToken = searchParams.get('access_token')
    
    if (tokenHash || accessToken) {
      handleEmailVerification()
    } else {
      // No verification parameters, check if user is already signed in
      if (!authLoading) {
        if (user?.email_confirmed_at) {
          setStatus('success')
          setMessage('Your email is already verified!')
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
        } else {
          setStatus('error')
          setMessage('No verification link found. Please check your email or request a new verification link.')
        }
      }
    }
  }, [searchParams, user, userProfile, authLoading, router, refreshUserProfile])

  const handleResendVerification = async () => {
    try {
      setMessage('Sending verification email...')
      
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email')
      }

      setMessage('Verification email sent! Please check your inbox and spam folder.')
    } catch (error) {
      console.error('Error resending verification:', error)
      setMessage('Failed to send verification email. Please try again later.')
    }
  }

  const handleGoToSignIn = () => {
    router.push('/auth/signin')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* ContractsOnly Logo */}
        <div className="mb-8">
          <img 
            src="/images/icons/android-chrome-192x192-light.png" 
            alt="ContractsOnly" 
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-blue-600">ContractsOnly</h1>
        </div>

        {status === 'loading' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="text-xl font-semibold text-gray-800">Verifying your email...</h2>
            <p className="text-gray-600">Please wait while we confirm your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Email Verified Successfully!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500">Redirecting you to your dashboard...</p>
            <Button onClick={handleGoToDashboard} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Verification Failed</h2>
            <p className="text-gray-600">{message}</p>
            <div className="space-y-2">
              <Button onClick={handleResendVerification} variant="outline" className="w-full">
                Resend Verification Email
              </Button>
              <Button onClick={handleGoToSignIn} className="w-full">
                Back to Sign In
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:info@contracts-only.com" className="text-blue-600 hover:underline">
              info@contracts-only.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}