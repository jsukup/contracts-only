'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Check if we have token_hash and type parameters from Supabase
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        if (!tokenHash || type !== 'email') {
          setStatus('error')
          setMessage('Invalid verification link. Please try signing up again.')
          return
        }

        // The Supabase client will automatically handle the token exchange
        // We just need to wait for the auth state to update
        setTimeout(() => {
          if (!authLoading) {
            if (user && user.email_confirmed_at) {
              setStatus('success')
              setMessage('Your email has been verified successfully!')
              // Redirect to dashboard after 2 seconds
              setTimeout(() => {
                router.push('/dashboard?welcome=true')
              }, 2000)
            } else {
              setStatus('error')
              setMessage('Email verification failed. Please try again.')
            }
          }
        }, 1000)
      } catch (error) {
        console.error('Email verification error:', error)
        setStatus('error')
        setMessage('An error occurred during verification. Please try again.')
      }
    }

    handleEmailVerification()
  }, [searchParams, user, authLoading, router])

  const handleResendVerification = async () => {
    // This would trigger a resend verification email
    // Implementation will be added in the next step
    setMessage('Verification email sent! Please check your inbox.')
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
            <a href="mailto:contact@contractsonly.com" className="text-blue-600 hover:underline">
              contact@contractsonly.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}